import React, { useState, useEffect, useCallback } from 'react'
import { LuTrendingUp, LuHistory, LuPackage, LuDollarSign, LuBanknote, LuSmartphone, LuLandmark, LuChevronDown, LuChevronUp, LuCreditCard, LuCalendarDays, LuLock, LuCalendarClock, LuRefreshCw, LuCircleCheck, LuChartColumn, LuSearch, LuChevronLeft, LuChevronRight, LuListOrdered } from 'react-icons/lu'
import { useApp } from '../context/AppContext.jsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import ConfirmationModal from '../components/ConfirmationModal.jsx'
import AlertModal from '../components/AlertModal.jsx'

const METODO_LABEL = {
  efectivo_usd: <><LuDollarSign className="inline mb-1" /> Efectivo USD</>,
  efectivo_ves: <><LuBanknote className="inline mb-1" /> Bs. Efectivo</>,
  pago_movil:   <><LuSmartphone className="inline mb-1" /> Pago Móvil</>,
  transferencia:<><LuLandmark className="inline mb-1" /> Transferencia</>,
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, red, green }) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className={`text-xl font-bold ${red ? 'text-red-400' : green ? 'text-accent-green' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Payment methods breakdown ──────────────────────────────────────────────────
function MetodosTable({ pagos, abonos }) {
  const combined = {}
  ;[...pagos, ...abonos].forEach(({ metodo, total_usd, total_ves }) => {
    if (!combined[metodo]) combined[metodo] = { usd: 0, ves: 0 }
    combined[metodo].usd += total_usd || 0
    combined[metodo].ves += total_ves || 0
  })

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-white mb-3 flex items-center gap-2"><LuCreditCard className="text-accent-green" /> Ingresos por Método</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(METODO_LABEL).map(([key, label]) => {
          const v = combined[key] || { usd: 0, ves: 0 }
          return (
            <div key={key} className="bg-surface-700 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="text-lg font-bold text-white">${v.usd.toFixed(2)}</p>
              {v.ves > 0 && <p className="text-xs text-gray-500">Bs. {v.ves.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Single sale row (expandable) ───────────────────────────────────────────────
function VentaRow({ v, fmt }) {
  const [open, setOpen] = useState(false)
  const pagado = (v.total_usd || 0) - (v.saldo_pendiente_usd || 0)

  return (
    <>
      <tr className="cursor-pointer hover:bg-surface-700/50" onClick={() => setOpen(o => !o)}>
        <td className="font-mono text-brand-400">#{v.id}</td>
        <td className="text-xs text-gray-400">{v.fecha?.slice(0, 16)}</td>
        <td>{v.cliente_nombre || '—'}</td>
        <td><span className={v.estado === 'pagada' ? 'badge-green' : 'badge-yellow'}>{v.estado}</span></td>
        <td className="text-right font-semibold text-white">{fmt(v.total_usd)}</td>
        <td className="text-right text-accent-green">{fmt(pagado)}</td>
        <td className="text-right">{v.saldo_pendiente_usd > 0 ? <span className="text-red-400">{fmt(v.saldo_pendiente_usd)}</span> : <span className="text-gray-500">—</span>}</td>
        <td className="text-center text-gray-500">{open ? <LuChevronUp /> : <LuChevronDown />}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={8} className="p-0">
            <div className="bg-surface-900/60 border-t border-white/5 px-6 py-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500">
                    <th className="text-left pb-1">Artículo</th>
                    <th className="text-center">Cant.</th>
                    <th className="text-right">P.Unit</th>
                    <th className="text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(v.detalles || []).map((d, i) => (
                    <tr key={i} className="border-t border-white/5">
                      <td className="py-1 text-gray-300">{d.nombre}</td>
                      <td className="text-center text-gray-400">{d.cantidad}</td>
                      <td className="text-right text-gray-400">{fmt(d.precio_unitario_usd)}</td>
                      <td className="text-right text-white font-medium">{fmt(d.subtotal_usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(v.pagos?.length > 0 || v.abonos?.length > 0) && (
                <div className="mt-2 pt-2 border-t border-white/5 text-xs text-gray-500 space-y-0.5">
                  <p className="font-medium text-gray-400">Pagos:</p>
                  {[...(v.pagos || []), ...(v.abonos || [])].map((p, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{METODO_LABEL[p.metodo] || p.metodo} <span className="text-gray-600">{p.fecha?.slice(0, 16)}</span></span>
                      <span className="text-accent-green">${Number(p.monto_usd).toFixed(2)} {p.monto_ves > 0 && <span className="text-gray-500">(Bs. {Number(p.monto_ves).toLocaleString('es-VE', { maximumFractionDigits: 2 })})</span>}</span>
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

// ── Day panel (shared for live + historical) ───────────────────────────────────
function DayPanel({ data, fmt, tasa, isHistorical }) {
  const tasaDisplay = isHistorical ? data.tasa_cierre : tasa

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        <StatCard label="N° Ventas" value={data.total_ventas || 0} />
        <StatCard
          label="Ingresos USD"
          value={`$${Number(data.ingresos_usd || 0).toFixed(2)}`}
          sub={`Bs. ${Number(data.ingresos_ves || 0).toLocaleString('es-VE', { maximumFractionDigits: 2 })}`}
        />
        <StatCard
          label="Ganancia Neta"
          value={`$${Number(data.ganancia_neta_usd || 0).toFixed(2)}`}
          sub={`Descuentos: -$${Number(data.descuentos_usd || 0).toFixed(2)}`}
          green
        />
        <StatCard
          label="Descuentos"
          value={fmt(data.descuentos_usd || 0)}
        />
        <StatCard
          label="Pendiente Cobrar"
          value={fmt(data.pendiente_cobrar_usd || 0)}
          red={(data.pendiente_cobrar_usd || 0) > 0}
        />
      </div>

      {/* Methods */}
      <MetodosTable pagos={data.pagos || []} abonos={data.abonos || []} />

      {/* Sales */}
      <div className="card table-wrapper">
        <div className="px-5 pt-4 pb-2">
          <h2 className="font-semibold text-white">🧾 Ventas del Día</h2>
          <p className="text-xs text-gray-500">Tasa aplicada: Bs. {Number(tasaDisplay).toFixed(2)}/$</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Hora</th><th>Cliente</th><th>Estado</th>
              <th className="text-right">Total</th>
              <th className="text-right">Cobrado</th>
              <th className="text-right">Pendiente</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data.ventas || []).length === 0
              ? <tr><td colSpan={8} className="text-center py-8 text-gray-500">Sin ventas registradas hoy</td></tr>
              : (data.ventas || []).map(v => <VentaRow key={v.id} v={v} fmt={fmt} />)
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Inventario panel ──────────────────────────────────────────────────────────
function InventarioPanel({ reporte, fmt, tasa }) {
  if (!reporte) return null
  const { stats, bajo_stock } = reporte
  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Productos" value={stats.total_productos || 0} sub="Referencias únicas" />
        <StatCard label="Artículos Físicos" value={stats.total_articulos || 0} sub="Unidades totales en stock" />
        <StatCard
          label="Inversión (Costo)"
          value={`$${Number(stats.inversion_usd || 0).toFixed(2)}`}
          sub={`Bs. ${Number((stats.inversion_usd || 0)*tasa).toLocaleString('es-VE', { maximumFractionDigits: 2 })}`}
        />
        <StatCard
          label="Ganancia Potencial"
          value={`$${Number(stats.ganancia_potencial_usd || 0).toFixed(2)}`}
          sub={`Bs. ${Number((stats.ganancia_potencial_usd || 0)*tasa).toLocaleString('es-VE', { maximumFractionDigits: 2 })}`}
          green
        />
      </div>

      {/* Low stock table */}
      <div className="card table-wrapper mt-4">
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <h2 className="font-semibold text-white">⚠️ Alertas de Inventario (Bajo Stock)</h2>
          <span className="text-xs text-gray-500">{bajo_stock.length} productos</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th className="text-center">Min. Sugerido</th>
              <th className="text-center">Stock Actual</th>
            </tr>
          </thead>
          <tbody>
            {bajo_stock.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-500">Ningún producto con stock bajo</td></tr>
            ) : (
              bajo_stock.map(p => (
                <tr key={p.id}>
                  <td className="font-mono text-xs text-brand-400">{p.codigo}</td>
                  <td>
                    <p className="font-medium text-white">{p.nombre}</p>
                    {p.marca && <p className="text-xs text-gray-500">{p.marca}</p>}
                  </td>
                  <td className="text-center text-gray-400">{p.stock_minimo}</td>
                  <td className="text-center font-bold text-red-400">{p.stock_actual}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Paginated all-sales panel ──────────────────────────────────────────────────
function VentasHistorialPanel({ fmt }) {
  const [mode, setMode]           = useState('range')   // 'day' | 'month' | 'range'
  const [day, setDay]             = useState('')         // YYYY-MM-DD
  const [month, setMonth]         = useState(format(new Date(), 'yyyy-MM')) // YYYY-MM
  const [desde, setDesde]         = useState('')         // YYYY-MM-DD
  const [hasta, setHasta]         = useState('')         // YYYY-MM-DD
  const [estado, setEstado]       = useState('')         // '' | 'pagada' | 'credito'
  const [page, setPage]           = useState(1)
  const PER_PAGE                  = 25
  const [data, setData]           = useState({ ventas: [], total: 0, pages: 0 })
  const [loading, setLoading]     = useState(false)

  const buildDates = () => {
    if (mode === 'day')  return { fechaDesde: day,  fechaHasta: day }
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
    const result = await window.api.invoke('ventas:paginated', { page: p, perPage: PER_PAGE, fechaDesde, fechaHasta, estado })
    setData(result)
    setPage(p)
    setLoading(false)
  }, [mode, day, month, desde, hasta, estado]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-load on filter change
  useEffect(() => { load(1) }, [mode, day, month, desde, hasta, estado]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalIngresos = data.ventas.reduce((s, v) => s + (v.total_usd || 0), 0)

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        {/* Mode selector */}
        <div className="flex rounded-lg overflow-hidden border border-white/10 text-sm shrink-0">
          {[['day','Día'],['month','Mes'],['range','Rango']].map(([k, label]) => (
            <button key={k} onClick={() => { setMode(k); setPage(1) }}
              className={`px-4 py-2 transition-colors ${mode === k ? 'bg-brand-600 text-white' : 'bg-surface-700 text-gray-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Date inputs */}
        {mode === 'day' && (
          <input type="date" className="input w-44" value={day} onChange={e => { setDay(e.target.value); setPage(1) }} />
        )}
        {mode === 'month' && (
          <input type="month" className="input w-44" value={month} onChange={e => { setMonth(e.target.value); setPage(1) }} />
        )}
        {mode === 'range' && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Desde</span>
              <input type="date" className="input w-40" value={desde} onChange={e => { setDesde(e.target.value); setPage(1) }} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Hasta</span>
              <input type="date" className="input w-40" value={hasta} onChange={e => { setHasta(e.target.value); setPage(1) }} />
            </div>
          </>
        )}

        {/* Estado filter */}
        <select className="select w-36" value={estado} onChange={e => { setEstado(e.target.value); setPage(1) }}>
          <option value="">Todos</option>
          <option value="pagada">Pagadas</option>
          <option value="credito">Crédito</option>
        </select>

        <button onClick={() => load(1)} className="btn-secondary btn-sm ml-auto flex items-center gap-2">
          <LuRefreshCw /> Actualizar
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="stat-card">
          <p className="stat-label">Ventas encontradas</p>
          <p className="text-xl font-bold text-white">{data.total}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Ingresos (esta página)</p>
          <p className="text-xl font-bold text-accent-green">${totalIngresos.toFixed(2)}</p>
        </div>
        <div className="stat-card hidden sm:block">
          <p className="stat-label">Registros por página</p>
          <p className="text-xl font-bold text-white">{PER_PAGE}</p>
        </div>
      </div>

      {/* Table */}
      <div className="card table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th className="text-right">Total</th>
              <th className="text-right">Cobrado</th>
              <th className="text-right">Pendiente</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-500">Cargando ventas...</td></tr>
            ) : data.ventas.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-500">No hay ventas para los filtros seleccionados</td></tr>
            ) : (
              data.ventas.map(v => <VentaRow key={v.id} v={v} fmt={fmt} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Página {data.page} de {data.pages} · {data.total} registros
          </span>
          <div className="flex gap-1">
            <button onClick={() => load(1)}         disabled={page === 1}           className="btn-ghost btn-sm" title="Primera">«</button>
            <button onClick={() => load(page - 1)}  disabled={page === 1}           className="btn-ghost btn-sm"><LuChevronLeft /></button>
            {/* Page number pills */}
            {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, data.pages - 4))
              const p = start + i
              return (
                <button key={p} onClick={() => load(p)}
                  className={`btn-sm px-3 rounded-lg text-sm ${p === page ? 'bg-brand-600 text-white' : 'btn-ghost'}`}>
                  {p}
                </button>
              )
            })}
            <button onClick={() => load(page + 1)}  disabled={page === data.pages} className="btn-ghost btn-sm"><LuChevronRight /></button>
            <button onClick={() => load(data.pages)} disabled={page === data.pages} className="btn-ghost btn-sm" title="Última">»</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Reportes page ─────────────────────────────────────────────────────────
export default function Reportes() {
  const { fmt, tasa } = useApp()
  const [hoy, setHoy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [historial, setHistorial] = useState([])
  const [selectedFecha, setSelectedFecha] = useState('')
  const [detalle, setDetalle] = useState(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [showConfirmCerrar, setShowConfirmCerrar] = useState(false)
  const [cerrando, setCerrando] = useState(false)

  const fechaHoy = format(new Date(), 'yyyy-MM-dd')
  const fechaHoyLabel = format(new Date(), "EEEE dd 'de' MMMM yyyy", { locale: es })
  const [alertMsg, setAlertMsg] = useState('')
  const [activeTab, setActiveTab] = useState('hoy')

  const [inventario, setInventario] = useState(null)
  const [loadingInv, setLoadingInv] = useState(false)

  const loadHoy = useCallback(async () => {
    setLoading(true)
    const data = await window.api.invoke('reportes:hoy')
    setHoy(data)
    setLoading(false)
  }, [])

  const loadHistorial = useCallback(async () => {
    const rows = await window.api.invoke('reportes:historial')
    setHistorial(rows)
  }, [])

  const loadInventario = useCallback(async () => {
    setLoadingInv(true)
    const data = await window.api.invoke('reportes:inventario', tasa)
    setInventario(data)
    setLoadingInv(false)
  }, [tasa])

  useEffect(() => {
    loadHoy()
    loadHistorial()
    const interval = setInterval(loadHoy, 60000)
    return () => clearInterval(interval)
  }, [loadHoy, loadHistorial])

  const handleSelectFecha = async (fecha) => {
    if (!window.api) return
    setSelectedFecha(fecha)
    if (!fecha) { setDetalle(null); return }
    setLoadingDetalle(true)
    const d = await window.api.invoke('reportes:cierre_detalle', fecha)
    setDetalle(d)
    setLoadingDetalle(false)
  }

  const handleCerrarDia = async () => {
    setCerrando(true)
    const res = await window.api.invoke('reportes:cerrar_dia', { tasa })
    setCerrando(false)
    setShowConfirmCerrar(false)
    if (res.error) {
      setAlertMsg(res.error)
    } else {
      await loadHoy()
      await loadHistorial()
    }
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><LuChartColumn className="text-brand-400" /> Reportes</h1>
          <p className="text-sm text-gray-500 capitalize">{fechaHoyLabel} · Tasa: Bs. {Number(tasa).toFixed(2)}/$</p>
        </div>
        {activeTab === 'hoy' && hoy && (
          <button
            onClick={() => setShowConfirmCerrar(true)}
            disabled={cerrando}
            className={`flex items-center gap-2 ${hoy.cerrado ? 'btn-secondary' : 'btn-danger'}`}
          >
            {hoy.cerrado ? <><LuRefreshCw className={cerrando ? 'animate-spin' : ''} /> Actualizar Cierre</> : <><LuLock /> Cerrar Día</>}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="shrink-0 bg-surface-800 rounded-xl p-1 border border-white/5 mb-5 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
        <button
          onClick={() => setActiveTab('hoy')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'hoy' ? 'bg-brand-600 text-white shadow-glow' : 'text-gray-400 hover:text-white hover:bg-surface-700/50'}`}
        >
          <LuChartColumn /> Reporte del Día
        </button>
        <button
          onClick={() => { setActiveTab('historial'); loadHistorial() }}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'historial' ? 'bg-brand-600 text-white shadow-glow' : 'text-gray-400 hover:text-white hover:bg-surface-700/50'}`}
        >
          <LuCalendarClock /> Historial Cerrado
          {historial.length > 0 && <span className="bg-white/10 rounded-full px-2 text-xs">{historial.length}</span>}
        </button>
        <button
          onClick={() => { setActiveTab('inventario'); loadInventario() }}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'inventario' ? 'bg-brand-600 text-white shadow-glow' : 'text-gray-400 hover:text-white hover:bg-surface-700/50'}`}
        >
          <LuPackage /> Inventario
        </button>
        <button
          onClick={() => setActiveTab('ventas')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'ventas' ? 'bg-brand-600 text-white shadow-glow' : 'text-gray-400 hover:text-white hover:bg-surface-700/50'}`}
        >
          <LuListOrdered /> Todas las Ventas
        </button>
        </div>
      </div>

      {/* ── HOY TAB ── */}
      {activeTab === 'hoy' && (
        <div>
          {hoy?.cerrado && (
            <div className="flex items-center gap-2 bg-surface-700/50 border border-white/10 rounded-xl px-4 py-2.5 mb-4 text-sm text-gray-400">
              <LuCircleCheck className="text-accent-green" />
              <span>Último cierre guardado el <strong className="text-white">{hoy?.cerrado_en?.slice(0, 16)}</strong> con tasa Bs. {Number(hoy?.tasa_cierre).toFixed(2)}/$. Si llegaron ventas después, usa <strong className="text-white">Actualizar Cierre</strong>.</span>
            </div>
          )}
          {loading ? (
            <div className="card-p text-center py-12 text-gray-500">Cargando datos de hoy...</div>
          ) : hoy ? (
            <DayPanel data={hoy} fmt={fmt} tasa={tasa} isHistorical={false} />
          ) : null}
        </div>
      )}

      {/* ── HISTORIAL TAB ── */}
      {activeTab === 'historial' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">📅 Días Cerrados</h2>
            <span className="text-xs text-gray-500">{historial.length} registros</span>
          </div>

          {historial.length === 0 ? (
            <p className="text-gray-500 text-sm">Aún no hay días cerrados. Usa el botón "Cerrar Día" al finalizar la jornada.</p>
          ) : (
            <>
              <select
                className="select mb-5"
                value={selectedFecha}
                onChange={e => handleSelectFecha(e.target.value)}
              >
                <option value="">— Selecciona un día para ver su resumen —</option>
                {historial.map(h => (
                  <option key={h.fecha} value={h.fecha}>
                    {h.fecha} · ${Number(h.ingresos_usd).toFixed(2)} · Bs. {Number(h.ingresos_ves).toLocaleString('es-VE', { maximumFractionDigits: 2 })} · Tasa {Number(h.tasa_cierre).toFixed(2)} · {h.total_ventas} ventas
                  </option>
                ))}
              </select>

              {loadingDetalle && <p className="text-gray-500 text-sm py-4 text-center">Cargando detalle...</p>}
              {detalle && !loadingDetalle && (
                <div className="border-t border-white/5 pt-5">
                  <p className="text-xs text-gray-500 mb-4">
                    Cierre grabado el {detalle.cerrado_en?.slice(0, 16)} — Tasa de ese día: Bs. {Number(detalle.tasa_cierre).toFixed(2)}/$
                  </p>
                  <DayPanel data={detalle} fmt={fmt} tasa={tasa} isHistorical={true} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── INVENTARIO TAB ── */}
      {activeTab === 'inventario' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">📦 Estado del Inventario</h2>
            <button onClick={loadInventario} className="btn-secondary btn-sm">🔄 Recargar</button>
          </div>
          {loadingInv ? (
            <div className="card-p text-center py-12 text-gray-500">Analizando inventario...</div>
          ) : inventario ? (
            <InventarioPanel reporte={inventario} fmt={fmt} tasa={tasa} />
          ) : null}
        </div>
      )}

      {/* ── TODAS LAS VENTAS TAB ── */}
      {activeTab === 'ventas' && (
        <VentasHistorialPanel fmt={fmt} />
      )}

      {/* Confirm close day modal */}
      {showConfirmCerrar && (
        <ConfirmationModal
          title={hoy?.cerrado ? '¿Actualizar el cierre?' : '¿Cerrar el día?'}
          message={hoy?.cerrado
            ? `Se actualizará el resumen guardado de hoy (${fechaHoy}) incluyendo las ventas del último momento. Tasa: Bs. ${Number(tasa).toFixed(2)}/$`
            : `Se guardará el resumen de hoy (${fechaHoy}) con la tasa actual de Bs. ${Number(tasa).toFixed(2)}/$.`
          }
          type="warning"
          confirmText={cerrando ? '⏳ Guardando...' : (hoy?.cerrado ? '🔄 Actualizar' : '🔒 Cerrar Día')}
          cancelText="Cancelar"
          onConfirm={handleCerrarDia}
          onCancel={() => setShowConfirmCerrar(false)}
        />
      )}

      {alertMsg && (
        <AlertModal title="Error" message={alertMsg} onClose={() => setAlertMsg('')} />
      )}
    </div>
  )
}
