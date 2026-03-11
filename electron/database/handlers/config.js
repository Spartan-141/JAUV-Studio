'use strict';
const { ipcMain } = require('electron');
const { getDb } = require('../db');

ipcMain.handle('config:get', async (_e, clave) => {
  const row = await getDb().get('SELECT valor FROM configuracion WHERE clave = ?', clave);
  return row ? row.valor : null;
});

ipcMain.handle('config:getAll', async () => {
  const rows = await getDb().all('SELECT clave, valor FROM configuracion');
  return Object.fromEntries(rows.map(r => [r.clave, r.valor]));
});

ipcMain.handle('config:set', async (_e, clave, valor) => {
  await getDb().run('INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)', [clave, String(valor)]);
  return true;
});
