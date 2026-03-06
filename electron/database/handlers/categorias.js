'use strict';
const { ipcMain } = require('electron');
const { getDb } = require('../db');

ipcMain.handle('categorias:list', () => {
  return getDb().prepare('SELECT * FROM categorias ORDER BY nombre ASC').all();
});

ipcMain.handle('categorias:create', (_e, { nombre }) => {
  const info = getDb().prepare('INSERT INTO categorias (nombre) VALUES (?)').run(nombre.trim());
  return { id: info.lastInsertRowid, nombre };
});

ipcMain.handle('categorias:delete', (_e, id) => {
  getDb().prepare('DELETE FROM categorias WHERE id = ?').run(id);
  return true;
});
