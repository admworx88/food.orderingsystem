const { app, BrowserWindow, session } = require('electron');
const path = require('path');

const APP_URL = 'https://food-orderingsystem-staging.vercel.app/orders';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: true,
    kiosk: false, // set to true for locked kiosk terminals
    autoHideMenuBar: true,
    title: 'Arena Blanca',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: !app.isPackaged,
    },
  });

  win.loadURL(APP_URL);

  // Disable right-click context menu in production
  if (app.isPackaged) {
    win.webContents.on('context-menu', (e) => e.preventDefault());
  }

  // Keep the app in the same window (no new windows on target="_blank")
  win.webContents.setWindowOpenHandler(({ url }) => {
    win.loadURL(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  // Clear cache on every launch so the app always loads fresh content
  session.defaultSession.clearCache();
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
