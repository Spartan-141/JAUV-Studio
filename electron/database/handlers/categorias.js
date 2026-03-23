'use strict';
const { ipcMain } = require('electron');
const { getDb } = require('../db');

ipcMain.handle('categorias:list', async () => {
  // Returns all categories with their product count
  return await getDb().all(`
    SELECT c.*, COUNT(p.id) AS total_productos
    FROM categorias c
    LEFT JOIN productos p ON p.categoria_id = c.id
    GROUP BY c.id
    ORDER BY c.nombre ASC
  `);
});

ipcMain.handle('categorias:create', async (_e, { nombre }) => {
  const info = await getDb().run('INSERT INTO categorias (nombre) VALUES (?)', [nombre.trim()]);
  return { id: info.lastID, nombre };
});

ipcMain.handle('categorias:update', async (_e, { id, nombre }) => {
  await getDb().run('UPDATE categorias SET nombre = ? WHERE id = ?', [nombre.trim(), id]);
  return true;
});

ipcMain.handle('categorias:delete', async (_e, id) => {
  // Unlink products from this category first (set to null), then delete
  await getDb().run('UPDATE productos SET categoria_id = NULL WHERE categoria_id = ?', [id]);
  await getDb().run('DELETE FROM categorias WHERE id = ?', [id]);
  return true;
});

// Returns all products, with a flag indicating if they belong to a given category
ipcMain.handle('categorias:productos', async (_e, categoria_id) => {
  return await getDb().all(`
    SELECT p.id, p.nombre, p.marca, p.codigo, p.stock_actual, p.categoria_id,
           c.nombre AS categoria_nombre
    FROM productos p
    LEFT JOIN categorias c ON c.id = p.categoria_id
    ORDER BY p.nombre ASC
  `);
});

// Bulk (re)assign a list of product IDs to a category.
// producto_ids = array of ids to assign; any product NOT in the list that was in this category gets unlinked.
ipcMain.handle('categorias:bulk_assign', async (_e, { categoria_id, producto_ids }) => {
  const db = getDb();
  await db.run('BEGIN TRANSACTION');
  try {
    // Remove this category from any product not in the new selection
    if (producto_ids.length > 0) {
      const placeholders = producto_ids.map(() => '?').join(',');
      await db.run(
        `UPDATE productos SET categoria_id = NULL WHERE categoria_id = ? AND id NOT IN (${placeholders})`,
        [categoria_id, ...producto_ids]
      );
    } else {
      // Unassign all if selection is empty
      await db.run('UPDATE productos SET categoria_id = NULL WHERE categoria_id = ?', [categoria_id]);
    }
    // Assign the selected products to this category
    for (const pid of producto_ids) {
      await db.run('UPDATE productos SET categoria_id = ? WHERE id = ?', [categoria_id, pid]);
    }
    await db.run('COMMIT');
    return true;
  } catch (e) {
    await db.run('ROLLBACK');
    throw e;
  }
});
