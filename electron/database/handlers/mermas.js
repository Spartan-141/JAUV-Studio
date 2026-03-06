'use strict';
const { ipcMain } = require('electron');
const { getDb } = require('../db');

ipcMain.handle('mermas:list', () => {
  return getDb().prepare(`
    SELECT m.*, p.nombre AS producto_nombre, i.nombre AS insumo_nombre
    FROM mermas m
    LEFT JOIN productos p ON p.id = m.producto_id
    LEFT JOIN insumos i ON i.id = m.insumo_id
    ORDER BY m.fecha DESC LIMIT 200
  `).all();
});

ipcMain.handle('mermas:create', (_e, data) => {
  const db = getDb();
  const tx = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO mermas (producto_id, insumo_id, cantidad, motivo, notas)
      VALUES (@producto_id, @insumo_id, @cantidad, @motivo, @notas)
    `).run({
      producto_id: data.producto_id || null,
      insumo_id: data.insumo_id || null,
      cantidad: data.cantidad,
      motivo: data.motivo,
      notas: data.notas || '',
    });

    if (data.producto_id) {
      db.prepare('UPDATE productos SET stock_actual = MAX(0, stock_actual - ?) WHERE id = ?')
        .run(data.cantidad, data.producto_id);
    }
    if (data.insumo_id) {
      db.prepare('UPDATE insumos SET stock_hojas = MAX(0, stock_hojas - ?) WHERE id = ?')
        .run(data.cantidad, data.insumo_id);
    }
    return { id: info.lastInsertRowid };
  });
  return tx();
});
