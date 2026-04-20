import React, { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { format } from 'date-fns'

const METODO_LABEL = { efectivo_usd: '$ Efectivo USD', efectivo_ves: 'Bs. Efectivo', pago_movil: 'Bs. Pago Móvil', transferencia: 'Bs. Transferencia' }

function ModificarDeudaModal({ venta, onClose, onSave }) {
  const { tasa } = useApp()
  const originalDeudaBs = venta.saldo_pendiente_usd * venta.tasa_cambio
  const [montoVes, setMontoVes] = useState(originalDeudaBs.toFixed(2))
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await window.api.invoke('cuentas:ajustar_deuda', {
        venta_id: venta.id, 
        nuevo_saldo_ves: parseFloat(montoVes) || 0, 
        nueva_tasa_cambio: tasa
      })
      onSave()
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">✏️ Modificar Deuda</h2>
          <button onClick={onClose} className="btn-ghost btn-sm">✕</button>
        </div>
        <p className="text-sm text-gray-400 mb-4">Ajustar manualmente el monto pendiente (en Bs) de esta deuda. La tasa de cambio asociada se actualizará a la tasa del día para fines contables.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Nuevo monto pendiente (Bs.)</label>
            <input className="input" type="number" min="0" step="0.01" required value={montoVes} onChange={e => setMontoVes(e.target.value)} />
            <p className="text-xs text-gray-500 mt-1">Equivalente estimado de hoy: ~${(parseFloat(montoVes) / tasa || 0).toFixed(2)} USD</p>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? '⏳...' : 'Guardar Cambio'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AbonoModal({ venta, onClose, onSave }) {
  const { tasa } = useApp()
  const [form, setForm] = useState({ metodo: 'efectivo_usd', monto_usd: '', monto_ves: '' })
  const [saving, setSaving] = useState(false)

  const handleMonto = (field, val) => {
    setForm(p => {
      const next = { ...p, [field]: val }
      // we round to 2 decimals to match the input's step requirement.
      if (field === 'monto_usd' && val) next.monto_ves = (parseFloat(val) * tasa).toFixed(2)
      if (field === 'monto_ves' && val) next.monto_usd = (parseFloat(val) / tasa).toFixed(2)
      return next
    })
  }

  const submit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await window.api.invoke('cuentas:abonar', {
        venta_id: venta.id, metodo: form.metodo,
        monto_usd: parseFloat(form.monto_usd) || 0,
        monto_ves: parseFloat(form.monto_ves) || 0, tasa,
      })
      onSave()
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">💰 Registrar Abono</h2>
          <button onClick={onClose} className="btn-ghost btn-sm">✕</button>
        </div>
        <div className="bg-surface-700 rounded-xl p-3 mb-4">
          <p className="text-sm text-gray-400">Cliente: <strong className="text-white">{venta.cliente_nombre}</strong></p>
          <p className="text-sm text-gray-400 mt-1">
            Deuda Fija: <strong className="text-red-400">Bs. {(venta.saldo_pendiente_usd * venta.tasa_cambio).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</strong>
            <span className="text-xs text-gray-500 ml-2">
              (Aprox. ~${((venta.saldo_pendiente_usd * venta.tasa_cambio) / tasa).toFixed(2)} USD)
            </span>
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div><label className="label">Método de Pago</label>
            <select className="select" value={form.metodo} onChange={e => setForm(p => ({ ...p, metodo: e.target.value }))}>
              {Object.entries(METODO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Monto USD</label>
              <input className="input" type="number" min="0.01" step="0.01" max={Number(venta.saldo_pendiente_usd).toFixed(2)} required value={form.monto_usd} onChange={e => handleMonto('monto_usd', e.target.value)} /></div>
            <div><label className="label">Monto Bs.</label>
              <input className="input" type="number" min="0" step="0.01" value={form.monto_ves} onChange={e => handleMonto('monto_ves', e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? '⏳...' : '✅ Registrar Abono'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DetalleModal({ ventaId, onClose, openModificar }) {
  const { fmt, tasa } = useApp()
  const [data, setData] = useState(null)
  const [inventoryPrices, setInventoryPrices] = useState({})

  useEffect(() => {
    window.api.invoke('cuentas:get', ventaId).then(async (res) => {
      setData(res)
      const prices = {}
      for (const d of res.detalles) {
        if (d.tipo === 'producto') {
          const p = await window.api.invoke('productos:get', d.ref_id)
          if (p) {
            const currentVes = p.moneda_precio === 'ves' ? p.precio_venta_ves : p.precio_venta_usd * tasa
            prices[d.id] = { currentVes }
          }
        }
      }
      setInventoryPrices(prices)
    })
  }, [ventaId, tasa])

  if (!data) return <div className="modal-backdrop"><div className="modal text-center py-10 text-gray-400">Cargando...</div></div>

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-lg">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">Venta #{data.id} — {data.cliente_nombre}</h2>
          <button onClick={onClose} className="btn-ghost btn-sm">✕</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-sm">
          <div className="bg-surface-700 rounded-xl p-3">
            <p className="text-gray-400 text-xs">Total Original</p>
            <p className="font-bold text-white">Bs. {(data.total_usd * data.tasa_cambio).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-gray-500 font-mono">{fmt(data.total_usd)} USD</p>
          </div>
          <div className="bg-surface-700 rounded-xl p-3">
            <p className="text-gray-400 text-xs">Pagado</p>
            <p className="font-bold text-accent-green">Bs. {((data.total_usd - data.saldo_pendiente_usd) * data.tasa_cambio).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-gray-500 font-mono">{fmt(data.total_usd - data.saldo_pendiente_usd)} USD</p>
          </div>
          <div className="bg-red-900/20 rounded-xl p-3 border border-red-500/30 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-xs">Pendiente Fijo (Bs)</p>
                <p className="font-bold text-red-400">Bs. {(data.saldo_pendiente_usd * data.tasa_cambio).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-gray-500 font-mono">~{fmt((data.saldo_pendiente_usd * data.tasa_cambio) / tasa)} USD (Estimado hoy)</p>
              </div>
            </div>
            <button onClick={() => { onClose(); openModificar(data); }} className="mt-2 w-full text-xs bg-surface-600 hover:bg-surface-500 text-white rounded py-1 transition-colors">✏️ Modificar Deuda</button>
          </div>
        </div>

        <h3 className="font-semibold text-white mb-2">Artículos</h3>
        <div className="table-wrapper mb-4 max-h-40 overflow-y-auto">
          <table><thead><tr><th>Descripción</th><th className="text-center">Cant</th><th className="text-right">P.Unit (Original)</th><th className="text-right">Subtotal (Original)</th></tr></thead>
            <tbody>{data.detalles?.map((d, i) => {
              const originalBs = d.precio_unitario_usd * data.tasa_cambio;
              const subtotalBs = d.subtotal_usd * data.tasa_cambio;
              const actual = inventoryPrices[d.id];
              const priceIncreased = actual && actual.currentVes > originalBs + 0.5;
              
              return (
                <tr key={i}>
                  <td>
                    <p>{d.nombre}</p>
                    {priceIncreased && <span className="text-[10px] text-accent-yellow bg-accent-yellow/10 px-1.5 py-0.5 rounded inline-flex items-center gap-1 w-max mt-1">⚠️ Precio en inventario subió a Bs. {actual.currentVes.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>}
                  </td>
                  <td className="text-center">{d.cantidad}</td>
                  <td className="text-right">
                    <p>Bs. {originalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-gray-500">{fmt(d.precio_unitario_usd)} USD</p>
                  </td>
                  <td className="text-right font-medium">Bs. {subtotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>

        <h3 className="font-semibold text-white mb-2">Historial de Pagos</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {[...(data.pagos || []), ...(data.abonos || [])].sort((a, b) => a.fecha > b.fecha ? 1 : -1).map((p, i) => (
            <div key={i} className="flex justify-between items-center text-sm bg-surface-700 rounded-lg px-3 py-2">
              <div>
                <span className="text-white block font-medium">{METODO_LABEL[p.metodo] || p.metodo}</span>
                <span className="text-gray-500 text-xs">{p.fecha?.slice(0, 16)}</span>
              </div>
              <div className="text-right">
                <span className="text-accent-green font-semibold block">{fmt(p.monto_usd)}</span>
                <span className="text-gray-400 text-[10px] font-mono">
                  Bs. {p.monto_ves ? Number(p.monto_ves).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : toVes(p.monto_usd).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-4"><button onClick={onClose} className="btn-secondary">Cerrar</button></div>
      </div>
    </div>
  )
}

export default function CuentasPorCobrar() {
  const { fmt, tasa } = useApp()
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const v = await window.api.invoke('cuentas:list')
    setVentas(v)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filteredVentas = ventas.filter(v => 
    (v.cliente_nombre || '').toLowerCase().includes(search.toLowerCase()) || 
    v.id.toString().includes(search)
  )
  const totalPendienteBs = filteredVentas.reduce((s, v) => s + (v.saldo_pendiente_usd * v.tasa_cambio), 0)
  const totalPendienteUsd = totalPendienteBs / tasa

  return (
    <div className="page">
      <div className="page-header flex-wrap gap-4 items-end">
        <div>
          <h1 className="page-title">📋 Cuentas por Cobrar</h1>
          <p className="text-sm text-gray-500">{filteredVentas.length} créditos activos {search ? 'encontrados' : ''}</p>
        </div>
        
        <div className="flex-1 min-w-[200px] max-w-sm">
          <input 
            type="text" 
            className="input" 
            placeholder="🔍 Buscar por cliente o folio..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="stat-card whitespace-nowrap">
          <p className="stat-label">Total Pendiente Fijo {search ? '(Filtrado)' : ''}</p>
          <p className="text-xl font-bold text-red-400">Bs. {totalPendienteBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-500">Estimado hoy: {fmt(totalPendienteUsd)} USD</p>
        </div>
      </div>

      <div className="card table-wrapper flex-1">
        <table>
          <thead><tr><th>#</th><th>Cliente</th><th>Fecha</th><th className="text-right">Total</th><th className="text-right">Pagado</th><th className="text-right">Saldo</th><th className="text-center">Acciones</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="text-center py-10 text-gray-500">Cargando...</td></tr>
              : filteredVentas.length === 0 ? <tr><td colSpan={7} className="text-center py-10 text-gray-500">🎉 No se encontraron cuentas pendientes</td></tr>
                : filteredVentas.map(v => {
                  const pagadoUsd = v.total_usd - v.saldo_pendiente_usd
                  const pct = ((pagadoUsd / v.total_usd) * 100).toFixed(0)
                  
                  const deudaBs = v.saldo_pendiente_usd * v.tasa_cambio
                  const totalBs = v.total_usd * v.tasa_cambio
                  const pagadoBs = pagadoUsd * v.tasa_cambio

                  return (
                    <tr key={v.id}>
                      <td className="font-mono text-brand-400">#{v.id}</td>
                      <td><p className="font-medium text-white">{v.cliente_nombre}</p><p className="text-xs text-gray-500">{v.fecha?.slice(0, 10)}</p></td>
                      <td className="text-gray-400 text-xs">{v.fecha?.slice(11, 16)}</td>
                      <td className="text-right text-gray-300">
                        <p>Bs. {totalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-gray-500 line-clamp-1">{fmt(v.total_usd)} USD (Original)</p>
                      </td>
                      <td className="text-right">
                        <div>
                          <span className="text-accent-green font-medium">Bs. {pagadoBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
                          <div className="w-full bg-surface-600 rounded-full h-1 mt-1"><div className="bg-accent-green h-1 rounded-full" style={{ width: `${pct}%` }} /></div>
                        </div>
                      </td>
                      <td className="text-right">
                        <p className="font-bold text-red-400">Bs. {deudaBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-gray-500 line-clamp-1">~{fmt(deudaBs / tasa)} USD (Estimado)</p>
                      </td>
                      <td>
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => { setSelected(v); setModal('detalle') }} className="btn-ghost btn-sm" title="Ver detalle">👁️</button>
                          <button onClick={() => { setSelected(v); setModal('abono') }} className="btn-primary btn-sm">+ Abono</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </div>

      {modal === 'abono' && selected && <AbonoModal venta={selected} onClose={() => setModal(null)} onSave={() => { setModal(null); load() }} />}
      {modal === 'detalle' && selected && <DetalleModal ventaId={selected.id} onClose={() => setModal(null)} openModificar={(v) => { setSelected(v); setModal('modificar') }} />}
      {modal === 'modificar' && selected && <ModificarDeudaModal venta={selected} onClose={() => setModal(null)} onSave={() => { setModal(null); load() }} />}
    </div>
  )
}
