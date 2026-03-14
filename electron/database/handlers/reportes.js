'use strict';
const { ipcMain } = require('electron');
const { getDb } = require('../db');

// ── Helpers ────────────────────────────────────────────────────────────────────
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

async function buildDayData(db, fecha) {
  const desde = fecha + ' 00:00:00';
  const hasta  = fecha + ' 23:59:59';

  const ventas = await db.get(`
    SELECT
      COUNT(*) AS total_ventas,
      SUM(total_usd) AS ingresos_usd,
      SUM(descuento_otorgado_usd) AS descuentos_usd,
      SUM(CASE WHEN estado='credito' THEN saldo_pendiente_usd ELSE 0 END) AS pendiente_cobrar_usd
    FROM ventas WHERE fecha BETWEEN ? AND ?
  `, [desde, hasta]);

  const pagos = await db.all(`
    SELECT p.metodo, SUM(p.monto_usd) AS total_usd, SUM(p.monto_ves) AS total_ves
    FROM pagos p JOIN ventas v ON v.id = p.venta_id
    WHERE v.fecha BETWEEN ? AND ? GROUP BY p.metodo
  `, [desde, hasta]);

  const abonos = await db.all(`
    SELECT a.metodo, SUM(a.monto_usd) AS total_usd, SUM(a.monto_ves) AS total_ves
    FROM abonos a WHERE a.fecha BETWEEN ? AND ? GROUP BY a.metodo
  `, [desde, hasta]);

  // Full sale list with items
  const listaVentas = await db.all(`SELECT * FROM ventas WHERE fecha BETWEEN ? AND ? ORDER BY fecha DESC`, [desde, hasta]);
  for (const v of listaVentas) {
    v.detalles = await db.all(`SELECT * FROM detalle_venta WHERE venta_id = ? ORDER BY id ASC`, [v.id]);
    v.pagos = await db.all(`SELECT * FROM pagos WHERE venta_id = ? ORDER BY id ASC`, [v.id]);
    v.abonos = await db.all(`SELECT * FROM abonos WHERE venta_id = ? ORDER BY fecha ASC`, [v.id]);
  }

  const ingresos_ves = [...pagos, ...abonos].reduce((s, x) => s + (x.total_ves || 0), 0);

  // Net profit = (sale price - purchase price) * quantity for products sold
  const gananciaRow = await db.get(`
    SELECT SUM((dv.precio_unitario_usd - COALESCE(p.precio_compra_usd, 0)) * dv.cantidad) AS ganancia_bruta_usd
    FROM detalle_venta dv
    JOIN ventas v ON v.id = dv.venta_id
    LEFT JOIN productos p ON p.id = dv.ref_id AND dv.tipo = 'producto'
    WHERE v.fecha BETWEEN ? AND ?
  `, [desde, hasta]);
  const ganancia_neta_usd = Math.max(0, (gananciaRow.ganancia_bruta_usd || 0) - (ventas.descuentos_usd || 0));

  return {
    total_ventas: ventas.total_ventas || 0,
    ingresos_usd: ventas.ingresos_usd || 0,
    ingresos_ves,
    descuentos_usd: ventas.descuentos_usd || 0,
    pendiente_cobrar_usd: ventas.pendiente_cobrar_usd || 0,
    ganancia_neta_usd: parseFloat(ganancia_neta_usd.toFixed(2)),
    pagos,
    abonos,
    ventas: listaVentas,
  };
}

// ── Internal helper: upsert a day snapshot (used by manual close + auto-close) ─
async function upsertCierre(db, fecha, tasa) {
  const data = await buildDayData(db, fecha);
  const now = new Date().toLocaleString('sv-SE').replace('T', ' ').slice(0, 19);
  const params = [
    tasa,
    data.total_ventas, data.ingresos_usd, data.ingresos_ves,
    data.descuentos_usd, data.pendiente_cobrar_usd, data.ganancia_neta_usd,
    JSON.stringify(data.pagos), JSON.stringify(data.abonos), JSON.stringify(data.ventas),
    now,
  ];

  // Try to insert first; if it already exists, update it.
  await db.run(`INSERT OR IGNORE INTO cierres_dia (fecha) VALUES (?)`, [fecha]);
  await db.run(`
    UPDATE cierres_dia SET
      tasa_cierre = ?, total_ventas = ?, ingresos_usd = ?, ingresos_ves = ?,
      descuentos_usd = ?, pendiente_cobrar_usd = ?, ganancia_neta_usd = ?,
      pagos_json = ?, abonos_json = ?, ventas_json = ?, cerrado_en = ?
    WHERE fecha = ?
  `, [...params, fecha]);
  return data;
}

// ── Auto-close days: closes any days with sales that aren't today and aren't closed yet ─
// Called automatically on app startup.
async function autoClosePreviousDays() {
  const db = getDb();
  const today = todayStr();

  // Find the tasa from configuracion (fallback to 1)
  const cfg = await db.get(`SELECT valor FROM configuracion WHERE clave = 'tasa_del_dia'`);
  const tasa = parseFloat(cfg?.valor || '1');

  // Find distinct dates from ventas that are before today and have no cierre_dia entry
  const pendientes = await db.all(`
    SELECT DISTINCT date(fecha) AS fecha
    FROM ventas
    WHERE date(fecha) < ?
      AND date(fecha) NOT IN (SELECT fecha FROM cierres_dia)
    ORDER BY fecha ASC
  `, [today]);

  for (const row of pendientes) {
    try {
      await upsertCierre(db, row.fecha, tasa);
      console.log(`[Reportes] Auto-closed day: ${row.fecha}`);
    } catch (e) {
      console.error(`[Reportes] Failed to auto-close day ${row.fecha}:`, e);
    }
  }
}

// Export so main.js can call it after DB init
module.exports = { autoClosePreviousDays };

// ── reportes:hoy — always returns LIVE data for today ─────────────────────────
// The "closed" flag only means a snapshot exists, but live data is always fresh.
ipcMain.handle('reportes:hoy', async () => {
  const db = getDb();
  const fecha = todayStr();

  const snapshotRow = await db.get('SELECT cerrado_en, tasa_cierre FROM cierres_dia WHERE fecha = ?', [fecha]);
  const data = await buildDayData(db, fecha);

  return {
    cerrado: !!snapshotRow,
    cerrado_en: snapshotRow?.cerrado_en || null,
    tasa_cierre: snapshotRow?.tasa_cierre || null,
    fecha,
    ...data,
  };
});

// ── reportes:cerrar_dia — upsert today's snapshot (safe to call multiple times) ─
ipcMain.handle('reportes:cerrar_dia', async (_e, { tasa }) => {
  const db = getDb();
  const fecha = todayStr();
  const data = await upsertCierre(db, fecha, tasa);
  return { ok: true, fecha, ...data };
});

// ── reportes:historial — list of all closed days ──────────────────────────────
ipcMain.handle('reportes:historial', async () => {
  const db = getDb();
  return await db.all(`
    SELECT id, fecha, tasa_cierre, total_ventas, ingresos_usd, ingresos_ves, cerrado_en
    FROM cierres_dia ORDER BY fecha DESC
  `);
});

// ── reportes:cierre_detalle — full detail for a closed day ────────────────────
ipcMain.handle('reportes:cierre_detalle', async (_e, fecha) => {
  const db = getDb();
  const row = await db.get('SELECT * FROM cierres_dia WHERE fecha = ?', [fecha]);
  if (!row) return null;
  return {
    ...row,
    pagos: JSON.parse(row.pagos_json || '[]'),
    abonos: JSON.parse(row.abonos_json || '[]'),
    ventas: JSON.parse(row.ventas_json || '[]'),
  };
});

// ── reportes:inventario — gets inventory metrics ──────────────────────────────
ipcMain.handle('reportes:inventario', async (_e, tasa) => {
  const db = getDb();
  const t = parseFloat(tasa) || 1;
  const stats = await db.get(`
    SELECT
      COUNT(id) AS total_productos,
      SUM(stock_actual) AS total_articulos,
      SUM(
        CASE WHEN moneda_precio = 'ves'
          THEN (precio_compra_ves / ?) * stock_actual
          ELSE precio_compra_usd * stock_actual
        END
      ) AS inversion_usd,
      SUM(
        CASE WHEN moneda_precio = 'ves'
          THEN ((precio_venta_ves - precio_compra_ves) / ?) * stock_actual
          ELSE (precio_venta_usd - precio_compra_usd) * stock_actual
        END
      ) AS ganancia_potencial_usd
    FROM productos
  `, [t, t]);

  const bajo_stock = await db.all(`
    SELECT id, codigo, nombre, marca, stock_actual, stock_minimo
    FROM productos
    WHERE stock_actual <= stock_minimo
    ORDER BY stock_actual ASC, nombre ASC
  `);

  return { stats, bajo_stock };
});
