'use strict';
const { ipcMain } = require('electron');
const { getDb } = require('../db');

ipcMain.handle('insumos:list', () => {
  return getDb().prepare('SELECT * FROM insumos ORDER BY nombre ASC').all();
});

ipcMain.handle('insumos:create', (_e, data) => {
  const info = getDb().prepare(`
    INSERT INTO insumos (nombre, tipo, stock_hojas, stock_minimo, costo_por_hoja_usd)
    VALUES (@nombre, @tipo, @stock_hojas, @stock_minimo, @costo_por_hoja_usd)
  `).run(data);
  return { id: info.lastInsertRowid };
});

ipcMain.handle('insumos:update', (_e, { id, ...data }) => {
  getDb().prepare(`
    UPDATE insumos SET nombre=@nombre, tipo=@tipo, stock_hojas=@stock_hojas,
    stock_minimo=@stock_minimo, costo_por_hoja_usd=@costo_por_hoja_usd WHERE id=@id
  `).run({ ...data, id });
  return true;
});

ipcMain.handle('insumos:delete', (_e, id) => {
  getDb().prepare('DELETE FROM insumos WHERE id = ?').run(id);
  return true;
});

ipcMain.handle('insumos:ajustar', (_e, { id, cantidad, operacion }) => {
  const db = getDb();
  const insumo = db.prepare('SELECT stock_hojas FROM insumos WHERE id=?').get(id);
  if (!insumo) throw new Error('Insumo no encontrado');
  const nuevo = operacion === 'sumar'
    ? insumo.stock_hojas + cantidad
    : Math.max(0, insumo.stock_hojas - cantidad);
  db.prepare('UPDATE insumos SET stock_hojas=? WHERE id=?').run(nuevo, id);
  return { stock_hojas: nuevo };
});
