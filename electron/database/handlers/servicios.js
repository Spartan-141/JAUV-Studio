'use strict';
const { ipcMain } = require('electron');
const { getDb } = require('../db');

ipcMain.handle('servicios:list', async () => {
  return await getDb().all(`
    SELECT s.*, i.nombre AS insumo_nombre FROM servicios s
    LEFT JOIN insumos i ON i.id = s.insumo_id
    ORDER BY s.nombre ASC
  `);
});

ipcMain.handle('servicios:create', async (_e, data) => {
  const info = await getDb().run(`
    INSERT INTO servicios (nombre, precio_usd, precio_ves, moneda_precio, insumo_id)
    VALUES (?, ?, ?, ?, ?)
  `, [data.nombre, data.precio_usd || 0, data.precio_ves || 0, data.moneda_precio || 'usd', data.insumo_id || null]);
  return { id: info.lastID };
});

ipcMain.handle('servicios:update', async (_e, { id, ...data }) => {
  await getDb().run(`
    UPDATE servicios SET nombre=?, precio_usd=?, precio_ves=?, moneda_precio=?, insumo_id=?, activo=? WHERE id=?
  `, [data.nombre, data.precio_usd || 0, data.precio_ves || 0, data.moneda_precio || 'usd', data.insumo_id || null, data.activo !== undefined ? data.activo : 1, id]);
  return true;
});

ipcMain.handle('servicios:delete', async (_e, id) => {
  await getDb().run('DELETE FROM servicios WHERE id = ?', [id]);
  return true;
});

ipcMain.handle('servicios:search', async (_e, query) => {
  const like = `%${query}%`;
  return await getDb().all(`
    SELECT s.*, i.nombre AS insumo_nombre FROM servicios s
    LEFT JOIN insumos i ON i.id = s.insumo_id
    WHERE s.nombre LIKE ? AND s.activo = 1
    ORDER BY s.nombre ASC LIMIT 20
  `, [like]);
});
