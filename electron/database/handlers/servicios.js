'use strict';
const { ipcMain } = require('electron');
const { getDb } = require('../db');

ipcMain.handle('servicios:list', () => {
  return getDb().prepare(`
    SELECT s.*, i.nombre AS insumo_nombre FROM servicios s
    LEFT JOIN insumos i ON i.id = s.insumo_id
    ORDER BY s.nombre ASC
  `).all();
});

ipcMain.handle('servicios:create', (_e, data) => {
  const info = getDb().prepare(`
    INSERT INTO servicios (nombre, precio_usd, insumo_id)
    VALUES (@nombre, @precio_usd, @insumo_id)
  `).run({ ...data, insumo_id: data.insumo_id || null });
  return { id: info.lastInsertRowid };
});

ipcMain.handle('servicios:update', (_e, { id, ...data }) => {
  getDb().prepare(`
    UPDATE servicios SET nombre=@nombre, precio_usd=@precio_usd, insumo_id=@insumo_id, activo=@activo WHERE id=@id
  `).run({ ...data, id, insumo_id: data.insumo_id || null, activo: data.activo !== undefined ? data.activo : 1 });
  return true;
});

ipcMain.handle('servicios:delete', (_e, id) => {
  getDb().prepare('DELETE FROM servicios WHERE id = ?').run(id);
  return true;
});

ipcMain.handle('servicios:search', (_e, query) => {
  const like = `%${query}%`;
  return getDb().prepare(`
    SELECT s.*, i.nombre AS insumo_nombre FROM servicios s
    LEFT JOIN insumos i ON i.id = s.insumo_id
    WHERE s.nombre LIKE ? AND s.activo = 1
    ORDER BY s.nombre ASC LIMIT 20
  `).all(like);
});
