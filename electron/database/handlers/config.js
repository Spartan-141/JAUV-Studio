'use strict';
const { ipcMain } = require('electron');
const { getDb } = require('../db');

ipcMain.handle('config:get', (_e, clave) => {
  const row = getDb().prepare('SELECT valor FROM configuracion WHERE clave = ?').get(clave);
  return row ? row.valor : null;
});

ipcMain.handle('config:getAll', () => {
  const rows = getDb().prepare('SELECT clave, valor FROM configuracion').all();
  return Object.fromEntries(rows.map(r => [r.clave, r.valor]));
});

ipcMain.handle('config:set', (_e, clave, valor) => {
  getDb().prepare('INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)').run(clave, String(valor));
  return true;
});
