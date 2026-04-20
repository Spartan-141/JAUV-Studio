'use strict';
const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// ─── Intercept IPC Handlers for API Server ──────────────────────────────────
ipcMain._customHandlers = new Map();
const originalHandle = ipcMain.handle.bind(ipcMain);
ipcMain.handle = (channel: any, listener: any) => {
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

  mainWindow.webContents.setWindowOpenHandler(({ url }: any) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  await initDb();

  // DDD Architecture Setup
  const { setupDI } = require('./infrastructure/di/setup');
  setupDI();

  const { container } = require('./infrastructure/di/container');
  const configController = container.resolve('ConfigIpcController');
  configController.register();

  const categoriasController = container.resolve('CategoriasIpcController');
  categoriasController.register();

  const insumosController = container.resolve('InsumosIpcController');
  insumosController.register();

  const serviciosController = container.resolve('ServiciosIpcController');
  serviciosController.register();

  const productosController = container.resolve('ProductosIpcController');
  productosController.register();

  const ventasController = container.resolve('VentasIpcController');
  ventasController.register();

  const cuentasController = container.resolve('CuentasIpcController');
  cuentasController.register();

  const mermasController = container.resolve('MermasIpcController');
  mermasController.register();

  const reportesController = container.resolve('ReportesIpcController');
  reportesController.register();

  // Register remaining legacy IPC handlers
  // require('./database/handlers/config'); // Migrated to DDD
  // require('./database/handlers/categorias'); // Migrated to DDD
  // require('./database/handlers/productos'); // Migrated to DDD
  // require('./database/handlers/insumos'); // Migrated to DDD
  // require('./database/handlers/servicios'); // Migrated to DDD
  // require('./database/handlers/ventas'); // Migrated to DDD
  // require('./database/handlers/cuentas'); // Migrated to DDD
  // require('./database/handlers/reportes'); // Migrated to DDD
  // require('./database/handlers/mermas'); // Migrated to DDD

  // Auto-close any previous days that weren't closed before the app was shut down
  const reportesUseCases = container.resolve('ReportesUseCases');
  try { await reportesUseCases.executeAutoClosePreviousDays(); } catch (e) { console.error('[Startup] Auto-close failed:', e); }

  // Start local HTTP API for mobile clients on the same network
  try {
    const { startApiServer } = require('./api-server');
    startApiServer();
  } catch (err) {
    console.error('[Startup] Failed to start API Server:', err);
  }

  createWindow();

  // Grant camera & microphone access without a prompt (needed for html5-qrcode via DroidCam)
  session.defaultSession.setPermissionRequestHandler((_webContents: any, permission: any, callback: any) => {
    const allowed = ['media', 'mediaKeySystem', 'camera', 'microphone', 'display-capture'];
    callback(allowed.includes(permission));
  });
  session.defaultSession.setPermissionCheckHandler((_webContents: any, permission: any) => {
    const allowed = ['media', 'mediaKeySystem', 'camera', 'microphone'];
    return allowed.includes(permission);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
