'use strict';
const { ipcMain } = require('electron');
const { getDb } = require('../db');

// Create a complete sale (transactional: venta + detalle + pagos + stock deduction)
ipcMain.handle('ventas:create', (_e, payload) => {
  const db = getDb();
  const { cabecera, detalles, pagos } = payload;

  const tx = db.transaction(() => {
    // 1. Insert sale header
    const ventaInfo = db.prepare(`
      INSERT INTO ventas (subtotal_usd, descuento_otorgado_usd, total_usd, tasa_cambio, estado, cliente_nombre, saldo_pendiente_usd, notas)
      VALUES (@subtotal_usd, @descuento_otorgado_usd, @total_usd, @tasa_cambio, @estado, @cliente_nombre, @saldo_pendiente_usd, @notas)
    `).run(cabecera);
    const ventaId = ventaInfo.lastInsertRowid;

    // 2. Insert line items + deduct stock
    for (const item of detalles) {
      db.prepare(`
        INSERT INTO detalle_venta (venta_id, tipo, ref_id, nombre, cantidad, cantidad_hojas_gastadas, precio_unitario_usd, subtotal_usd)
        VALUES (@venta_id, @tipo, @ref_id, @nombre, @cantidad, @cantidad_hojas_gastadas, @precio_unitario_usd, @subtotal_usd)
      `).run({ ...item, venta_id: ventaId, cantidad_hojas_gastadas: item.cantidad_hojas_gastadas || 0 });

      if (item.tipo === 'producto') {
        db.prepare('UPDATE productos SET stock_actual = MAX(0, stock_actual - ?) WHERE id = ?')
          .run(item.cantidad, item.ref_id);
      } else if (item.tipo === 'servicio' && item.insumo_id) {
        const hojas = item.cantidad_hojas_gastadas || item.cantidad;
        db.prepare('UPDATE insumos SET stock_hojas = MAX(0, stock_hojas - ?) WHERE id = ?')
          .run(hojas, item.insumo_id);
      }
    }

    // 3. Insert payment records
    for (const pago of pagos) {
      db.prepare(`
        INSERT INTO pagos (venta_id, metodo, monto_usd, monto_ves)
        VALUES (@venta_id, @metodo, @monto_usd, @monto_ves)
      `).run({ ...pago, venta_id: ventaId, monto_ves: pago.monto_ves || 0 });
    }

    return { id: ventaId };
  });

  return tx();
});

ipcMain.handle('ventas:list', (_e, filters = {}) => {
  const db = getDb();
  let sql = `SELECT * FROM ventas`;
  const where = [];
  const params = [];

  if (filters.estado) { where.push('estado = ?'); params.push(filters.estado); }
  if (filters.fecha_desde) { where.push('fecha >= ?'); params.push(filters.fecha_desde); }
  if (filters.fecha_hasta) { where.push('fecha <= ?'); params.push(filters.fecha_hasta + ' 23:59:59'); }

  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY fecha DESC';
  if (filters.limit) { sql += ' LIMIT ?'; params.push(filters.limit); }

  return db.prepare(sql).all(...params);
});

ipcMain.handle('ventas:get', (_e, id) => {
  const db = getDb();
  const venta = db.prepare('SELECT * FROM ventas WHERE id = ?').get(id);
  if (!venta) return null;
  const detalles = db.prepare('SELECT * FROM detalle_venta WHERE venta_id = ? ORDER BY id ASC').all(id);
  const pagos = db.prepare('SELECT * FROM pagos WHERE venta_id = ? ORDER BY id ASC').all(id);
  const abonos = db.prepare('SELECT * FROM abonos WHERE venta_id = ? ORDER BY fecha ASC').all(id);
  return { ...venta, detalles, pagos, abonos };
});

ipcMain.handle('ventas:ultimas', (_e, limit = 20) => {
  return getDb().prepare('SELECT * FROM ventas ORDER BY fecha DESC LIMIT ?').all(limit);
});
