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

  const cleanCol = (c) => `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(${c}), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'Á', 'a'), 'É', 'e'), 'Í', 'i'), 'Ó', 'o'), 'Ú', 'u')`;

  if (filters.search) {
    const term = filters.search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    where.push(`(${cleanCol('p.nombre')} LIKE ? OR ${cleanCol('p.codigo')} LIKE ? OR ${cleanCol('p.marca')} LIKE ?)`);
    const like = `%${term}%`;
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
    INSERT INTO productos (
      codigo, nombre, marca,
      precio_compra_usd, precio_venta_usd,
      precio_compra_ves, precio_venta_ves,
      moneda_precio,
      stock_actual, stock_minimo, categoria_id, descripcion
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    codigo,
    data.nombre,
    data.marca || '',
    data.precio_compra_usd || 0,
    data.precio_venta_usd || 0,
    data.precio_compra_ves || 0,
    data.precio_venta_ves || 0,
    data.moneda_precio || 'usd',
    data.stock_actual || 0,
    data.stock_minimo || 0,
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
      precio_compra_ves = ?, precio_venta_ves = ?,
      moneda_precio = ?,
      stock_actual = ?, stock_minimo = ?,
      categoria_id = ?, descripcion = ?
    WHERE id = ?
  `, [
    data.codigo,
    data.nombre,
    data.marca,
    data.precio_compra_usd || 0,
    data.precio_venta_usd || 0,
    data.precio_compra_ves || 0,
    data.precio_venta_ves || 0,
    data.moneda_precio || 'usd',
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
  const term = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const like = `%${term}%`;
  const cleanCol = (c) => `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(${c}), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'Á', 'a'), 'É', 'e'), 'Í', 'i'), 'Ó', 'o'), 'Ú', 'u')`;

  return await getDb().all(`
    SELECT p.*, c.nombre AS categoria_nombre FROM productos p
    LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE ${cleanCol('p.nombre')} LIKE ? OR ${cleanCol('p.codigo')} LIKE ? OR ${cleanCol('p.marca')} LIKE ?
    ORDER BY p.nombre ASC LIMIT 20
  `, [like, like, like]);
});
