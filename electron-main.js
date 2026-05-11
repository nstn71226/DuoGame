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

    
    win.loadFile('index.html');
    
    
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});