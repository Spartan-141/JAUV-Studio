'use strict';
const { ipcMain } = require('electron');
const { getDb } = require('../db');
const crypto = require('crypto');

function generateCode() {
  return 'PAP-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

function ensureUniqueCode(db) {
  let code;
  do {
    code = generateCode();
  } while (db.prepare('SELECT id FROM productos WHERE codigo = ?').get(code));
  return code;
}

ipcMain.handle('productos:list', (_e, filters = {}) => {
  const db = getDb();
  let sql = `SELECT p.*, c.nombre AS categoria_nombre
             FROM productos p
             LEFT JOIN categorias c ON c.id = p.categoria_id`;
  const params = [];
  const where = [];

  if (filters.search) {
    where.push("(p.nombre LIKE ? OR p.codigo LIKE ? OR p.marca LIKE ?)");
    const like = `%${filters.search}%`;
    params.push(like, like, like);
  }
  if (filters.categoria_id) {
    where.push('p.categoria_id = ?');
    params.push(filters.categoria_id);
  }
  if (filters.bajo_stock) {
    where.push('p.stock_actual <= p.stock_minimo');
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY p.nombre ASC';

  return db.prepare(sql).all(...params);
});

ipcMain.handle('productos:get', (_e, id) => {
  return getDb().prepare('SELECT * FROM productos WHERE id = ?').get(id);
});

ipcMain.handle('productos:create', (_e, data) => {
  const db = getDb();
  const codigo = (data.codigo && data.codigo.trim()) ? data.codigo.trim() : ensureUniqueCode(db);
  const info = db.prepare(`
    INSERT INTO productos (codigo, nombre, marca, precio_compra_usd, precio_venta_usd, stock_actual, stock_minimo, categoria_id, descripcion)
    VALUES (@codigo, @nombre, @marca, @precio_compra_usd, @precio_venta_usd, @stock_actual, @stock_minimo, @categoria_id, @descripcion)
  `).run({ ...data, codigo, marca: data.marca || '', descripcion: data.descripcion || '', categoria_id: data.categoria_id || null });
  return { id: info.lastInsertRowid, codigo };
});

ipcMain.handle('productos:update', (_e, { id, ...data }) => {
  const db = getDb();
  db.prepare(`
    UPDATE productos SET
      codigo = @codigo, nombre = @nombre, marca = @marca,
      precio_compra_usd = @precio_compra_usd, precio_venta_usd = @precio_venta_usd,
      stock_actual = @stock_actual, stock_minimo = @stock_minimo,
      categoria_id = @categoria_id, descripcion = @descripcion
    WHERE id = @id
  `).run({ ...data, id });
  return true;
});

ipcMain.handle('productos:delete', (_e, id) => {
  getDb().prepare('DELETE FROM productos WHERE id = ?').run(id);
  return true;
});

ipcMain.handle('productos:search', (_e, query) => {
  const like = `%${query}%`;
  return getDb().prepare(`
    SELECT p.*, c.nombre AS categoria_nombre FROM productos p
    LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE p.nombre LIKE ? OR p.codigo LIKE ? OR p.marca LIKE ?
    ORDER BY p.nombre ASC LIMIT 20
  `).all(like, like, like);
});
