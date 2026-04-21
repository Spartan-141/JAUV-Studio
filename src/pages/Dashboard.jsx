import React, { useEffect, useState, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { LuTrendingUp, LuBadgePercent, LuClock, LuBanknote, LuPackage, LuUsers, LuCircleCheck } from 'react-icons/lu'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

export default function Dashboard() {
  const { fmt } = useApp()
  const [stats, setStats] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const chartRef = useRef(null)
  const [chartWidth, setChartWidth] = useState(0)

  useEffect(() => {
    if (!chartRef.current) return
    const observer = new ResizeObserver(([entry]) => {
      setChartWidth(Math.floor(entry.contentRect.width))
    })
    observer.observe(chartRef.current)
    return () => observer.disconnect()
  }, [loading])

  useEffect(() => {
    Promise.all([
      window.api.invoke('reportes:hoy'),
      window.api.invoke('ventas:ultimas', 6),
      window.api.invoke('dashboard:metrics')
    ]).then(([res, v, m]) => {
      setStats(res)
      setVentas(v)
      setMetrics(m)
    }).finally(() => setLoading(false))
  }, [])

  const STATS = stats ? [
    { label: 'Ingresos Hoy',   value: fmt(stats.ingresos || 0),         sub: `${stats.total_ventas || 0} ventas`, color: 'brand-500', icon: <LuTrendingUp />, bg: 'from-brand-600/20 to-brand-900/10' },
    { label: 'Ganancia Neta', value: fmt(stats.ganancia_neta || 0),     sub: 'Estimado bruto', color: 'emerald-400', icon: <LuBanknote />, bg: 'from-emerald-500/20 to-emerald-900/10' },
    { label: 'Por Cobrar',    value: fmt(stats.pendiente_cobrar || 0),  sub: 'Créditos activos', color: 'orange-400', icon: <LuClock />, bg: 'from-orange-500/20 to-orange-900/10' },
    { label: 'Descuentos',   value: fmt(stats.descuentos || 0),         sub: 'Otorgados hoy', color: 'purple-400', icon: <LuBadgePercent />, bg: 'from-purple-500/20 to-purple-900/10' },
  ] : []

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="card p-3 rounded-lg shadow-xl" style={{ border: '1px solid var(--border-strong)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--fg-muted)' }}>{format(parseISO(label), "d MMM", {locale: es})}</p>
          <p className="text-brand-400 font-bold">{fmt(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page pb-10 space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-3 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="text-xl sm:text-3xl font-bold" style={{ color: 'var(--fg)' }}>Hello, JAUV Studio</h1>
          <p className="text-xs sm:text-sm capitalize" style={{ color: 'var(--fg-subtle)' }}>{format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
        </div>
        <div className="flex items-center gap-3 card backdrop-blur py-2 px-4 rounded-2xl shadow-xl">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--fg-subtle)' }}>Moneda</span>
            <span className="font-mono font-bold text-base sm:text-lg text-brand-400">Bolívar (Bs.)</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <>
          {/* STAT CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
            {STATS.map(s => (
              <div key={s.label} className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${s.bg} backdrop-blur-md shadow-lg group`}
                style={{ border: '1px solid var(--border)' }}>
                <div className="absolute -right-6 -top-6 text-9xl opacity-5 group-hover:scale-110 transition-transform duration-500">
                  {s.icon}
                </div>
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--fg-muted)' }}>{s.label}</p>
                    <p className="text-3xl font-bold mb-2" style={{ color: 'var(--fg)' }}>{s.value}</p>
                    <p className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{s.sub}</p>
                  </div>
                  <div className={`p-3 rounded-xl text-xl`}
                    style={{ backgroundColor: 'var(--surface-900)', border: '1px solid var(--border)' }}>
                    {s.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* MAIN CHART - SALES TREND */}
            <div className="md:col-span-2 card p-6 backdrop-blur-md shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>Rendimiento Semanal</h2>
                  <p className="text-xs" style={{ color: 'var(--fg-subtle)' }}>Curva de ingresos de los últimos 7 días</p>
                </div>
                <div className="bg-brand-500/20 text-brand-300 p-2 rounded-lg"><LuTrendingUp /></div>
              </div>
              <div ref={chartRef} style={{ height: 260, width: '100%', position: 'relative' }}>
                {metrics?.trend && metrics.trend.length > 0 && chartWidth > 0 ? (
                  <AreaChart width={chartWidth} height={260} data={metrics.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="fecha" tickFormatter={(str) => format(parseISO(str), 'd MMM', {locale: es})} stroke="var(--fg-subtle)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="var(--fg-subtle)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v)=>`Bs.${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="total" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm" style={{ color: 'var(--fg-subtle)' }}>Sin datos suficientes</div>
                )}
              </div>
            </div>

            {/* TOP PRODUCTS PIE / BAR */}
            <div className="md:col-span-1 card p-6 backdrop-blur-md shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>Top Productos</h2>
                  <p className="text-xs" style={{ color: 'var(--fg-subtle)' }}>Más vendidos (30 días)</p>
                </div>
                <div className="bg-emerald-500/20 text-emerald-300 p-2 rounded-lg"><LuPackage /></div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3">
                {metrics?.top_productos?.length > 0 ? (
                  metrics.top_productos.map((p, i) => (
                    <div key={i} className="flex items-center p-3 rounded-xl border transition-colors"
                      style={{ backgroundColor: 'var(--surface-700)', borderColor: 'var(--border)' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-3 shadow-inner"
                        style={{ backgroundColor: 'var(--surface-900)', color: 'var(--fg-muted)' }}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium line-clamp-1" style={{ color: 'var(--fg)' }} title={p.nombre}>{p.nombre}</p>
                        <p className="text-xs text-emerald-500">{p.total_vendido} vendidos</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{fmt(p.ingresos)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--fg-subtle)' }}>Sin datos de productos</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {/* RECENT SALES */}
             <div className="md:col-span-2 card p-6 backdrop-blur-md shadow-xl">
               <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--fg)' }}>Transacciones Recientes</h2>
               {ventas.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--fg-subtle)' }}>Sin ventas registradas hoy</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {ventas.map(v => (
                      <div key={v.id} className="flex items-center justify-between p-4 rounded-xl border transition-colors"
                        style={{ backgroundColor: 'var(--surface-700)', borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center ${v.estado === 'credito' ? 'bg-orange-500/20 text-orange-400' : 'bg-brand-500/20 text-brand-400'}`}>
                             {v.estado === 'credito' ? <LuClock /> : <LuBanknote />}
                           </div>
                           <div>
                             <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Venta #{v.id}</p>
                             <p className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{v.cliente_nombre || 'Consumidor Final'} • {v.fecha?.slice(11,16)}</p>
                           </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold mb-1" style={{ color: 'var(--fg)' }}>{fmt(v.total)}</p>
                          <span className={`${v.estado === 'credito' ? 'badge-yellow' : 'badge-green'} text-[10px] uppercase font-bold tracking-wider`}>
                            {v.estado}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>

             {/* DEUDORES */}
             <div className="md:col-span-1 p-6 rounded-2xl backdrop-blur-md shadow-xl flex flex-col card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>Cuentas Pendientes</h2>
                  <p className="text-xs" style={{ color: 'var(--fg-subtle)' }}>Top deudores activos</p>
                </div>
                <div className="bg-orange-500/20 text-orange-300 p-2 rounded-lg"><LuUsers /></div>
              </div>

              <div className="space-y-3">
                {metrics?.top_deudores?.length > 0 ? (
                  metrics.top_deudores.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-orange-500/10"
                      style={{ backgroundColor: 'var(--surface-900)' }}>
                      <div>
                        <p className="text-sm font-medium line-clamp-1" style={{ color: 'var(--fg)' }}>{d.nombre}</p>
                        <p className="text-xs" style={{ color: 'var(--fg-subtle)' }}>Deuda acumulada</p>
                      </div>
                      <p className="text-orange-400 font-bold ml-2">{fmt(d.deuda)}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-emerald-400/80 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <LuCircleCheck className="mx-auto text-2xl mb-2" />
                    <p className="text-sm font-medium">Sin deudas pendientes</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
