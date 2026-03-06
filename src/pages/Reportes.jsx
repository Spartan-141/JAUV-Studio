import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { format, startOfMonth, endOfMonth } from 'date-fns'

const METODO_LABEL = { efectivo_usd:'$ Efectivo USD', efectivo_ves:'Bs. Efectivo', pago_movil:'Bs. Pago Móvil', transferencia:'Bs. Transferencia' }

export default function Reportes() {
  const { fmt, toVes, tasa } = useApp()
  const [desde, setDesde] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [hasta, setHasta] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [data, setData] = useState(null)
  const [cierre, setCierre] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('resumen')

  const load = async () => {
    setLoading(true)
    const [res, c] = await Promise.all([
      window.api.invoke('reportes:resumen', { fecha_desde: desde, fecha_hasta: hasta }),
      window.api.invoke('reportes:cierre_caja', hasta),
    ])
    setData(res)
    setCierre(c)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const printReporte = () => window.print()

  const Estado = ({ label, value, sub, color = 'brand-500' }) => (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className={`text-2xl font-bold text-white`}>{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  )

  const allPago = (data?.pagos || []).reduce((acc, p) => {
    acc[p.metodo] = (acc[p.metodo] || { usd: 0, ves: 0 })
    acc[p.metodo].usd += p.total_usd || 0
    acc[p.metodo].ves += p.total_ves || 0
    return acc
  }, {})

  const allAbono = (data?.abonos || []).reduce((acc, a) => {
    acc[a.metodo] = (acc[a.metodo] || { usd: 0, ves: 0 })
    acc[a.metodo].usd += a.total_usd || 0
    acc[a.metodo].ves += a.total_ves || 0
    return acc
  }, {})

  const totalCaja = Object.values(allPago).reduce((s, v) => s + v.usd, 0)
            + Object.values(allAbono).reduce((s, v) => s + v.usd, 0)

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">📊 Reportes</h1><p className="text-sm text-gray-500">Análisis de ventas y caja</p></div>
        <div className="flex gap-2 items-center">
          <input type="date" className="input w-40" value={desde} onChange={e=>setDesde(e.target.value)} />
          <span className="text-gray-500">→</span>
          <input type="date" className="input w-40" value={hasta} onChange={e=>setHasta(e.target.value)} />
          <button onClick={load} disabled={loading} className="btn-primary">{loading?'⏳':'🔄 Generar'}</button>
          <button onClick={printReporte} className="btn-secondary no-print">🖨️ Imprimir</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-800 rounded-xl p-1 w-fit border border-white/5">
        {[['resumen','📈 Resumen'],['caja','💰 Cierre de Caja'],['ventas','🧾 Lista Ventas']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab===t?'bg-brand-600 text-white':'text-gray-400 hover:text-white'}`}>
            {l}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="card-p text-center text-gray-500 py-12">Haz clic en "Generar" para ver los datos</div>
      ) : tab === 'resumen' ? (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Estado label="N° Ventas" value={data.ventas?.total_ventas || 0} sub={`${desde} → ${hasta}`} />
            <Estado label="Ingresos Brutos" value={fmt(data.ventas?.ingresos_brutos_usd)} sub={`Bs. ${toVes(data.ventas?.ingresos_brutos_usd).toLocaleString('es-VE',{maximumFractionDigits:2})}`} />
            <Estado label="Ganancia Neta" value={fmt(data.ganancia_neta_usd)} sub="Margen s/desc." />
            <Estado label="Descuentos" value={fmt(data.ventas?.total_descuentos_usd)} sub="Total otorgados" />
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-white mb-4">Ingresos por Método de Pago</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(METODO_LABEL).map(([key, label]) => {
                const v = allPago[key] || { usd:0, ves:0 }
                const a = allAbono[key] || { usd:0, ves:0 }
                const total = v.usd + a.usd
                const totalVes = v.ves + a.ves
                return (
                  <div key={key} className="bg-surface-700 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">{label}</p>
                    <p className="text-lg font-bold text-white">{fmt(total)}</p>
                    {totalVes > 0 && <p className="text-xs text-gray-500">Bs. {totalVes.toLocaleString('es-VE',{maximumFractionDigits:2})}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      ) : tab === 'caja' ? (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">💰 Cierre de Caja — {hasta}</h2>
            <div className="text-right">
              <p className="text-xs text-gray-400">Total en caja</p>
              <p className="text-2xl font-bold text-accent-green">{fmt(totalCaja)}</p>
            </div>
          </div>
          <div className="overflow-auto rounded-xl border border-white/5">
            <table className="w-full text-sm">
              <thead><tr><th>Método</th><th className="text-right">Ventas (USD)</th><th className="text-right">Abonos (USD)</th><th className="text-right">Total USD</th><th className="text-right">Total Bs.</th></tr></thead>
              <tbody>
                {Object.entries(METODO_LABEL).map(([key,label]) => {
                  const v = allPago[key] || { usd:0, ves:0 }
                  const a = allAbono[key] || { usd:0, ves:0 }
                  const total = v.usd + a.usd
                  const totalVes = v.ves + a.ves
                  return (
                    <tr key={key}>
                      <td className="font-medium text-white">{label}</td>
                      <td className="text-right text-gray-300">{fmt(v.usd)}</td>
                      <td className="text-right text-gray-300">{fmt(a.usd)}</td>
                      <td className="text-right font-bold text-white">{fmt(total)}</td>
                      <td className="text-right text-gray-400 text-xs">Bs. {totalVes > 0 ? totalVes.toLocaleString('es-VE',{maximumFractionDigits:2}) : (total*tasa).toLocaleString('es-VE',{maximumFractionDigits:2})}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-white/20">
                  <td className="font-bold text-white py-3">TOTAL</td>
                  <td className="text-right font-bold text-white">{fmt(Object.values(allPago).reduce((s,v)=>s+v.usd,0))}</td>
                  <td className="text-right font-bold text-white">{fmt(Object.values(allAbono).reduce((s,v)=>s+v.usd,0))}</td>
                  <td className="text-right text-xl font-bold text-accent-green">{fmt(totalCaja)}</td>
                  <td className="text-right text-accent-green font-bold text-sm">Bs. {toVes(totalCaja).toLocaleString('es-VE',{maximumFractionDigits:2})}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="card table-wrapper flex-1">
          <table>
            <thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Estado</th><th className="text-right">Total</th><th className="text-right">Descuento</th><th className="text-right">Pendiente</th></tr></thead>
            <tbody>
              {data.lista_ventas?.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-500">Sin ventas en el período</td></tr>
              ) : data.lista_ventas?.map(v => (
                <tr key={v.id}>
                  <td className="font-mono text-brand-400">#{v.id}</td>
                  <td className="text-xs text-gray-400">{v.fecha?.slice(0,16)}</td>
                  <td className="text-gray-300">{v.cliente_nombre || '—'}</td>
                  <td><span className={v.estado==='pagada'?'badge-green':'badge-yellow'}>{v.estado}</span></td>
                  <td className="text-right font-semibold text-white">{fmt(v.total_usd)}</td>
                  <td className="text-right text-gray-400">{v.descuento_otorgado_usd>0 ? fmt(v.descuento_otorgado_usd) : '—'}</td>
                  <td className="text-right">{v.saldo_pendiente_usd>0 ? <span className="text-red-400 font-semibold">{fmt(v.saldo_pendiente_usd)}</span> : <span className="text-accent-green">✓</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
