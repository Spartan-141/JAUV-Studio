'use strict';
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// ─── Intercept IPC Handlers for API Server ──────────────────────────────────
ipcMain._customHandlers = new Map();
const originalHandle = ipcMain.handle.bind(ipcMain);
ipcMain.handle = (channel, listener) => {
  ipcMain._customHandlers.set(channel, listener);
  originalHandle(channel, listener);
};

// ─── DB bootstrap ───────────────────────────────────────────────────────────
const { initDb } = require('./database/db');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0f0f1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    titleBarStyle: 'default',
    title: 'JAUV Studio POS',
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  await initDb();

  // Register all IPC handlers
  require('./database/handlers/config');
  require('./database/handlers/categorias');
  require('./database/handlers/productos');
  require('./database/handlers/insumos');
  require('./database/handlers/servicios');
  require('./database/handlers/ventas');
  require('./database/handlers/cuentas');
  const { autoClosePreviousDays } = require('./database/handlers/reportes');
  require('./database/handlers/mermas');

  // Auto-close any previous days that weren't closed before the app was shut down
  try { await autoClosePreviousDays(); } catch (e) { console.error('[Startup] Auto-close failed:', e); }

  // Start local HTTP API for mobile clients on the same network
  try {
    const { startApiServer } = require('./api-server');
    startApiServer();
  } catch (err) {
    console.error('[Startup] Failed to start API Server:', err);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
