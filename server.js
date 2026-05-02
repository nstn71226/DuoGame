import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const http = createServer(app);
const io = new Server(http, {
    cors: { origin: "*" } // Cho phép kết nối từ trình duyệt
});

io.on('connection', (socket) => {
    console.log('⚡ Một người kết nối tới Server tổng: ' + socket.id);

    // ---------------------------------------------------------
    // 1. NGƯỜI CHƠI BẤM "HOST GAME" (TẠO PHÒNG MỚI)
    // ---------------------------------------------------------
    socket.on('createRoom', (roomId) => {
        // Kiểm tra xem phòng này đã có ai tạo chưa
        const room = io.sockets.adapter.rooms.get(roomId);
        if (room && room.size > 0) {
            socket.emit('serverMessage', 'Mã phòng này đã tồn tại! Vui lòng chọn mã khác hoặc bấm Join.');
            return;
        }

        // Cho người chơi vào phòng ảo
        socket.join(roomId);
        
        // Lưu thông tin trực tiếp vào object socket của người này
        socket.roomId = roomId;
        socket.role = 'player1'; // Người tạo luôn là Player 1

        console.log(`🎮 [Phòng ${roomId}] ${socket.id} đã tạo phòng và làm PLAYER 1`);
        
        // Gửi xác nhận về cho Frontend
        socket.emit('initPlayer', { role: 'player1' });
    });

    // ---------------------------------------------------------
    // 2. NGƯỜI CHƠI BẤM "JOIN GAME" (VÀO PHÒNG CÓ SẴN)
    // ---------------------------------------------------------
    socket.on('joinRoom', (roomId) => {
        const room = io.sockets.adapter.rooms.get(roomId);
        
        // Kiểm tra phòng có tồn tại không
        if (!room) {
            socket.emit('serverMessage', 'Phòng không tồn tại. Vui lòng kiểm tra lại mã phòng!');
            return;
        }
        
        // Kiểm tra phòng đã đủ 2 người chưa
        if (room.size >= 2) {
            socket.emit('serverMessage', 'Phòng này đã đủ 2 người chơi!');
            return;
        }

        // Cho người chơi thứ 2 vào phòng
        socket.join(roomId);
        socket.roomId = roomId;
        socket.role = 'player2'; // Người vào sau là Player 2

        console.log(`🎮 [Phòng ${roomId}] ${socket.id} đã tham gia và làm PLAYER 2`);
        
        // Báo cho người Join biết họ là Player 2
        socket.emit('initPlayer', { role: 'player2' });

        // (Tùy chọn) Báo cho Player 1 biết Player 2 đã vào phòng
        socket.to(roomId).emit('serverMessage', 'Đồng đội đã kết nối thành công!');
    });

    // ---------------------------------------------------------
    // 3. LẮNG NGHE & ĐỒNG BỘ DI CHUYỂN (CHỈ TRONG PHÒNG)
    // ---------------------------------------------------------
    socket.on('playerMovement', (movementData) => {
        // Chỉ xử lý nếu người chơi đang ở trong 1 phòng
        if (socket.roomId) {
            // Gắn thêm role để máy bên kia biết ai đang gửi tọa độ
            movementData.role = socket.role;
            
            // Dùng socket.to(roomId) để chỉ gửi cho người trong CÙNG PHÒNG, không gửi cho cả Server
            socket.to(socket.roomId).emit('playerMoved', movementData);
        }
    });

    // ---------------------------------------------------------
    // 4. KÊNH ĐỒNG BỘ CÁC SỰ KIỆN GAME (Ví dụ: Đạp nút, mở cửa, bắn súng)
    // ---------------------------------------------------------
    socket.on('gameAction', (actionData) => {
        if (socket.roomId) {
            console.log(`🔔 [Phòng ${socket.roomId}] Sự kiện game từ ${socket.role}:`, actionData);
            socket.to(socket.roomId).emit('gameAction', actionData);
        }
    });

    // ---------------------------------------------------------
    // 5. XỬ LÝ KHI MẤT KẾT NỐI
    // ---------------------------------------------------------
    socket.on('disconnect', () => {
        console.log('❌ Người chơi ngắt kết nối: ' + socket.id);
        
        // Nếu người này đang ở trong phòng, báo cho đồng đội của họ biết
        if (socket.roomId) {
            socket.to(socket.roomId).emit('serverMessage', 'Đồng đội đã mất kết nối hoặc thoát game!');
            socket.to(socket.roomId).emit('playerDisconnected', socket.id);
        }
    });
});

// --- SỬA LẠI ĐOẠN NÀY ---
const PORT = process.env.PORT || 3000; // Ưu tiên dùng Port của Render, nếu không có thì dùng 3000

http.listen(PORT, () => {
    console.log('====================================');
    console.log(`🚀 Server DUO GAME đang chạy tại port ${PORT}`);
    console.log(`Đang chờ người chơi kết nối...`);
    console.log('====================================');
});