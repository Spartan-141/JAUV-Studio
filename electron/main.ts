'use strict';
const { app, BrowserWindow, ipcMain, shell, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

// ─── Logging ────────────────────────────────────────────────────────────────
const logFile = path.join(app.getPath('userData'), 'startup.log');
function log(msg: any) {
  const time = new Date().toISOString();
  const line = `[${time}] ${msg}\n`;
  try {
    fs.appendFileSync(logFile, line);
  } catch (e) {
    console.error('Failed to write to log file:', e);
  }
  console.log(msg);
}

log('--- PROCESO DE INICIO ---');
log(`Versión: ${app.getVersion()}`);
log(`Plataforma: ${process.platform}`);
log(`Arquitectura: ${process.arch}`);

// ─── Intercept IPC Handlers for API Server ──────────────────────────────────
(ipcMain as any)._customHandlers = new Map();
const originalHandle = ipcMain.handle.bind(ipcMain);
ipcMain.handle = (channel: string, listener: any) => {
  (ipcMain as any)._customHandlers.set(channel, listener);
  originalHandle(channel, listener);
};

// ─── DB bootstrap ───────────────────────────────────────────────────────────
const { initDb } = require('./database/db');

let mainWindow: any;

function createWindow() {
  log('Creando ventana principal...');
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
    log('Cargando URL de desarrollo: http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    log(`Cargando archivo de producción: ${indexPath}`);
    if (!fs.existsSync(indexPath)) {
      log('¡ERROR! El archivo index.html no existe en la ruta especificada.');
    }
    mainWindow.loadFile(indexPath);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('ready-to-show', () => {
    log('Ventana lista para mostrar.');
    mainWindow.show();
  });
}

// ─── Single Instance Lock ───────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  log('Ya hay una instancia ejecutándose. Cerrando esta instancia.');
  app.quit();
} else {
  app.on('second-instance', () => {
    log('Se intentó abrir una segunda instancia. Enfocando ventana principal.');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      log('Iniciando base de datos...');
      await initDb();
      log('Base de datos inicializada correctamente.');

      log('Configurando Inyección de Dependencias (DI)...');
      const { setupDI } = require('./infrastructure/di/setup');
      setupDI();
      log('DI configurado.');

      const { container } = require('./infrastructure/di/container');
      
      log('Registrando controladores IPC...');
      const controllers = [
        'ConfigIpcController', 'CategoriasIpcController', 'InsumosIpcController',
        'ServiciosIpcController', 'ProductosIpcController', 'VentasIpcController',
        'CuentasIpcController', 'MermasIpcController', 'ReportesIpcController'
      ];

      for (const ctrlName of controllers) {
        log(`Registrando ${ctrlName}...`);
        const ctrl = container.resolve(ctrlName);
        ctrl.register();
      }

      log('Iniciando servidor API local...');
      try {
        const { startApiServer } = require('./api-server');
        startApiServer();
        log('Servidor API iniciado.');
      } catch (err: any) {
        log(`[Error] Falló el inicio del API Server: ${err.message}`);
      }

      createWindow();

      session.defaultSession.setPermissionRequestHandler((_webContents: any, permission: string, callback: (allowed: boolean) => void) => {
        const allowed = ['media', 'mediaKeySystem', 'camera', 'microphone', 'display-capture'];
        callback(allowed.includes(permission));
      });
      session.defaultSession.setPermissionCheckHandler((_webContents: any, permission: string) => {
        const allowed = ['media', 'mediaKeySystem', 'camera', 'microphone'];
        return allowed.includes(permission);
      });

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
      });

    } catch (error: any) {
      log(`¡ERROR CRÍTICO DURANTE EL INICIO!: ${error.stack}`);
      dialog.showErrorBox(
        'Error de Inicio - JAUV Studio POS',
        `No se pudo iniciar la aplicación.\n\nDetalles:\n${error.message}\n\nRevisa el archivo de log en: ${logFile}`
      );
      app.quit();
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

