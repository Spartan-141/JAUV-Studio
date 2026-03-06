'use strict';
const { ipcMain } = require('electron');
const { getDb } = require('../db');

// List credit sales (estado = 'credito')
ipcMain.handle('cuentas:list', () => {
  return getDb().prepare(`SELECT * FROM ventas WHERE estado = 'credito' ORDER BY fecha DESC`).all();
});

// Get full detail + abonos for a credit sale
ipcMain.handle('cuentas:get', (_e, ventaId) => {
  const db = getDb();
  const venta = db.prepare('SELECT * FROM ventas WHERE id = ?').get(ventaId);
  if (!venta) return null;
  const detalles = db.prepare('SELECT * FROM detalle_venta WHERE venta_id = ?').all(ventaId);
  const pagos = db.prepare('SELECT * FROM pagos WHERE venta_id = ?').all(ventaId);
  const abonos = db.prepare('SELECT * FROM abonos WHERE venta_id = ? ORDER BY fecha ASC').all(ventaId);
  return { ...venta, detalles, pagos, abonos };
});

// Register a partial payment (abono)
ipcMain.handle('cuentas:abonar', (_e, { venta_id, metodo, monto_usd, monto_ves, tasa }) => {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO abonos (venta_id, metodo, monto_usd, monto_ves)
      VALUES (?, ?, ?, ?)
    `).run(venta_id, metodo, monto_usd, monto_ves || (monto_usd * (tasa || 1)));

    // Recalculate pending balance
    const venta = db.prepare('SELECT saldo_pendiente_usd, total_usd FROM ventas WHERE id = ?').get(venta_id);
    const nuevoSaldo = Math.max(0, parseFloat((venta.saldo_pendiente_usd - monto_usd).toFixed(8)));

    let nuevoEstado = nuevoSaldo <= 0.001 ? 'pagada' : 'credito';
    db.prepare('UPDATE ventas SET saldo_pendiente_usd = ?, estado = ? WHERE id = ?')
      .run(nuevoSaldo, nuevoEstado, venta_id);

    return { saldo_pendiente_usd: nuevoSaldo, estado: nuevoEstado };
  });
  return tx();
});
