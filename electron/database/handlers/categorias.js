'use strict';
const { ipcMain } = require('electron');
const { getDb } = require('../db');

ipcMain.handle('categorias:list', async () => {
  return await getDb().all('SELECT * FROM categorias ORDER BY nombre ASC');
});

ipcMain.handle('categorias:create', async (_e, { nombre }) => {
  const info = await getDb().run('INSERT INTO categorias (nombre) VALUES (?)', [nombre.trim()]);
  return { id: info.lastID, nombre };
});

ipcMain.handle('categorias:delete', async (_e, id) => {
  await getDb().run('DELETE FROM categorias WHERE id = ?', [id]);
  return true;
});
