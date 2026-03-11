import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import JsBarcode from 'jsbarcode'
import ConfirmationModal from '../components/ConfirmationModal.jsx'


// ── Barcode display ──────────────────────────────────────────────────────────
function BarcodeImg({ code }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current && code) {
      try { JsBarcode(ref.current, code, { format: 'CODE128', height: 40, displayValue: false }) }
      catch { }
    }
  }, [code])
  return code ? <svg ref={ref} className="h-10" /> : null
}

// ── Product form modal ──────────────────────────────────────────────────────
function ProductoModal({ producto, categorias, onClose, onSave }) {
  const { fmt } = useApp()
  const blank = {
    codigo: '', nombre: '', marca: '', precio_compra_usd: '', precio_venta_usd: '',
    stock_actual: 0, stock_minimo: 0, categoria_id: '', descripcion: '',
  }
  const [form, setForm] = useState(producto ? { ...producto, categoria_id: producto.categoria_id || '' } : blank)
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const margin = form.precio_venta_usd && form.precio_compra_usd
    ? (((form.precio_venta_usd - form.precio_compra_usd) / form.precio_compra_usd) * 100).toFixed(1)
    : null

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        ...form,
        precio_compra_usd: parseFloat(form.precio_compra_usd) || 0,
        precio_venta_usd: parseFloat(form.precio_venta_usd) || 0,
        stock_actual: parseInt(form.stock_actual) || 0,
        stock_minimo: parseInt(form.stock_minimo) || 0,
        categoria_id: form.categoria_id ? parseInt(form.categoria_id) : null,
      }
      if (producto?.id) {
        await window.api.invoke('productos:update', { id: producto.id, ...data })
      } else {
        await window.api.invoke('productos:create', data)
      }
      onSave()
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-lg">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{producto ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button onClick={onClose} className="btn-ghost btn-sm text-xl">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Código (vacío = auto-generar)</label>
              <input className="input" value={form.codigo} onChange={e => set('codigo', e.target.value)} placeholder="Auto" />
              {form.codigo && <div className="mt-2"><BarcodeImg code={form.codigo} /></div>}
            </div>
            <div>
              <label className="label">Nombre *</label>
              <input className="input" required value={form.nombre} onChange={e => set('nombre', e.target.value)} />
            </div>
            <div>
              <label className="label">Marca</label>
              <input className="input" value={form.marca} onChange={e => set('marca', e.target.value)} />
            </div>
            <div>
              <label className="label">Categoría</label>
              <select className="select" value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)}>
                <option value="">Sin categoría</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Precio Compra (USD)</label>
              <input className="input" type="number" min="0" step="0.01" required value={form.precio_compra_usd} onChange={e => set('precio_compra_usd', e.target.value)} />
            </div>
            <div>
              <label className="label">Precio Venta (USD)</label>
              <input className="input" type="number" min="0" step="0.01" required value={form.precio_venta_usd} onChange={e => set('precio_venta_usd', e.target.value)} />
              {margin && <p className="text-xs mt-1 text-accent-green">Margen: {margin}%</p>}
            </div>
            <div>
              <label className="label">Stock Actual</label>
              <input className="input" type="number" min="0" value={form.stock_actual} onChange={e => set('stock_actual', e.target.value)} />
            </div>
            <div>
              <label className="label">Stock Mínimo (alerta)</label>
              <input className="input" type="number" min="0" value={form.stock_minimo} onChange={e => set('stock_minimo', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea className="input h-16 resize-none" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? '⏳ Guardando...' : '💾 Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Merma modal ──────────────────────────────────────────────────────────────
function MermaModal({ producto, onClose, onSave }) {
  const [form, setForm] = useState({ cantidad: 1, motivo: 'daño', notas: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await window.api.invoke('mermas:create', {
        producto_id: producto.id,
        cantidad: parseInt(form.cantidad),
        motivo: form.motivo,
        notas: form.notas,
      })
      onSave()
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-accent-yellow">⚠️ Registrar Merma</h2>
          <button onClick={onClose} className="btn-ghost btn-sm">✕</button>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Producto: <strong className="text-white">{producto.nombre}</strong> — Stock actual: <strong className="text-white">{producto.stock_actual}</strong>
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Cantidad a descontar</label>
            <input className="input" type="number" min="1" max={producto.stock_actual} required
              value={form.cantidad} onChange={e => set('cantidad', e.target.value)} />
          </div>
          <div>
            <label className="label">Motivo</label>
            <select className="select" value={form.motivo} onChange={e => set('motivo', e.target.value)}>
              <option value="daño">Daño / Rotura</option>
              <option value="robo">Robo / Extravío</option>
              <option value="uso_interno">Uso Interno</option>
              <option value="vencimiento">Vencimiento</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="label">Notas adicionales</label>
            <textarea className="input h-16 resize-none" value={form.notas} onChange={e => set('notas', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-danger">
              {saving ? '⏳...' : '📉 Registrar Merma'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Inventario page ─────────────────────────────────────────────────────
export default function Inventario() {
  const { fmt, toVes, tasa } = useApp()
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterBajoStock, setFilterBajoStock] = useState(false)
  const [modal, setModal] = useState(null) // null | 'crear' | 'editar' | 'merma'
  const [selected, setSelected] = useState(null)
  const [newCat, setNewCat] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null) // null | producto

  const load = useCallback(async () => {
    setLoading(true)
    const [prods, cats] = await Promise.all([
      window.api.invoke('productos:list', {
        search: search || undefined,
        categoria_id: filterCat || undefined,
        bajo_stock: filterBajoStock || undefined,
      }),
      window.api.invoke('categorias:list'),
    ])
    setProductos(prods)
    setCategorias(cats)
    setLoading(false)
  }, [search, filterCat, filterBajoStock])

  useEffect(() => { load() }, [load])

  const deleteProd = async (p) => {
    setConfirmDelete(p)
  }

  const handleConfirmDelete = async () => {
    const p = confirmDelete
    if (!p) return
    await window.api.invoke('productos:delete', p.id)
    setConfirmDelete(null)
    load()
  }

  const addCat = async () => {
    if (!newCat.trim()) return
    await window.api.invoke('categorias:create', { nombre: newCat.trim() })
    setNewCat('')
    load()
  }

  const bajoStockCount = productos.filter(p => p.stock_actual <= p.stock_minimo).length

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">📦 Inventario</h1>
          <p className="text-sm text-gray-500">{productos.length} productos · {categorias.length} categorías</p>
        </div>
        <div className="flex gap-3">
          {bajoStockCount > 0 && (
            <button onClick={() => setFilterBajoStock(v => !v)}
              className={`badge-red text-sm px-3 py-2 rounded-lg cursor-pointer ${filterBajoStock ? 'ring-2 ring-red-400' : ''}`}>
              ⚠️ {bajoStockCount} bajo stock
            </button>
          )}
          <button onClick={() => { setSelected(null); setModal('crear') }} className="btn-primary">
            + Nuevo Producto
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <input className="input flex-1 max-w-sm" placeholder="🔍 Buscar por nombre, código o marca..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="select w-48" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" id="bajo" checked={filterBajoStock} onChange={e => setFilterBajoStock(e.target.checked)} className="accent-brand-500" />
          <label htmlFor="bajo">Solo bajo stock</label>
        </div>

        {/* Quick add category */}
        <div className="flex gap-2 ml-auto">
          <input className="input w-36" placeholder="Nueva categoría" value={newCat} onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCat()} />
          <button className="btn-secondary btn-sm" onClick={addCat}>+ Cat</button>
        </div>
      </div>

      {/* Table */}
      <div className="card table-wrapper flex-1">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th className="text-right">Compra</th>
              <th className="text-right">Venta USD</th>
              <th className="text-right">Venta Bs.</th>
              <th className="text-center">Stock</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-500">Cargando...</td></tr>
            ) : productos.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-500">Sin productos. Crea el primero ↑</td></tr>
            ) : productos.map(p => {
              const bajo = p.stock_actual <= p.stock_minimo
              return (
                <tr key={p.id} className={bajo ? 'bg-red-900/10' : ''}>
                  <td><span className="font-mono text-xs text-brand-400">{p.codigo}</span></td>
                  <td>
                    <p className="font-medium text-white">{p.nombre}</p>
                    {p.marca && <p className="text-xs text-gray-500">{p.marca}</p>}
                  </td>
                  <td><span className="badge-blue">{p.categoria_nombre || '—'}</span></td>
                  <td className="text-right text-gray-400">{fmt(p.precio_compra_usd)}</td>
                  <td className="text-right font-semibold text-white">{fmt(p.precio_venta_usd)}</td>
                  <td className="text-right text-gray-300 text-xs">Bs. {toVes(p.precio_venta_usd).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</td>
                  <td className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`font-bold text-sm ${bajo ? 'text-red-400' : 'text-white'}`}>{p.stock_actual}</span>
                      {bajo && <span className="badge-red text-xs">⚠️ mín {p.stock_minimo}</span>}
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => { setSelected(p); setModal('editar') }} className="btn-ghost btn-sm">✏️</button>
                      <button onClick={() => { setSelected(p); setModal('merma') }} className="btn-ghost btn-sm" title="Registrar merma">📉</button>
                      <button onClick={() => deleteProd(p)} className="btn-ghost btn-sm text-red-400">🗑️</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {(modal === 'crear' || modal === 'editar') && (
        <ProductoModal producto={modal === 'editar' ? selected : null} categorias={categorias}
          onClose={() => setModal(null)} onSave={() => { setModal(null); load() }} />
      )}
      {modal === 'merma' && selected && (
        <MermaModal producto={selected} onClose={() => setModal(null)} onSave={() => { setModal(null); load() }} />
      )}

      {confirmDelete && (
        <ConfirmationModal
          title="¿Eliminar Producto?"
          message={`¿Estás seguro que deseas eliminar "${confirmDelete.nombre}"? Esta acción no se puede deshacer.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
