'use strict';
const { ipcMain } = require('electron');
const { getDb } = require('../db');
const crypto = require('crypto');

function generateCode() {
  return 'PAP-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

async function ensureUniqueCode(db) {
  let code;
  let exists = true;
  do {
    code = generateCode();
    const row = await db.get('SELECT id FROM productos WHERE codigo = ?', [code]);
    exists = !!row;
  } while (exists);
  return code;
}

ipcMain.handle('productos:list', async (_e, filters = {}) => {
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

  return await db.all(sql, params);
});

ipcMain.handle('productos:get', async (_e, id) => {
  return await getDb().get('SELECT * FROM productos WHERE id = ?', [id]);
});

ipcMain.handle('productos:create', async (_e, data) => {
  const db = getDb();
  const codigo = (data.codigo && data.codigo.trim()) ? data.codigo.trim() : await ensureUniqueCode(db);
  const info = await db.run(`
    INSERT INTO productos (codigo, nombre, marca, precio_compra_usd, precio_venta_usd, stock_actual, stock_minimo, categoria_id, descripcion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    codigo,
    data.nombre,
    data.marca || '',
    data.precio_compra_usd,
    data.precio_venta_usd,
    data.stock_actual,
    data.stock_minimo,
    data.categoria_id || null,
    data.descripcion || ''
  ]);
  return { id: info.lastID, codigo };
});

ipcMain.handle('productos:update', async (_e, { id, ...data }) => {
  const db = getDb();
  await db.run(`
    UPDATE productos SET
      codigo = ?, nombre = ?, marca = ?,
      precio_compra_usd = ?, precio_venta_usd = ?,
      stock_actual = ?, stock_minimo = ?,
      categoria_id = ?, descripcion = ?
    WHERE id = ?
  `, [
    data.codigo,
    data.nombre,
    data.marca,
    data.precio_compra_usd,
    data.precio_venta_usd,
    data.stock_actual,
    data.stock_minimo,
    data.categoria_id,
    data.descripcion,
    id
  ]);
  return true;
});

ipcMain.handle('productos:delete', async (_e, id) => {
  await getDb().run('DELETE FROM productos WHERE id = ?', [id]);
  return true;
});

ipcMain.handle('productos:search', async (_e, query) => {
  const like = `%${query}%`;
  return await getDb().all(`
    SELECT p.*, c.nombre AS categoria_nombre FROM productos p
    LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE p.nombre LIKE ? OR p.codigo LIKE ? OR p.marca LIKE ?
    ORDER BY p.nombre ASC LIMIT 20
  `, [like, like, like]);
});
