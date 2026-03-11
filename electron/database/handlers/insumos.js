'use strict';
const { ipcMain } = require('electron');
const { getDb } = require('../db');

ipcMain.handle('insumos:list', async () => {
  return await getDb().all('SELECT * FROM insumos ORDER BY nombre ASC');
});

ipcMain.handle('insumos:create', async (_e, data) => {
  const info = await getDb().run(`
    INSERT INTO insumos (nombre, tipo, stock_hojas, stock_minimo, costo_por_hoja_usd)
    VALUES (?, ?, ?, ?, ?)
  `, [data.nombre, data.tipo, data.stock_hojas, data.stock_minimo, data.costo_por_hoja_usd]);
  return { id: info.lastID };
});

ipcMain.handle('insumos:update', async (_e, { id, ...data }) => {
  await getDb().run(`
    UPDATE insumos SET nombre=?, tipo=?, stock_hojas=?,
    stock_minimo=?, costo_por_hoja_usd=? WHERE id=?
  `, [data.nombre, data.tipo, data.stock_hojas, data.stock_minimo, data.costo_por_hoja_usd, id]);
  return true;
});

ipcMain.handle('insumos:delete', async (_e, id) => {
  await getDb().run('DELETE FROM insumos WHERE id = ?', [id]);
  return true;
});

ipcMain.handle('insumos:ajustar', async (_e, { id, cantidad, operacion }) => {
  const db = getDb();
  const insumo = await db.get('SELECT stock_hojas FROM insumos WHERE id=?', [id]);
  if (!insumo) throw new Error('Insumo no encontrado');
  const nuevo = operacion === 'sumar'
    ? insumo.stock_hojas + cantidad
    : Math.max(0, insumo.stock_hojas - cantidad);
  await db.run('UPDATE insumos SET stock_hojas=? WHERE id=?', [nuevo, id]);
  return { stock_hojas: nuevo };
});
