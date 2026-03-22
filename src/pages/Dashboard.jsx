import React, { useEffect, useState, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { LuTrendingUp, LuBadgePercent, LuClock, LuDollarSign, LuPackage, LuUsers, LuCircleCheck } from 'react-icons/lu'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

export default function Dashboard() {
  const { fmt, toVes, tasa } = useApp()
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
    { label: 'Ingresos Hoy',       value: fmt(stats.ingresos_usd), sub: `Bs. ${toVes(stats.ingresos_usd).toLocaleString('es-VE', {maximumFractionDigits:2})}`, color: 'brand-500', icon: <LuTrendingUp />, bg: 'from-brand-600/20 to-brand-900/10' },
    { label: 'Ganancia Neta',      value: fmt(stats.ganancia_neta_usd), sub: `${stats.total_ventas || 0} ventas cerradas`, color: 'emerald-400', icon: <LuDollarSign />, bg: 'from-emerald-500/20 to-emerald-900/10' },
    { label: 'Por Cobrar',         value: fmt(stats.pendiente_cobrar_usd), sub: 'Créditos activos', color: 'orange-400', icon: <LuClock />, bg: 'from-orange-500/20 to-orange-900/10' },
    { label: 'Descuentos',         value: fmt(stats.descuentos_usd), sub: 'Otorgados hoy', color: 'purple-400', icon: <LuBadgePercent />, bg: 'from-purple-500/20 to-purple-900/10' },
  ] : []

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-800 border border-white/10 p-3 rounded-lg shadow-xl">
          <p className="text-gray-400 text-xs mb-1">{format(parseISO(label), "d MMM", {locale: es})}</p>
          <p className="text-brand-400 font-bold">{fmt(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page pb-10 space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Hello, JAUV Studio</h1>
          <p className="text-xs sm:text-sm text-gray-500 capitalize">{format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
        </div>
        <div className="flex items-center gap-3 bg-surface-800/80 backdrop-blur py-2 px-4 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Tasa BCV</span>
            <span className="font-mono font-bold text-base sm:text-lg text-brand-400">Bs. {Number(tasa).toFixed(2)}</span>
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
              <div key={s.label} className={`relative overflow-hidden rounded-2xl p-5 border border-white/5 bg-gradient-to-br ${s.bg} backdrop-blur-md shadow-lg group`}>
                <div className="absolute -right-6 -top-6 text-9xl opacity-5 group-hover:scale-110 transition-transform duration-500">
                  {s.icon}
                </div>
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-400 mb-1">{s.label}</p>
                    <p className="text-3xl font-bold text-white mb-2">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.sub}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-surface-900/50 text-xl border border-white/5`} style={{ color: `rgb(var(--tw-${s.color}, 255,255,255))` }}>
                    {s.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* MAIN CHART - SALES TREND */}
            <div className="md:col-span-2 card p-6 bg-surface-800/50 backdrop-blur-md border border-white/5 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Rendimiento Semanal</h2>
                  <p className="text-xs text-gray-500">Curva de ingresos de los últimos 7 días</p>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="fecha" tickFormatter={(str) => format(parseISO(str), 'd MMM', {locale: es})} stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v)=>`$${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="total" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 text-sm">Sin datos suficientes</div>
                )}
              </div>
            </div>

            {/* TOP PRODUCTS PIE / BAR */}
            <div className="md:col-span-1 card p-6 bg-surface-800/50 backdrop-blur-md border border-white/5 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Top Productos</h2>
                  <p className="text-xs text-gray-500">Más vendidos (30 días)</p>
                </div>
                <div className="bg-emerald-500/20 text-emerald-300 p-2 rounded-lg"><LuPackage /></div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3">
                {metrics?.top_productos?.length > 0 ? (
                  metrics.top_productos.map((p, i) => (
                    <div key={i} className="flex items-center p-3 rounded-xl bg-surface-700/30 border border-white/5 hover:bg-surface-700/70 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-surface-900 flex items-center justify-center font-bold text-sm text-gray-400 mr-3 shadow-inner">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white line-clamp-1" title={p.nombre}>{p.nombre}</p>
                        <p className="text-xs text-emerald-400">{p.total_vendido} vendidos</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{fmt(p.ingresos)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">Sin datos de productos</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {/* RECENT SALES */}
             <div className="md:col-span-2 card p-6 bg-surface-800/50 backdrop-blur-md border border-white/5 shadow-xl">
               <h2 className="text-lg font-bold text-white mb-4">Transacciones Recientes</h2>
               {ventas.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">Sin ventas registradas hoy</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {ventas.map(v => (
                      <div key={v.id} className="flex items-center justify-between p-4 rounded-xl bg-surface-700/20 border border-white/5">
                        <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center ${v.estado === 'credito' ? 'bg-orange-500/20 text-orange-400' : 'bg-brand-500/20 text-brand-400'}`}>
                             {v.estado === 'credito' ? <LuClock /> : <LuDollarSign />}
                           </div>
                           <div>
                             <p className="text-sm text-white font-medium">Venta #{v.id}</p>
                             <p className="text-xs text-gray-500">{v.cliente_nombre || 'Consumidor Final'} • {v.fecha?.slice(11,16)}</p>
                           </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-white mb-1">{fmt(v.total_usd)}</p>
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
             <div className="md:col-span-1 border border-white/5 p-6 rounded-2xl bg-gradient-to-b from-surface-800/80 to-surface-800/30 backdrop-blur-md shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Cuentas Pendientes</h2>
                  <p className="text-xs text-gray-500">Top deudores activos</p>
                </div>
                <div className="bg-orange-500/20 text-orange-300 p-2 rounded-lg"><LuUsers /></div>
              </div>

              <div className="space-y-3">
                {metrics?.top_deudores?.length > 0 ? (
                  metrics.top_deudores.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface-900/40 border border-orange-500/10">
                      <div>
                        <p className="text-sm font-medium text-white line-clamp-1">{d.nombre}</p>
                        <p className="text-xs text-gray-500">Deuda acumulada</p>
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
