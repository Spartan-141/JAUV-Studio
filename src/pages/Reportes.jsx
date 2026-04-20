import React, { useState, useEffect, useCallback } from 'react'
import { LuTrendingUp, LuBanknote, LuSmartphone, LuLandmark, LuChevronDown, LuChevronUp, LuCreditCard, LuRefreshCw, LuChartColumn, LuChevronLeft, LuChevronRight, LuDownload, LuSearch, LuX } from 'react-icons/lu'
import { useApp } from '../context/AppContext.jsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const METODO_LABEL = {
  efectivo_ves: <><LuBanknote className="inline mb-1" /> Bs. Efectivo</>,
  pago_movil:   <><LuSmartphone className="inline mb-1" /> Pago Móvil</>,
  transferencia:<><LuLandmark className="inline mb-1" /> Transferencia</>,
}

function StatCard({ label, value, sub, red, green }) {
  return (
    <div className="stat-card flex flex-col justify-center">
      <p className="stat-label truncate">{label}</p>
      <p className={`text-xl sm:text-2xl font-bold ${red ? 'text-red-400' : green ? 'text-accent-green' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-[10px] sm:text-xs text-gray-500 mt-1 truncate">{sub}</p>}
    </div>
  )
}

function MetodosTable({ pagos }) {
  return (
    <div className="card p-4 sm:p-5">
      <h2 className="font-semibold text-white mb-3 text-sm sm:text-base flex items-center gap-2"><LuCreditCard className="text-accent-green" /> Ingresos por Método de Pago</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.entries(METODO_LABEL).map(([key, label]) => {
          const pb = pagos?.find(p => p.metodo === key)
          const total = pb ? pb.total_ves : 0
          return (
            <div key={key} className="bg-surface-700 rounded-xl p-3 sm:p-4">
              <p className="text-xs text-gray-400 mb-1 leading-none">{label}</p>
              <p className="text-base sm:text-lg font-bold text-white leading-none mt-2">Bs. {Number(total).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VentaRow({ v, fmt }) {
  const [open, setOpen] = useState(false)
  const pagado = (v.total || 0) - (v.saldo_pendiente || 0)

  return (
    <>
      <tr className="cursor-pointer hover:bg-surface-700/50" onClick={() => setOpen(o => !o)}>
        <td className="font-mono text-brand-400 text-xs sm:text-sm">#{v.id}</td>
        <td className="text-xs text-gray-400 whitespace-nowrap">{v.fecha?.slice(0, 16)}</td>
        <td className="truncate max-w-[120px] sm:max-w-none">{v.cliente_nombre || '—'}</td>
        <td><span className={v.estado === 'pagada' ? 'badge-green' : 'badge-yellow'}>{v.estado}</span></td>
        <td className="text-right font-semibold text-white">{fmt(v.total)}</td>
        <td className="text-right text-accent-green hidden sm:table-cell">{fmt(pagado)}</td>
        <td className="text-right hidden sm:table-cell">{(v.saldo_pendiente) > 0
          ? <span className="text-red-400">{fmt(v.saldo_pendiente)}</span>
          : <span className="text-gray-500">—</span>}
        </td>
        <td className="text-center text-gray-500">{open ? <LuChevronUp /> : <LuChevronDown />}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={8} className="p-0 border-b border-white/5">
            <div className="bg-surface-900/60 px-4 sm:px-6 py-3 shadow-inner">
              <div className="sm:hidden grid grid-cols-2 gap-2 text-xs mb-3 p-3 bg-surface-800 rounded-lg">
                <div><span className="text-gray-500 block mb-0.5">Cobrado</span> <span className="text-accent-green font-bold">{fmt(pagado)}</span></div>
                <div><span className="text-gray-500 block mb-0.5">Pendiente</span> <span className={(v.saldo_pendiente) > 0 ? "text-red-400 font-bold" : "text-white font-bold"}>{(v.saldo_pendiente) > 0 ? fmt(v.saldo_pendiente) : '—'}</span></div>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-white/5">
                    <th className="text-left pb-2 font-medium">Artículo</th>
                    <th className="text-center font-medium">Cant.</th>
                    <th className="text-right font-medium">P.Unit</th>
                    <th className="text-right font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(v.detalles || []).map((d, i) => (
                    <tr key={i}>
                      <td className="py-2 text-gray-300">{d.nombre}</td>
                      <td className="text-center text-gray-400">{d.cantidad}</td>
                      <td className="text-right text-gray-400 hidden sm:table-cell">{fmt(d.precio_unitario)}</td>
                      <td className="text-right text-white font-medium">{fmt(d.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(v.pagos?.length > 0 || v.abonos?.length > 0) && (
                <div className="mt-3 pt-3 border-t border-white/5 text-xs text-gray-400 space-y-1">
                  <p className="font-semibold text-white/70 tracking-wider uppercase text-[10px] mb-2">Registro de Pagos</p>
                  {[...(v.pagos || []), ...(v.abonos || [])].map((p, i) => (
                    <div key={i} className="flex justify-between items-center bg-surface-800 p-2 rounded-lg">
                      <span className="flex items-center gap-2">{METODO_LABEL[p.metodo] || p.metodo} <span className="text-gray-500 hidden sm:inline ml-2">{p.fecha?.slice(0, 16)}</span></span>
                      <span className="text-accent-green font-bold">{fmt(p.monto)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function Reportes() {
  const { fmt } = useApp()
  const [mode, setMode]   = useState('day')
  const [day, setDay]     = useState(format(new Date(), 'yyyy-MM-dd'))
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [estado, setEstado] = useState('')
  const [cliente, setCliente] = useState('')
  const [page, setPage]   = useState(1)
  const PER_PAGE          = 25
  const [data, setData]   = useState({ ventas: [], total: 0, pages: 0, resumen: {} })
  const [loading, setLoading] = useState(false)

  const buildDates = () => {
    if (mode === 'day')  return { fechaDesde: day, fechaHasta: day }
    if (mode === 'month') {
      const [y, m] = month.split('-')
      const last = new Date(Number(y), Number(m), 0).getDate()
      return { fechaDesde: `${month}-01`, fechaHasta: `${month}-${String(last).padStart(2,'0')}` }
    }
    return { fechaDesde: desde, fechaHasta: hasta }
  }

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    const { fechaDesde, fechaHasta } = buildDates()
    const result = await window.api.invoke('ventas:paginated', { page: p, perPage: PER_PAGE, fechaDesde, fechaHasta, estado, cliente })
    setData(result)
    setPage(p)
    setLoading(false)
  }, [mode, day, month, desde, hasta, estado, cliente])

  useEffect(() => { load(1) }, [mode, day, month, desde, hasta, estado]) // Exclude cliente to avoid typing debounce issues

  const handleSearchClient = (e) => {
    e.preventDefault()
    load(1)
  }

  const exportAsCsv = () => {
    if (!data.ventas.length) return
    const headers = ['ID', 'Fecha', 'Cliente', 'Estado', 'Total', 'Cobrado', 'Pendiente']
    const rows = data.ventas.map(v => {
      const cobrado = (v.total || 0) - (v.saldo_pendiente || 0)
      return [
        v.id, v.fecha, `"${v.cliente_nombre || ''}"`, v.estado, v.total, cobrado, v.saldo_pendiente
      ].join(',')
    })
    const csvContent = headers.join(',') + '\n' + rows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.setAttribute('download', `reporte_ventas_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`)
    a.click()
  }

  const resumen = data.resumen || {}

  return (
    <div className="page pb-10">
      <div className="page-header items-start sm:items-center">
        <div>
          <h1 className="page-title flex items-center gap-2"><LuChartColumn className="text-brand-400" /> Historial de Ventas</h1>
          <p className="text-sm text-gray-500">Métricas dinámicas y reportes consolidados</p>
        </div>
        <button onClick={exportAsCsv} className="btn-secondary btn-sm flex items-center gap-2 shrink-0">
          <LuDownload /> Exportar CSV
        </button>
      </div>

      <div className="space-y-4">
        {/* FILTERS CARD */}
        <div className="card p-4 flex flex-wrap gap-3 sm:gap-4 items-end bg-surface-800/80 backdrop-blur-sm border border-brand-500/10">
          <div className="flex rounded-lg overflow-hidden border border-white/5 text-sm shrink-0 shadow-sm">
            {[['day','Día'],['month','Mes'],['range','Rango']].map(([k, label]) => (
              <button key={k} onClick={() => { setMode(k); setPage(1) }}
                className={`px-4 py-2 transition-colors ${mode === k ? 'bg-brand-600 text-white font-medium' : 'bg-surface-700/50 text-gray-400 hover:text-white hover:bg-surface-700'}`}>
                {label}
              </button>
            ))}
          </div>
          {mode === 'day' && <input type="date" className="input w-40 sm:w-44 bg-surface-900 border-white/5 focus:border-brand-500/50" value={day} onChange={e => { setDay(e.target.value); setPage(1) }} />}
          {mode === 'month' && <input type="month" className="input w-40 sm:w-44 bg-surface-900 border-white/5 focus:border-brand-500/50" value={month} onChange={e => { setMonth(e.target.value); setPage(1) }} />}
          {mode === 'range' && (
            <div className="flex gap-2">
              <div className="flex flex-col gap-1"><span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold ml-1">Desde</span><input type="date" className="input w-36 sm:w-40 bg-surface-900" value={desde} onChange={e => { setDesde(e.target.value); setPage(1) }} /></div>
              <div className="flex flex-col gap-1"><span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold ml-1">Hasta</span><input type="date" className="input w-36 sm:w-40 bg-surface-900" value={hasta} onChange={e => { setHasta(e.target.value); setPage(1) }} /></div>
            </div>
          )}
          
          <div className="h-8 w-px bg-white/5 hidden xl:block mx-1"></div>

          <div className="flex flex-wrap gap-3 sm:gap-4 items-end flex-grow">
            <select className="select w-40 bg-surface-900 border-white/5 focus:border-brand-500/50" value={estado} onChange={e => { setEstado(e.target.value); setPage(1) }}>
              <option value="">Cualquier estado</option>
              <option value="pagada">Ver Pagadas</option>
              <option value="credito">Ver Por Cobrar</option>
            </select>
            
            <form onSubmit={handleSearchClient} className="flex relative items-center max-w-xs flex-grow">
              <LuSearch className="absolute left-3 text-gray-400" />
              <input type="text" className="input pl-9 pr-8 bg-surface-900 border-white/5 focus:border-brand-500/50 shadow-inner" placeholder="Buscar por cliente..." value={cliente} onChange={e => setCliente(e.target.value)} />
              {cliente && <button type="button" onClick={() => { setCliente(''); setTimeout(() => load(1), 0) }} className="absolute right-2 text-gray-400 hover:text-white p-1 bg-surface-800 rounded-md"><LuX size={14}/></button>}
            </form>

            <button onClick={() => load(1)} className="btn-secondary btn-sm ml-auto flex items-center gap-2 border border-white/5 hover:border-white/20">
              <LuRefreshCw className={loading ? "animate-spin text-brand-400" : "text-brand-400"} /> <span className="hidden sm:inline">Refrescar</span>
            </button>
          </div>
        </div>

        {/* SUMMARY METRICS */}
        {loading && !data.ventas.length ? (
             <div className="py-20 flex flex-col items-center justify-center text-brand-400 gap-4"><LuRefreshCw className="animate-spin text-4xl" /><span className="text-gray-400 text-sm">Calculando métricas...</span></div>
        ) : (
          <div className="animate-fade-in relative">
            {loading && <div className="absolute inset-0 bg-surface-900/20 backdrop-blur-[1px] z-20 rounded-xl flex items-center justify-center pointer-events-none"></div>}
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <StatCard label="Total Ventas" value={data.total || 0} sub="Operaciones en rango" />
              <StatCard label="Ingreso Bruto" value={fmt(resumen.ingresos || 0)} green />
              <StatCard label="Ganancia Neta" value={fmt(resumen.ganancia_neta || 0)} green sub="Estimado sobre facturación" />
              <StatCard label="Descuentos" value={fmt(resumen.descuentos || 0)} />
              <StatCard label="Cuentas por Cobrar" value={fmt(resumen.pendiente_cobrar || 0)} red={(resumen.pendiente_cobrar || 0) > 0} sub="Capital inmovilizado" />
            </div>

            <MetodosTable pagos={resumen.pagos || []} />

            {/* TABLE */}
            <div className="card table-wrapper mt-4">
              <table className="w-full">
                <thead><tr>
                  <th>#</th><th>Fecha</th><th>Cliente</th><th>Estado</th>
                  <th className="text-right">Total</th><th className="text-right hidden sm:table-cell">Cobrado</th>
                  <th className="text-right hidden sm:table-cell">Pendiente</th><th></th>
                </tr></thead>
                <tbody>
                  {data.ventas.length === 0 ? <tr><td colSpan={8} className="text-center py-16 text-gray-500">No hay ventas registradas en las fechas seleccionadas</td></tr>
                    : data.ventas.map(v => <VentaRow key={v.id} v={v} fmt={fmt} />)
                  }
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            {data.pages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-5 gap-4">
                <span className="text-xs text-gray-500 bg-surface-800 px-3 py-1.5 rounded-lg border border-white/5">Página <strong className="text-white">{data.page}</strong> de <strong className="text-white">{data.pages}</strong> · {data.total} facturas</span>
                <div className="flex gap-1.5 bg-surface-800 p-1 rounded-xl border border-white/5 shadow-inner">
                  <button onClick={() => load(1)} disabled={page === 1} className="btn-ghost btn-sm h-8 w-8 p-0 flex items-center justify-center rounded-lg" title="Primera">«</button>
                  <button onClick={() => load(page - 1)} disabled={page === 1} className="btn-ghost btn-sm h-8 w-8 p-0 flex items-center justify-center rounded-lg"><LuChevronLeft /></button>
                  {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, data.pages - 4))
                    const p = start + i
                    if (p > data.pages) return null
                    return <button key={p} onClick={() => load(p)} className={`btn-sm h-8 min-w-[32px] p-0 flex items-center justify-center rounded-lg text-sm transition-colors ${p === page ? 'bg-brand-600 text-white shadow-md' : 'hover:bg-surface-700 text-gray-400'}`}>{p}</button>
                  })}
                  <button onClick={() => load(page + 1)} disabled={page === data.pages} className="btn-ghost btn-sm h-8 w-8 p-0 flex items-center justify-center rounded-lg"><LuChevronRight /></button>
                  <button onClick={() => load(data.pages)} disabled={page === data.pages} className="btn-ghost btn-sm h-8 w-8 p-0 flex items-center justify-center rounded-lg" title="Última">»</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
