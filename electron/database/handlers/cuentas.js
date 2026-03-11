'use strict';
const { ipcMain } = require('electron');
const { getDb } = require('../db');

// List credit sales (estado = 'credito')
ipcMain.handle('cuentas:list', async () => {
  return await getDb().all(`SELECT * FROM ventas WHERE estado = 'credito' ORDER BY fecha DESC`);
});

// Get full detail + abonos for a credit sale
ipcMain.handle('cuentas:get', async (_e, ventaId) => {
  const db = getDb();
  const venta = await db.get('SELECT * FROM ventas WHERE id = ?', [ventaId]);
  if (!venta) return null;
  const detalles = await db.all('SELECT * FROM detalle_venta WHERE venta_id = ?', [ventaId]);
  const pagos = await db.all('SELECT * FROM pagos WHERE venta_id = ?', [ventaId]);
  const abonos = await db.all('SELECT * FROM abonos WHERE venta_id = ? ORDER BY fecha ASC', [ventaId]);
  return { ...venta, detalles, pagos, abonos };
});

// Register a partial payment (abono)
ipcMain.handle('cuentas:abonar', async (_e, { venta_id, metodo, monto_usd, monto_ves, tasa }) => {
  const db = getDb();
  try {
    await db.run('BEGIN TRANSACTION');
    await db.run(`
      INSERT INTO abonos (venta_id, metodo, monto_usd, monto_ves)
      VALUES (?, ?, ?, ?)
    `, [venta_id, metodo, monto_usd, monto_ves || (monto_usd * (tasa || 1))]);

    // Recalculate pending balance
    const venta = await db.get('SELECT saldo_pendiente_usd, total_usd FROM ventas WHERE id = ?', [venta_id]);
    const nuevoSaldo = Math.max(0, parseFloat((venta.saldo_pendiente_usd - monto_usd).toFixed(8)));

    let nuevoEstado = nuevoSaldo <= 0.001 ? 'pagada' : 'credito';
    await db.run('UPDATE ventas SET saldo_pendiente_usd = ?, estado = ? WHERE id = ?', [nuevoSaldo, nuevoEstado, venta_id]);

    await db.run('COMMIT');
    return { saldo_pendiente_usd: nuevoSaldo, estado: nuevoEstado };
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  }
});
