import React, { useState, useEffect, useCallback } from 'react'
import {
  LuTrendingUp, LuBanknote, LuSmartphone, LuLandmark,
  LuCreditCard, LuRefreshCw, LuEye,
  LuChartColumn, LuChevronLeft, LuChevronRight, LuDownload,
  LuSearch, LuX, LuCalendar, LuList, LuShoppingCart, LuTrendingDown,
  LuClock, LuCheck, LuTriangleAlert
} from 'react-icons/lu'
import { useApp } from '../context/AppContext.jsx'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const METODO_LABEL = {
  efectivo_ves: <><LuBanknote className="inline mb-1" /> Bs. Efectivo</>,
  pago_movil:   <><LuSmartphone className="inline mb-1" /> Pago Móvil</>,
  transferencia:<><LuLandmark className="inline mb-1" /> Transferencia</>,
}

const METODO_LABEL_STR = {
  efectivo_ves: 'Bs. Efectivo',
  pago_movil:   'Pago Móvil',
  transferencia:'Transferencia',
}

const calcularPagado = (v) => {
  if (v.pagos?.length || v.abonos?.length) {
    return [...(v.pagos || []), ...(v.abonos || [])].reduce((acc, p) => acc + Number(p.monto || p.monto_ves || 0), 0)
  }
  return (v.total || 0) - (v.saldo_pendiente || 0)
}

// ── Componentes base ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub, red, green, icon }) {
  return (
    <div className="stat-card flex flex-col justify-center">
      <p className="stat-label truncate flex items-center gap-1.5">
        {icon && <span style={{ color: 'var(--fg-subtle)' }}>{icon}</span>}
        {label}
      </p>
      <p className={`text-xl sm:text-2xl font-bold ${red ? 'text-red-400' : green ? 'text-accent-green' : ''}`}
        style={!red && !green ? { color: 'var(--fg)' } : {}}>{value}</p>
      {sub && <p className="text-[10px] sm:text-xs mt-1 truncate" style={{ color: 'var(--fg-subtle)' }}>{sub}</p>}
    </div>
  )
}

function MetodosTable({ pagos }) {
  return (
    <div className="card p-4 sm:p-5">
      <h2 className="font-semibold mb-3 text-sm sm:text-base flex items-center gap-2"
        style={{ color: 'var(--fg)' }}><LuCreditCard className="text-accent-green" /> Ingresos por Método de Pago</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.entries(METODO_LABEL).map(([key, label]) => {
          const pb = pagos?.find(p => p.metodo === key)
          const total = pb ? pb.total_ves : 0
          return (
            <div key={key} className="rounded-xl p-3 sm:p-4" style={{ backgroundColor: 'var(--surface-700)' }}>
              <p className="text-xs mb-1 leading-none" style={{ color: 'var(--fg-muted)' }}>{label}</p>
              <p className="text-base sm:text-lg font-bold leading-none mt-2" style={{ color: 'var(--fg)' }}>Bs. {Number(total).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Modal detalle de una venta ────────────────────────────────────────────────

function VentaDetailModal({ v, fmt, onClose }) {
  const pagado = calcularPagado(v)

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-lg" style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-5 shrink-0">
          <div>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--fg-subtle)' }}>Detalle de Venta</p>
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
              <span className="font-mono text-brand-400">#{v.id}</span>
              <span className={v.estado === 'pagada' ? 'badge-green' : 'badge-yellow'}>{v.estado}</span>
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--fg-subtle)' }}>{v.fecha?.slice(0, 16)} &middot; {v.cliente_nombre || 'Sin cliente'}</p>
          </div>
          <button onClick={onClose} className="btn-ghost btn-sm text-xl p-2" style={{ color: 'var(--fg-muted)' }}>✕</button>
        </div>

        {/* Resumen financiero */}
        <div className="grid grid-cols-3 gap-3 mb-5 shrink-0">
          <div className="border rounded-xl p-3" style={{ backgroundColor: 'var(--surface-700)', borderColor: 'var(--border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--fg-muted)' }}>Total Factura</p>
            <p className="text-lg font-bold" style={{ color: 'var(--fg)' }}>{fmt(v.total)}</p>
          </div>
          <div className="border border-accent-green/20 rounded-xl p-3" style={{ backgroundColor: 'var(--surface-700)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--fg-muted)' }}>Cobrado</p>
            <p className="text-lg font-bold text-accent-green">{fmt(pagado)}</p>
          </div>
          <div className="border border-red-500/20 rounded-xl p-3" style={{ backgroundColor: 'var(--surface-700)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--fg-muted)' }}>Pendiente</p>
            <p className={`text-lg font-bold ${v.saldo_pendiente > 0 ? 'text-red-400' : ''}`}
              style={v.saldo_pendiente <= 0 ? { color: 'var(--fg-subtle)' } : {}}>
              {v.saldo_pendiente > 0 ? fmt(v.saldo_pendiente) : '—'}
            </p>
          </div>
        </div>

        {/* Ítems */}
        <div className="overflow-y-auto flex-1 space-y-3">
          <div className="card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left">Artículo</th>
                  <th className="text-center">Cant.</th>
                  <th className="text-right">P. Unit</th>
                  <th className="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(v.detalles || []).map((d, i) => (
                  <tr key={i}>
                    <td>{d.nombre}</td>
                    <td className="text-center" style={{ color: 'var(--fg-muted)' }}>{d.cantidad}</td>
                    <td className="text-right" style={{ color: 'var(--fg-muted)' }}>{fmt(d.precio_unitario)}</td>
                    <td className="text-right font-semibold" style={{ color: 'var(--fg)' }}>{fmt(d.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Registro de pagos */}
          {([...(v.pagos || []), ...(v.abonos || [])]).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-subtle)' }}>Registro de Pagos</p>
              <div className="space-y-2">
                {[...(v.pagos || []), ...(v.abonos || [])].map((p, i) => (
                  <div key={i} className="flex justify-between items-center border px-4 py-2.5 rounded-xl"
                    style={{ backgroundColor: 'var(--surface-700)', borderColor: 'var(--border)' }}>
                    <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-dim)' }}>
                      {METODO_LABEL[p.metodo] || p.metodo}
                      <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{p.fecha?.slice(0, 16)}</span>
                    </span>
                    <span className="text-accent-green font-bold">{fmt(p.monto)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4 shrink-0">
          <button onClick={onClose} className="btn-secondary">Cerrar</button>
        </div>
      </div>
    </div>
  )
}

function VentaRow({ v, fmt }) {
  const [showDetail, setShowDetail] = useState(false)
  const pagado = calcularPagado(v)

  return (
    <>
      <tr className="hover:bg-surface-700/30 transition-colors">
        <td className="font-mono text-brand-400 text-xs sm:text-sm">#{v.id}</td>
        <td className="text-xs whitespace-nowrap" style={{ color: 'var(--fg-muted)' }}>{v.fecha?.slice(0, 16)}</td>
        <td className="truncate max-w-[120px] sm:max-w-none">{v.cliente_nombre || '—'}</td>
        <td><span className={v.estado === 'pagada' ? 'badge-green' : 'badge-yellow'}>{v.estado}</span></td>
        <td className="text-right font-semibold" style={{ color: 'var(--fg)' }}>{fmt(v.total)}</td>
        <td className="text-right text-accent-green hidden sm:table-cell">{fmt(pagado)}</td>
        <td className="text-right hidden sm:table-cell">{v.saldo_pendiente > 0
          ? <span className="text-red-400">{fmt(v.saldo_pendiente)}</span>
          : <span style={{ color: 'var(--fg-subtle)' }}>—</span>}
        </td>
        <td className="text-center">
          <button
            onClick={() => setShowDetail(true)}
            className="p-1.5 rounded-lg transition-colors hover:text-brand-400 hover:bg-brand-500/10"
            style={{ color: 'var(--fg-subtle)' }}
            title="Ver detalle"
          >
            <LuEye size={15} />
          </button>
        </td>
      </tr>
      {showDetail && <VentaDetailModal v={v} fmt={fmt} onClose={() => setShowDetail(false)} />}
    </>
  )
}

// ── Calendario de Ventas ─────────────────────────────────────────────────────

function DayDetailModal({ fecha, onClose, fmt }) {
  const [ventas, setVentas] = useState([])
  const [resumen, setResumen] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    window.api.invoke('ventas:paginated', { page: 1, perPage: 100, fechaDesde: fecha, fechaHasta: fecha })
      .then(data => { setVentas(data.ventas || []); setResumen(data.resumen || {}) })
      .finally(() => setLoading(false))
  }, [fecha])

  const fechaDisplay = format(parseISO(fecha), "EEEE d 'de' MMMM yyyy", { locale: es })
  const totalIngresos = resumen.ingresos || 0
  const totalPendiente = resumen.pendiente_cobrar || 0
  const cobrado = totalIngresos - totalPendiente

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-lg" style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold capitalize" style={{ color: 'var(--fg)' }}>{fechaDisplay}</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--fg-subtle)' }}>{ventas.length} venta{ventas.length !== 1 ? 's' : ''} registrada{ventas.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="btn-ghost btn-sm text-xl" style={{ color: 'var(--fg-muted)' }}>✕</button>
        </div>

        {/* Resumen del día */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3 mb-4 shrink-0">
            <div className="border border-accent-green/20 rounded-xl p-3" style={{ backgroundColor: 'var(--surface-700)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--fg-muted)' }}>Ingreso Bruto</p>
              <p className="text-lg font-bold text-accent-green">{fmt(totalIngresos)}</p>
            </div>
            <div className="border border-brand-500/20 rounded-xl p-3" style={{ backgroundColor: 'var(--surface-700)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--fg-muted)' }}>Cobrado</p>
              <p className="text-lg font-bold text-brand-300">{fmt(cobrado)}</p>
            </div>
            <div className="border border-red-500/20 rounded-xl p-3" style={{ backgroundColor: 'var(--surface-700)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--fg-muted)' }}>Por Cobrar</p>
              <p className={`text-lg font-bold ${totalPendiente > 0 ? 'text-red-400' : ''}`}
                style={totalPendiente <= 0 ? { color: 'var(--fg-subtle)' } : {}}>{fmt(totalPendiente)}</p>
            </div>
          </div>
        )}

        {/* Table of ventas */}
        <div className="overflow-y-auto flex-1 card table-wrapper">
          {loading ? (
            <div className="flex items-center justify-center py-16" style={{ color: 'var(--fg-subtle)' }}>
              <LuRefreshCw className="animate-spin mr-2" /> Cargando ventas...
            </div>
          ) : ventas.length === 0 ? (
            <p className="text-center py-16" style={{ color: 'var(--fg-subtle)' }}>No hay ventas para esta fecha</p>
          ) : (
            <table className="w-full">
              <thead><tr>
                <th>#</th><th>Hora</th><th>Cliente</th><th>Estado</th>
                <th className="text-right">Total</th><th className="text-right hidden sm:table-cell">Cobrado</th>
                <th className="text-right hidden sm:table-cell">Pendiente</th><th></th>
              </tr></thead>
              <tbody>
                {ventas.map(v => <VentaRow key={v.id} v={v} fmt={fmt} />)}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end mt-4 shrink-0">
          <button onClick={onClose} className="btn-secondary">Cerrar</button>
        </div>
      </div>
    </div>
  )
}

function CalendarioVentas({ fmt }) {
  const today = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [calData, setCalData] = useState([])
  const [loadingCal, setLoadingCal] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth() + 1

  const loadCalendario = useCallback(async () => {
    setLoadingCal(true)
    try {
      const data = await window.api.invoke('ventas:calendario', { year, month })
      setCalData(data || [])
    } catch(e) { setCalData([]) }
    finally { setLoadingCal(false) }
  }, [year, month])

  useEffect(() => { loadCalendario() }, [loadCalendario])

  // Build calendar grid
  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = []
  let cur = calStart
  while (cur <= calEnd) { days.push(cur); cur = addDays(cur, 1) }

  const dataMap = {}
  calData.forEach(d => { dataMap[d.fecha] = d })

  // Stats for current view
  const totalMes = calData.reduce((s, d) => s + d.ingresos, 0)
  const totalVentasMes = calData.reduce((s, d) => s + d.total_ventas, 0)
  const diasConVentas = calData.filter(d => d.total_ventas > 0).length
  const mejorDia = calData.length > 0 ? calData.reduce((best, d) => d.ingresos > best.ingresos ? d : best, calData[0]) : null

  const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div className="space-y-4">
      {/* Monthly header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card">
          <p className="stat-label flex items-center gap-1.5"><LuShoppingCart className="text-brand-400" /> Total Ventas</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{totalVentasMes}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--fg-subtle)' }}>en {diasConVentas} días activos</p>
        </div>
        <div className="stat-card">
          <p className="stat-label flex items-center gap-1.5"><LuTrendingUp className="text-accent-green" /> Ingreso del Mes</p>
          <p className="text-xl font-bold text-accent-green">{fmt(totalMes)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label flex items-center gap-1.5"><LuCalendar className="text-brand-400" /> Promedio/Día</p>
          <p className="text-xl font-bold" style={{ color: 'var(--fg)' }}>{fmt(diasConVentas > 0 ? totalMes / diasConVentas : 0)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label flex items-center gap-1.5"><LuTrendingUp className="text-accent-yellow" /> Mejor Día</p>
          {mejorDia ? (
            <>
              <p className="text-lg font-bold text-accent-yellow">{fmt(mejorDia.ingresos)}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--fg-subtle)' }}>{mejorDia.fecha}</p>
            </>
          ) : <p className="text-sm" style={{ color: 'var(--fg-subtle)' }}>Sin datos</p>}
        </div>
      </div>

      {/* Calendar card */}
      <div className="card p-4 sm:p-5">
        {/* Nav header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="btn-ghost btn-sm p-2 rounded-lg hover:bg-surface-700" style={{ color: 'var(--fg-muted)' }}><LuChevronLeft /></button>
            <div>
              <h2 className="text-base sm:text-lg font-bold capitalize" style={{ color: 'var(--fg)' }}>
                {format(viewDate, 'MMMM yyyy', { locale: es })}
              </h2>
            </div>
            <button onClick={nextMonth} className="btn-ghost btn-sm p-2 rounded-lg hover:bg-surface-700" style={{ color: 'var(--fg-muted)' }}><LuChevronRight /></button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))}
              className="btn-secondary btn-sm text-xs">Hoy</button>
            <button onClick={loadCalendario} className="btn-ghost btn-sm p-2 rounded-lg hover:bg-surface-700" style={{ color: 'var(--fg-muted)' }}>
              <LuRefreshCw className={loadingCal ? 'animate-spin text-brand-400' : ''} size={14} />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider py-2"
              style={{ color: 'var(--fg-subtle)' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className={`grid grid-cols-7 gap-1 sm:gap-1.5 transition-opacity duration-200 ${loadingCal ? 'opacity-50' : ''}`}>
          {days.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayData = dataMap[dateStr]
            const isCurrentMonth = isSameMonth(day, viewDate)
            const isCurrentDay = isToday(day)
            const hasData = !!dayData && dayData.total_ventas > 0
            const hasCreditos = dayData?.creditos > 0

            // Intensity mapping: heat color based on ingresos vs max
            const maxIngresos = calData.length > 0 ? Math.max(...calData.map(d => d.ingresos)) : 0
            const intensity = hasData && maxIngresos > 0 ? dayData.ingresos / maxIngresos : 0
            const getHeatColor = (i) => {
              if (i === 0) return ''
              if (i < 0.2) return 'ring-1 ring-brand-500/20 bg-brand-900/20'
              if (i < 0.4) return 'ring-1 ring-brand-500/30 bg-brand-900/30'
              if (i < 0.6) return 'ring-1 ring-brand-500/50 bg-brand-800/40'
              if (i < 0.8) return 'ring-1 ring-brand-400/60 bg-brand-700/40'
              return 'ring-2 ring-brand-400/80 bg-brand-600/30'
            }

            return (
              <div
                key={idx}
                onClick={() => isCurrentMonth && setSelectedDay(dateStr)}
                className={`
                  relative flex flex-col rounded-xl p-1.5 sm:p-2 min-h-[52px] sm:min-h-[72px] transition-all duration-150
                  ${isCurrentMonth ? 'cursor-pointer hover:scale-[1.02]' : 'opacity-25 cursor-default'}
                  ${isCurrentDay ? 'ring-2 ring-brand-500 bg-brand-900/20' : hasData ? getHeatColor(intensity) : 'hover:bg-surface-700/50'}
                `}
                style={(!isCurrentDay && !hasData) ? { backgroundColor: 'var(--surface-700-alt)' } : {}}
              >
                {/* Day number */}
                <span className={`text-[11px] sm:text-xs font-bold self-end mb-auto`}
                  style={{ color: isCurrentDay ? 'var(--brand-400)' : isCurrentMonth ? 'var(--fg-dim)' : 'var(--fg-subtle)' }}>
                  {format(day, 'd')}
                </span>

                {/* Indicators */}
                {hasData && (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[9px] sm:text-[10px] font-bold text-brand-300 leading-none">
                      {dayData.total_ventas} venta{dayData.total_ventas !== 1 ? 's' : ''}
                    </p>
                    <p className="text-[8px] sm:text-[10px] text-accent-green font-semibold leading-none hidden sm:block">
                      {fmt(dayData.ingresos)}
                    </p>
                    <p className="text-[8px] sm:text-[10px] text-accent-green font-semibold leading-none sm:hidden">
                      {dayData.ingresos >= 1000 ? `${(dayData.ingresos/1000).toFixed(1)}k` : dayData.ingresos.toFixed(0)}
                    </p>
                    {hasCreditos && (
                      <div className="flex items-center gap-0.5">
                        <LuTriangleAlert size={8} className="text-accent-yellow shrink-0" />
                        <span className="text-[8px] text-accent-yellow hidden sm:inline">{dayData.creditos} crédito{dayData.creditos !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Today dot */}
                {isCurrentDay && (
                  <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-brand-400" />
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--fg-subtle)' }}>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded ring-1" style={{ backgroundColor: 'var(--surface-700-alt)', borderColor: 'var(--border)' }} /> Sin ventas</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-brand-900/30 ring-1 ring-brand-500/40" /> Ventas registradas</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-brand-600/30 ring-2 ring-brand-400/80" /> Día con mayor ingreso</div>
          <div className="flex items-center gap-1.5"><LuTriangleAlert size={12} className="text-accent-yellow" /> Créditos activos</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-brand-900/20 ring-2 ring-brand-500" /> Hoy</div>
        </div>
      </div>

      {/* Day detail modal */}
      {selectedDay && (
        <DayDetailModal fecha={selectedDay} onClose={() => setSelectedDay(null)} fmt={fmt} />
      )}
    </div>
  )
}

// ── Main Reportes page ────────────────────────────────────────────────────────

export default function Reportes() {
  const { fmt } = useApp()
  const [tab, setTab]     = useState('historial')  // 'historial' | 'calendario'
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

  useEffect(() => { if (tab === 'historial') load(1) }, [mode, day, month, desde, hasta, estado])

  const handleSearchClient = (e) => { e.preventDefault(); load(1) }

  const exportAsCsv = () => {
    if (!data.ventas.length) return
    const headers = ['ID', 'Fecha', 'Cliente', 'Estado', 'Total', 'Cobrado', 'Pendiente']
    const rows = data.ventas.map(v => {
      const cobrado = calcularPagado(v)
      return [v.id, v.fecha, `"${v.cliente_nombre || ''}"`, v.estado, v.total, cobrado, v.saldo_pendiente].join(',')
    })
    const csvContent = headers.join(',') + '\n' + rows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.setAttribute('download', `reporte_ventas_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`)
    a.click()
  }

  const resumen = data.resumen || {}

  return (
    <div className="page pb-10">
      <div className="page-header items-start sm:items-center mb-2">
        <div>
          <h1 className="page-title flex items-center gap-2"><LuChartColumn className="text-brand-400" /> Reportes</h1>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Métricas dinámicas y reportes consolidados</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Tab selector */}
          <div className="flex p-1 rounded-xl border shadow-inner" style={{ backgroundColor: 'var(--surface-800)', borderColor: 'var(--border)' }}>
            <button
              onClick={() => setTab('historial')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === 'historial' ? 'bg-brand-600 text-white shadow-md' : 'hover:text-white hover:bg-surface-700'}`}
              style={tab !== 'historial' ? { color: 'var(--fg-muted)' } : {}}
            >
              <LuList size={14} /> Historial
            </button>
            <button
              onClick={() => setTab('calendario')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === 'calendario' ? 'bg-brand-600 text-white shadow-md' : 'hover:text-white hover:bg-surface-700'}`}
              style={tab !== 'calendario' ? { color: 'var(--fg-muted)' } : {}}
            >
              <LuCalendar size={14} /> Calendario
            </button>
          </div>

          {tab === 'historial' && (
            <button onClick={exportAsCsv} className="btn-secondary btn-sm flex items-center gap-2 shrink-0">
              <LuDownload /> <span className="hidden lg:inline">Exportar CSV</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">

        {/* ── CALENDARIO TAB ── */}
        {tab === 'calendario' && <CalendarioVentas fmt={fmt} />}

        {/* ── HISTORIAL TAB ── */}
        {tab === 'historial' && (
          <>
            {/* FILTERS CARD */}
            <div className="card p-4 flex flex-wrap gap-3 sm:gap-4 items-end backdrop-blur-sm border border-brand-500/10">
              <div className="flex rounded-lg overflow-hidden border text-sm shrink-0 shadow-sm" style={{ borderColor: 'var(--border)' }}>
                {[['day','Día'],['month','Mes'],['range','Rango']].map(([k, label]) => (
                  <button key={k} onClick={() => { setMode(k); setPage(1) }}
                    className={`px-4 py-2 transition-colors ${mode === k ? 'bg-brand-600 text-white font-medium' : 'hover:text-white hover:bg-surface-700'}`}
                    style={mode !== k ? { backgroundColor: 'var(--surface-700)', color: 'var(--fg-muted)' } : {}}>
                    {label}
                  </button>
                ))}
              </div>
              {mode === 'day' && <input type="date" className="input w-40 sm:w-44 border-white/5 focus:border-brand-500/50" value={day} onChange={e => { setDay(e.target.value); setPage(1) }} style={{ backgroundColor: 'var(--surface-900)' }} />}
              {mode === 'month' && <input type="month" className="input w-40 sm:w-44 border-white/5 focus:border-brand-500/50" value={month} onChange={e => { setMonth(e.target.value); setPage(1) }} style={{ backgroundColor: 'var(--surface-900)' }} />}
              {mode === 'range' && (
                <div className="flex gap-2">
                  <div className="flex flex-col gap-1"><span className="text-[10px] uppercase tracking-wider font-semibold ml-1" style={{ color: 'var(--fg-subtle)' }}>Desde</span><input type="date" className="input w-36 sm:w-40" style={{ backgroundColor: 'var(--surface-900)' }} value={desde} onChange={e => { setDesde(e.target.value); setPage(1) }} /></div>
                  <div className="flex flex-col gap-1"><span className="text-[10px] uppercase tracking-wider font-semibold ml-1" style={{ color: 'var(--fg-subtle)' }}>Hasta</span><input type="date" className="input w-36 sm:w-40" style={{ backgroundColor: 'var(--surface-900)' }} value={hasta} onChange={e => { setHasta(e.target.value); setPage(1) }} /></div>
                </div>
              )}
              <div className="h-8 w-px bg-white/5 hidden xl:block mx-1" style={{ backgroundColor: 'var(--border)' }}></div>
              <div className="flex flex-wrap gap-3 sm:gap-4 items-end flex-grow">
                <select className="select w-40 border-white/5 focus:border-brand-500/50" value={estado} onChange={e => { setEstado(e.target.value); setPage(1) }} style={{ backgroundColor: 'var(--surface-900)' }}>
                  <option value="">Cualquier estado</option>
                  <option value="pagada">Ver Pagadas</option>
                  <option value="credito">Ver Por Cobrar</option>
                </select>
                <form onSubmit={handleSearchClient} className="flex relative items-center max-w-xs flex-grow">
                  <LuSearch className="absolute left-3" style={{ color: 'var(--fg-subtle)' }} />
                  <input type="text" className="input pl-9 pr-8 border-white/5 focus:border-brand-500/50 shadow-inner" style={{ backgroundColor: 'var(--surface-900)' }} placeholder="Buscar por cliente..." value={cliente} onChange={e => setCliente(e.target.value)} />
                  {cliente && <button type="button" onClick={() => { setCliente(''); setTimeout(() => load(1), 0) }} className="absolute right-2 hover:text-white p-1 rounded-md" style={{ backgroundColor: 'var(--surface-800)', color: 'var(--fg-muted)' }}><LuX size={14}/></button>}
                </form>
                <button onClick={() => load(1)} className="btn-secondary btn-sm ml-auto flex items-center gap-2 border hover:border-white/20" style={{ borderColor: 'var(--border)' }}>
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
                        : data.ventas.map(v => <VentaRow key={v.id} v={v} fmt={fmt} />)}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION */}
                {data.pages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-5 gap-4">
                    <span className="text-xs px-3 py-1.5 rounded-lg border" style={{ color: 'var(--fg-muted)', backgroundColor: 'var(--surface-800)', borderColor: 'var(--border)' }}>Página <strong style={{ color: 'var(--fg)' }}>{data.page}</strong> de <strong style={{ color: 'var(--fg)' }}>{data.pages}</strong> · {data.total} facturas</span>
                    <div className="flex gap-1.5 p-1 rounded-xl border shadow-inner" style={{ backgroundColor: 'var(--surface-800)', borderColor: 'var(--border)' }}>
                      <button onClick={() => load(1)} disabled={page === 1} className="btn-ghost btn-sm h-8 w-8 p-0 flex items-center justify-center rounded-lg" title="Primera">«</button>
                      <button onClick={() => load(page - 1)} disabled={page === 1} className="btn-ghost btn-sm h-8 w-8 p-0 flex items-center justify-center rounded-lg"><LuChevronLeft /></button>
                      {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
                        const start = Math.max(1, Math.min(page - 2, data.pages - 4))
                        const p = start + i
                        if (p > data.pages) return null
                        return <button key={p} onClick={() => load(p)} className={`btn-sm h-8 min-w-[32px] p-0 flex items-center justify-center rounded-lg text-sm transition-colors ${p === page ? 'bg-brand-600 text-white shadow-md' : 'hover:bg-surface-700'}`}
                          style={p !== page ? { color: 'var(--fg-muted)' } : {}}>{p}</button>
                      })}
                      <button onClick={() => load(page + 1)} disabled={page === data.pages} className="btn-ghost btn-sm h-8 w-8 p-0 flex items-center justify-center rounded-lg"><LuChevronRight /></button>
                      <button onClick={() => load(data.pages)} disabled={page === data.pages} className="btn-ghost btn-sm h-8 w-8 p-0 flex items-center justify-center rounded-lg" title="Última">»</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
