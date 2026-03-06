'use strict';
const { ipcMain } = require('electron');
const { getDb } = require('../db');

ipcMain.handle('reportes:resumen', (_e, { fecha_desde, fecha_hasta }) => {
  const db = getDb();
  const desde = fecha_desde + ' 00:00:00';
  const hasta = fecha_hasta + ' 23:59:59';

  // Sales summary
  const ventas = db.prepare(`
    SELECT
      COUNT(*) AS total_ventas,
      SUM(total_usd) AS ingresos_brutos_usd,
      SUM(descuento_otorgado_usd) AS total_descuentos_usd,
      SUM(CASE WHEN estado='credito' THEN saldo_pendiente_usd ELSE 0 END) AS pendiente_cobrar_usd
    FROM ventas WHERE fecha BETWEEN ? AND ?
  `).get(desde, hasta);

  // Net profit: (precio_venta - precio_compra) * cantidad for product lines
  const ganancia = db.prepare(`
    SELECT SUM((dv.precio_unitario_usd - COALESCE(p.precio_compra_usd, 0)) * dv.cantidad) AS ganancia_bruta_usd
    FROM detalle_venta dv
    JOIN ventas v ON v.id = dv.venta_id
    LEFT JOIN productos p ON p.id = dv.ref_id AND dv.tipo = 'producto'
    WHERE v.fecha BETWEEN ? AND ?
  `).get(desde, hasta);

  // Payment breakdown by method
  const pagos = db.prepare(`
    SELECT p.metodo,
           SUM(p.monto_usd) AS total_usd,
           SUM(p.monto_ves) AS total_ves
    FROM pagos p
    JOIN ventas v ON v.id = p.venta_id
    WHERE v.fecha BETWEEN ? AND ?
    GROUP BY p.metodo
  `).all(desde, hasta);

  const abonos = db.prepare(`
    SELECT a.metodo,
           SUM(a.monto_usd) AS total_usd,
           SUM(a.monto_ves) AS total_ves
    FROM abonos a
    JOIN ventas v ON v.id = a.venta_id
    WHERE a.fecha BETWEEN ? AND ?
    GROUP BY a.metodo
  `).all(desde, hasta);

  // Recent sales list
  const listaVentas = db.prepare(`
    SELECT * FROM ventas WHERE fecha BETWEEN ? AND ? ORDER BY fecha DESC LIMIT 100
  `).all(desde, hasta);

  const neta = (ganancia.ganancia_bruta_usd || 0) - (ventas.total_descuentos_usd || 0);

  return {
    ventas,
    ganancia_neta_usd: parseFloat(neta.toFixed(2)),
    pagos,
    abonos,
    lista_ventas: listaVentas,
  };
});

ipcMain.handle('reportes:cierre_caja', (_e, fecha) => {
  const db = getDb();
  const desde = fecha + ' 00:00:00';
  const hasta = fecha + ' 23:59:59';

  const pagosDia = db.prepare(`
    SELECT p.metodo, SUM(p.monto_usd) AS usd, SUM(p.monto_ves) AS ves
    FROM pagos p JOIN ventas v ON v.id = p.venta_id
    WHERE v.fecha BETWEEN ? AND ? GROUP BY p.metodo
  `).all(desde, hasta);

  const abonosDia = db.prepare(`
    SELECT a.metodo, SUM(a.monto_usd) AS usd, SUM(a.monto_ves) AS ves
    FROM abonos a WHERE a.fecha BETWEEN ? AND ? GROUP BY a.metodo
  `).all(desde, hasta);

  return { pagos: pagosDia, abonos: abonosDia, fecha };
});
