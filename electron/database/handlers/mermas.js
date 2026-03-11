'use strict';
const { ipcMain } = require('electron');
const { getDb } = require('../db');

ipcMain.handle('mermas:list', async () => {
  return await getDb().all(`
    SELECT m.*, p.nombre AS producto_nombre, i.nombre AS insumo_nombre
    FROM mermas m
    LEFT JOIN productos p ON p.id = m.producto_id
    LEFT JOIN insumos i ON i.id = m.insumo_id
    ORDER BY m.fecha DESC LIMIT 200
  `);
});

ipcMain.handle('mermas:create', async (_e, data) => {
  const db = getDb();
  try {
    await db.run('BEGIN TRANSACTION');

    const info = await db.run(`
      INSERT INTO mermas (producto_id, insumo_id, cantidad, motivo, notas)
      VALUES (?, ?, ?, ?, ?)
    `, [
      data.producto_id || null,
      data.insumo_id || null,
      data.cantidad,
      data.motivo,
      data.notas || '',
    ]);

    if (data.producto_id) {
      await db.run('UPDATE productos SET stock_actual = MAX(0, stock_actual - ?) WHERE id = ?', [data.cantidad, data.producto_id]);
    }
    if (data.insumo_id) {
      await db.run('UPDATE insumos SET stock_hojas = MAX(0, stock_hojas - ?) WHERE id = ?', [data.cantidad, data.insumo_id]);
    }

    await db.run('COMMIT');
    return { id: info.lastID };
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  }
});
