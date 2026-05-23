const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createBrowserWindow() {
  const mainWindow = new BrowserWindow({
    width: 1240,
    height: 850,
    minWidth: 800,
    minHeight: 600,
    title: "Mambo Browser",
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#1e1e24',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Diperlukan agar script renderer.js bisa mendeteksi tag webview dengan bebas
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Menghilangkan menu bar bawaan windows/linux agar mirip browser asli yang clean
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadFile('index.html');
}

const extensionsDir = path.join(app.getPath('userData'), 'extensions');
if (!fs.existsSync(extensionsDir)) {
  fs.mkdirSync(extensionsDir, { recursive: true });
}

app.whenReady().then(() => {
  createBrowserWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createBrowserWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Bridge Handlers
ipcMain.handle('get-extensions-dir', () => extensionsDir);
ipcMain.handle('list-extensions', async () => {
  try { return fs.readdirSync(extensionsDir).filter(f => f.endsWith('.js') || f.endsWith('.crx')); } 
  catch { return []; }
});

ipcMain.handle('get-system-stats', async () => {
  try {
    // 1. Mengambil data Memory dari proses Electron saat ini
    const memInfo = await process.getProcessMemoryInfo();
    const memoryUsageMB = Math.round(memInfo.private / 1024); // KB ke MB

    // 2. Mengambil info Disk menggunakan fungsi bawaan fs (tanpa library tambahan)
    let diskText = "N/A";
    const stats = fs.statfsSync(process.platform === 'win32' ? 'C:' : '/');
    
    // Menghitung sisa ruang disk dalam GB
    const freeSpaceGB = Math.round((stats.bfree * stats.bsize) / (1024 * 1024 * 1024));
    diskText = `${freeSpaceGB}GB`;

    return {
      memory: `${memoryUsageMB}MB`,
      disk: diskText
    };
  } catch (e) {
    console.error("Gagal membaca statistik di main process:", e);
    return { memory: "Err", disk: "Err" };
  }
});