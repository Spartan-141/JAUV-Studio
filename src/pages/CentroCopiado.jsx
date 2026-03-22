import React, { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import ConfirmationModal from '../components/ConfirmationModal.jsx'


// ── Insumo Modal ─────────────────────────────────────────────────────────────
function InsumoModal({ insumo, onClose, onSave }) {
  const blank = { nombre: '', tipo: 'carta', stock_hojas: 0, stock_minimo: 0, costo_por_hoja_usd: 0 }
  const [form, setForm] = useState(insumo || blank)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const submit = async (e) => {
    e.preventDefault(); setSaving(true)
    const data = { ...form, stock_hojas: parseInt(form.stock_hojas) || 0, stock_minimo: parseInt(form.stock_minimo) || 0, costo_por_hoja_usd: parseFloat(form.costo_por_hoja_usd) || 0 }
    try {
      if (insumo?.id) await window.api.invoke('insumos:update', { id: insumo.id, ...data })
      else await window.api.invoke('insumos:create', data)
      onSave()
    } finally { setSaving(false) }
  }
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">{insumo ? 'Editar Insumo' : 'Nuevo Insumo'}</h2>
          <button onClick={onClose} className="btn-ghost btn-sm">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div><label className="label">Nombre *</label><input className="input" required value={form.nombre} onChange={e => set('nombre', e.target.value)} /></div>
          <div><label className="label">Tipo</label>
            <select className="select" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              <option value="carta">Carta</option><option value="oficio">Oficio</option>
              <option value="doble-carta">Doble Carta</option><option value="otro">Otro</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Stock Hojas</label><input className="input" type="number" min="0" value={form.stock_hojas} onChange={e => set('stock_hojas', e.target.value)} /></div>
            <div><label className="label">Stock Mínimo</label><input className="input" type="number" min="0" value={form.stock_minimo} onChange={e => set('stock_minimo', e.target.value)} /></div>
          </div>
          <div><label className="label">Costo por Hoja (USD)</label><input className="input" type="number" min="0" step="0.0001" value={form.costo_por_hoja_usd} onChange={e => set('costo_por_hoja_usd', e.target.value)} /></div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? '⏳...' : '💾 Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Servicio Modal ────────────────────────────────────────────────────────────
function ServicioModal({ servicio, insumos, onClose, onSave }) {
  const blank = { nombre: '', precio_usd: '', insumo_id: '', activo: 1 }
  const [form, setForm] = useState(servicio ? { ...servicio, insumo_id: servicio.insumo_id || '' } : blank)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const submit = async (e) => {
    e.preventDefault(); setSaving(true)
    const data = { ...form, precio_usd: parseFloat(form.precio_usd) || 0, insumo_id: form.insumo_id ? parseInt(form.insumo_id) : null }
    try {
      if (servicio?.id) await window.api.invoke('servicios:update', { id: servicio.id, ...data })
      else await window.api.invoke('servicios:create', data)
      onSave()
    } finally { setSaving(false) }
  }
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">{servicio ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
          <button onClick={onClose} className="btn-ghost btn-sm">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div><label className="label">Nombre *</label><input className="input" required value={form.nombre} onChange={e => set('nombre', e.target.value)} /></div>
          <div><label className="label">Precio (USD)</label><input className="input" type="number" min="0" step="0.01" required value={form.precio_usd} onChange={e => set('precio_usd', e.target.value)} /></div>
          <div><label className="label">Insumo (papel que consume)</label>
            <select className="select" value={form.insumo_id} onChange={e => set('insumo_id', e.target.value)}>
              <option value="">Ninguno</option>
              {insumos.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.stock_hojas} hojas)</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? '⏳...' : '💾 Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Ajuste de insumo (agregar/quitar hojas) ───────────────────────────────────
function AjusteModal({ insumo, onClose, onSave }) {
  const [form, setForm] = useState({ cantidad: '', operacion: 'sumar' })
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await window.api.invoke('insumos:ajustar', { id: insumo.id, cantidad: parseInt(form.cantidad), operacion: form.operacion })
      onSave()
    } finally { setSaving(false) }
  }
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">Ajustar Stock — {insumo.nombre}</h2>
          <button onClick={onClose} className="btn-ghost btn-sm">✕</button>
        </div>
        <p className="text-gray-400 text-sm mb-4">Stock actual: <strong className="text-white">{insumo.stock_hojas} hojas</strong></p>
        <form onSubmit={submit} className="space-y-4">
          <div><label className="label">Operación</label>
            <select className="select" value={form.operacion} onChange={e => setForm(p => ({ ...p, operacion: e.target.value }))}>
              <option value="sumar">➕ Agregar hojas</option><option value="restar">➖ Quitar hojas</option>
            </select>
          </div>
          <div><label className="label">Cantidad</label><input className="input" type="number" min="1" required value={form.cantidad} onChange={e => setForm(p => ({ ...p, cantidad: e.target.value }))} /></div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? '⏳...' : '✅ Aplicar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CentroCopiado() {
  const { fmt, toVes } = useApp()
  const [tab, setTab] = useState('insumos')
  const [insumos, setInsumos] = useState([])
  const [servicios, setServicios] = useState([])
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // null | { type, id, nombre }

  const load = useCallback(async () => {
    const [ins, srvs] = await Promise.all([
      window.api.invoke('insumos:list'),
      window.api.invoke('servicios:list'),
    ])
    setInsumos(ins); setServicios(srvs)
  }, [])

  useEffect(() => { load() }, [load])

  const deleteItem = (type, id, nombre) => {
    setConfirmDelete({ type, id, nombre })
  }

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return
    const { type, id } = confirmDelete
    await window.api.invoke(type === 'insumo' ? 'insumos:delete' : 'servicios:delete', id)
    setConfirmDelete(null)
    load()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">🖨️ Centro de Copiado</h1><p className="text-sm text-gray-500">Insumos y catálogo de servicios</p></div>
        <button onClick={() => { setSelected(null); setModal(tab === 'insumos' ? 'insumo' : 'servicio') }} className="btn-primary">
          + {tab === 'insumos' ? 'Nuevo Insumo' : 'Nuevo Servicio'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-800 rounded-xl p-1 border border-white/5 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
        {['insumos', 'servicios'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {t === 'insumos' ? '📄 Insumos (Papel)' : '📋 Catálogo de Servicios'}
          </button>
        ))}
        </div>
      </div>

      {tab === 'insumos' && (
        <div className="card table-wrapper">
          <table>
            <thead><tr><th>Insumo</th><th>Tipo</th><th className="text-center">Stock Hojas</th><th>Mínimo</th><th>Costo/Hoja</th><th>Acciones</th></tr></thead>
            <tbody>
              {insumos.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-500">Sin insumos registrados</td></tr>
              ) : insumos.map(i => {
                const bajo = i.stock_hojas <= i.stock_minimo
                return (
                  <tr key={i.id} className={bajo ? 'bg-red-900/10' : ''}>
                    <td className="font-medium text-white">{i.nombre}</td>
                    <td><span className="badge-blue capitalize">{i.tipo}</span></td>
                    <td className="text-center">
                      <span className={`font-bold ${bajo ? 'text-red-400' : 'text-white'}`}>{i.stock_hojas}</span>
                      {bajo && <span className="badge-red ml-2">⚠️ bajo</span>}
                    </td>
                    <td className="text-gray-400">{i.stock_minimo}</td>
                    <td className="text-gray-300">{fmt(i.costo_por_hoja_usd)}/hoja</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => { setSelected(i); setModal('ajuste') }} className="btn-ghost btn-sm" title="Ajustar stock">📊</button>
                        <button onClick={() => { setSelected(i); setModal('insumo') }} className="btn-ghost btn-sm">✏️</button>
                        <button onClick={() => deleteItem('insumo', i.id, i.nombre)} className="btn-ghost btn-sm text-red-400">🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'servicios' && (
        <div className="card table-wrapper">
          <table>
            <thead><tr><th>Servicio</th><th>Insumo</th><th className="text-right">Precio USD</th><th className="text-right">Precio Bs.</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {servicios.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-500">Sin servicios registrados</td></tr>
              ) : servicios.map(s => (
                <tr key={s.id}>
                  <td className="font-medium text-white">{s.nombre}</td>
                  <td className="text-gray-400 text-xs">{s.insumo_nombre || '—'}</td>
                  <td className="text-right font-semibold text-white">{fmt(s.precio_usd)}</td>
                  <td className="text-right text-gray-300 text-xs">Bs. {toVes(s.precio_usd).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</td>
                  <td><span className={s.activo ? 'badge-green' : 'badge-red'}>{s.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => { setSelected(s); setModal('servicio') }} className="btn-ghost btn-sm">✏️</button>
                      <button onClick={() => deleteItem('servicio', s.id, s.nombre)} className="btn-ghost btn-sm text-red-400">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'insumo' && <InsumoModal insumo={selected} onClose={() => setModal(null)} onSave={() => { setModal(null); load() }} />}
      {modal === 'servicio' && <ServicioModal servicio={selected} insumos={insumos} onClose={() => setModal(null)} onSave={() => { setModal(null); load() }} />}
      {modal === 'ajuste' && selected && <AjusteModal insumo={selected} onClose={() => setModal(null)} onSave={() => { setModal(null); load() }} />}

      {confirmDelete && (
        <ConfirmationModal
          title={`¿Eliminar ${confirmDelete.type === 'insumo' ? 'Insumo' : 'Servicio'}?`}
          message={`¿Estás seguro que deseas eliminar "${confirmDelete.nombre}"? Esta acción no se puede deshacer.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
