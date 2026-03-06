import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function Dashboard() {
  const { fmt, toVes, tasa } = useApp()
  const [stats, setStats] = useState(null)
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const hoy = format(new Date(), 'yyyy-MM-dd')
    Promise.all([
      window.api.invoke('reportes:resumen', { fecha_desde: hoy, fecha_hasta: hoy }),
      window.api.invoke('ventas:ultimas', 8),
    ]).then(([res, v]) => {
      setStats(res)
      setVentas(v)
    }).finally(() => setLoading(false))
  }, [])

  const STATS = stats ? [
    { label: 'Ventas Hoy',         value: fmt(stats.ventas?.ingresos_brutos_usd), sub: `Bs. ${toVes(stats.ventas?.ingresos_brutos_usd).toLocaleString('es-VE', {maximumFractionDigits:2})}`, color: 'brand-500' },
    { label: 'Ganancia Neta',      value: fmt(stats.ganancia_neta_usd), sub: `${stats.ventas?.total_ventas || 0} ventas`, color: 'accent-green' },
    { label: 'Descuentos',         value: fmt(stats.ventas?.total_descuentos_usd), sub: 'Otorgados hoy', color: 'accent-yellow' },
    { label: 'Pendiente Cobrar',   value: fmt(stats.ventas?.pendiente_cobrar_usd), sub: 'Créditos activos', color: 'red-400' },
  ] : []

  const metodoLabel = { efectivo_usd: '$ Efectivo USD', efectivo_ves: 'Bs. Efectivo', pago_movil: 'Bs. Pago Móvil', transferencia: 'Bs. Transferencia' }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-gray-500">{format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
        </div>
        <div className="flex items-center gap-2 bg-surface-700 px-4 py-2 rounded-xl border border-white/5">
          <span className="text-xs text-gray-400">Tasa BCV:</span>
          <span className="font-mono font-bold text-brand-400">Bs. {Number(tasa).toFixed(2)} / $</span>
        </div>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="card-p h-24 animate-pulse-soft" />)}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {STATS.map(s => (
            <div key={s.label} className="stat-card border-t-2" style={{ borderTopColor: `rgb(var(--tw-${s.color}))` }}>
              <p className="stat-label">{s.label}</p>
              <p className="stat-value text-xl">{s.value}</p>
              <p className="text-xs text-gray-500">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-5">
        {/* Recent sales */}
        <div className="card p-5">
          <h2 className="font-semibold text-white mb-4">Últimas Ventas</h2>
          {ventas.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Sin ventas registradas hoy</p>
          ) : (
            <div className="space-y-2">
              {ventas.map(v => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm text-white font-medium">#{v.id} {v.cliente_nombre || 'Cliente'}</p>
                    <p className="text-xs text-gray-500">{v.fecha?.slice(11,16)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{fmt(v.total_usd)}</p>
                    <span className={v.estado === 'credito' ? 'badge-yellow' : 'badge-green'}>
                      {v.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment breakdown */}
        <div className="card p-5">
          <h2 className="font-semibold text-white mb-4">Ingresos por Método</h2>
          {!stats || !stats.pagos?.length ? (
            <p className="text-gray-500 text-sm text-center py-8">Sin movimientos hoy</p>
          ) : (
            <div className="space-y-3">
              {stats.pagos.map(p => (
                <div key={p.metodo} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{metodoLabel[p.metodo] || p.metodo}</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{fmt(p.total_usd)}</p>
                    {p.total_ves > 0 && <p className="text-xs text-gray-500">Bs. {Number(p.total_ves).toLocaleString('es-VE',{maximumFractionDigits:2})}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
