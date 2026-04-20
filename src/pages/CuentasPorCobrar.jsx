import React, { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { format } from 'date-fns'

const METODO_LABEL = {
  efectivo_ves: 'Bs. Efectivo',
  pago_movil: 'Bs. Pago Móvil',
  transferencia: 'Bs. Transferencia',
}

function ModificarDeudaModal({ venta, onClose, onSave }) {
  const [montoVes, setMontoVes] = useState(Number(venta.saldo_pendiente || 0).toFixed(2))
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await window.api.invoke('cuentas:ajustar_deuda', {
        venta_id: venta.id,
        nuevo_saldo: parseFloat(montoVes) || 0,
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
        <p className="text-sm text-gray-400 mb-4">Ajustar manualmente el monto pendiente (en Bs.) de esta deuda.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Nuevo monto pendiente (Bs.)</label>
            <input className="input" type="number" min="0" step="0.01" required value={montoVes} onChange={e => setMontoVes(e.target.value)} />
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
  const { fmt } = useApp()
  const [form, setForm] = useState({ metodo: 'efectivo_ves', monto: '' })
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await window.api.invoke('cuentas:abonar', {
        venta_id: venta.id,
        metodo: form.metodo,
        monto: parseFloat(form.monto) || 0,
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
            Saldo Pendiente: <strong className="text-red-400">{fmt(venta.saldo_pendiente)}</strong>
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Método de Pago</label>
            <select className="select" value={form.metodo} onChange={e => setForm(p => ({ ...p, metodo: e.target.value }))}>
              {Object.entries(METODO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Monto (Bs.)</label>
            <input className="input" type="number" min="0.01" step="0.01"
              max={Number(venta.saldo_pendiente).toFixed(2)}
              required value={form.monto}
              onChange={e => setForm(p => ({ ...p, monto: e.target.value }))} />
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

function DetalleModal({ ventaId, onClose, openModificar, onUpdated }) {
  const { fmt } = useApp()
  const [data, setData] = useState(null)
  const [inventoryPrices, setInventoryPrices] = useState({})
  const [syncingId, setSyncingId] = useState(null)

  const loadDetalle = useCallback(async () => {
    const res = await window.api.invoke('cuentas:get', ventaId)
    setData(res)
    const prices = {}
    for (const d of res.detalles) {
      if (d.tipo === 'producto') {
        const p = await window.api.invoke('productos:get', d.ref_id).catch(() => null)
        if (p) prices[d.id] = { currentVes: p.precio_venta || 0 }
      }
    }
    setInventoryPrices(prices)
  }, [ventaId])

  useEffect(() => { loadDetalle() }, [loadDetalle])

  const handleSyncPrice = async (detalle, nuevoPrecio) => {
    setSyncingId(detalle.id)
    try {
      await window.api.invoke('cuentas:sincronizar_precio', {
        venta_id: data.id,
        detalle_id: detalle.id,
        nuevo_precio: nuevoPrecio
      })
      await loadDetalle()
      if (onUpdated) onUpdated()
    } finally {
      setSyncingId(null)
    }
  }

  if (!data) return <div className="modal-backdrop"><div className="modal text-center py-10 text-gray-400">Cargando...</div></div>

  const pagado = (data.total || 0) - (data.saldo_pendiente || 0)

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
            <p className="font-bold text-white">{fmt(data.total)}</p>
          </div>
          <div className="bg-surface-700 rounded-xl p-3">
            <p className="text-gray-400 text-xs">Pagado</p>
            <p className="font-bold text-accent-green">{fmt(pagado)}</p>
          </div>
          <div className="bg-red-900/20 rounded-xl p-3 border border-red-500/30 flex flex-col justify-between">
            <div>
              <p className="text-gray-400 text-xs">Pendiente (Bs.)</p>
              <p className="font-bold text-red-400">{fmt(data.saldo_pendiente)}</p>
            </div>
            <button onClick={() => { onClose(); openModificar(data) }}
              className="mt-2 w-full text-xs bg-surface-600 hover:bg-surface-500 text-white rounded py-1 transition-colors">
              ✏️ Modificar Deuda
            </button>
          </div>
        </div>

        <h3 className="font-semibold text-white mb-2">Artículos</h3>
        <div className="table-wrapper mb-4 max-h-40 overflow-y-auto">
          <table><thead><tr><th>Descripción</th><th className="text-center">Cant</th><th className="text-right">P.Unit</th><th className="text-right">Subtotal</th></tr></thead>
            <tbody>{data.detalles?.map((d, i) => {
              const actual = inventoryPrices[d.id]
              const priceIncreased = actual && actual.currentVes > (d.precio_unitario || 0) + 0.5
              return (
                <tr key={i}>
                  <td>
                    <p>{d.nombre}</p>
                    {priceIncreased && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-accent-yellow bg-accent-yellow/10 px-1.5 py-0.5 rounded inline-flex items-center gap-1 w-max">
                          ⚠️ Subió a {fmt(actual.currentVes)}
                        </span>
                        <button
                          onClick={() => handleSyncPrice(d, actual.currentVes)}
                          disabled={syncingId === d.id}
                          className="text-[10px] bg-brand-600 hover:bg-brand-500 text-white px-2 py-0.5 rounded transition-colors"
                        >
                          {syncingId === d.id ? '⏳...' : '🔄 Actualizar Precio'}
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="text-center">{d.cantidad}</td>
                  <td className="text-right">{fmt(d.precio_unitario)}</td>
                  <td className="text-right font-medium">{fmt(d.subtotal)}</td>
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
              <span className="text-accent-green font-semibold">{fmt(p.monto)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-4"><button onClick={onClose} className="btn-secondary">Cerrar</button></div>
      </div>
    </div>
  )
}

export default function CuentasPorCobrar() {
  const { fmt } = useApp()
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
  const totalPendiente = filteredVentas.reduce((s, v) => s + (v.saldo_pendiente || 0), 0)

  return (
    <div className="page">
      <div className="page-header flex-wrap gap-4 items-end">
        <div>
          <h1 className="page-title">📋 Cuentas por Cobrar</h1>
          <p className="text-sm text-gray-500">{filteredVentas.length} créditos activos {search ? 'encontrados' : ''}</p>
        </div>

        <div className="flex-1 min-w-[200px] max-w-sm">
          <input type="text" className="input" placeholder="🔍 Buscar por cliente o folio..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="stat-card whitespace-nowrap">
          <p className="stat-label">Total Pendiente {search ? '(Filtrado)' : ''}</p>
          <p className="text-xl font-bold text-red-400">{fmt(totalPendiente)}</p>
        </div>
      </div>

      <div className="card table-wrapper flex-1">
        <table>
          <thead><tr>
            <th>#</th><th>Cliente</th><th>Fecha</th>
            <th className="text-right">Total</th>
            <th className="text-right">Pagado</th>
            <th className="text-right">Saldo</th>
            <th className="text-center">Acciones</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="text-center py-10 text-gray-500">Cargando...</td></tr>
              : filteredVentas.length === 0 ? <tr><td colSpan={7} className="text-center py-10 text-gray-500">🎉 No se encontraron cuentas pendientes</td></tr>
                : filteredVentas.map(v => {
                  const pagado = (v.total || 0) - (v.saldo_pendiente || 0)
                  const pct = v.total > 0 ? ((pagado / v.total) * 100).toFixed(0) : 0
                  return (
                    <tr key={v.id}>
                      <td className="font-mono text-brand-400">#{v.id}</td>
                      <td>
                        <p className="font-medium text-white">{v.cliente_nombre}</p>
                        <p className="text-xs text-gray-500">{v.fecha?.slice(0, 10)}</p>
                      </td>
                      <td className="text-gray-400 text-xs">{v.fecha?.slice(11, 16)}</td>
                      <td className="text-right text-gray-300">{fmt(v.total)}</td>
                      <td className="text-right">
                        <div>
                          <span className="text-accent-green font-medium">{fmt(pagado)}</span>
                          <div className="w-full bg-surface-600 rounded-full h-1 mt-1">
                            <div className="bg-accent-green h-1 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="text-right">
                        <p className="font-bold text-red-400">{fmt(v.saldo_pendiente)}</p>
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
      {modal === 'detalle' && selected && <DetalleModal ventaId={selected.id} onClose={() => setModal(null)} openModificar={(v) => { setSelected(v); setModal('modificar') }} onUpdated={load} />}
      {modal === 'modificar' && selected && <ModificarDeudaModal venta={selected} onClose={() => setModal(null)} onSave={() => { setModal(null); load() }} />}
    </div>
  )
}
