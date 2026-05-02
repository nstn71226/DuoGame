import { app, BrowserWindow } from 'electron';
import path from 'path';

function createWindow () {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        title: "DUO GAME",
        autoHideMenuBar: true, // Ẩn thanh menu lề trên cùng cho giống game thật
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // Mở file index.html của game
    win.loadFile('index.html');
    
    // Nếu bạn muốn game tự động Full Màn Hình khi mở lên thì bỏ dấu // ở dòng dưới:
    // win.setFullScreen(true); 
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});