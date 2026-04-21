import React, { useState, useEffect, useCallback, useRef } from 'react'
import { LuPlus, LuPencil, LuTrash2, LuSearch, LuTrendingDown, LuTriangleAlert, LuFolderOpen, LuCheck, LuX, LuChevronLeft, LuChevronRight } from 'react-icons/lu'
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
    codigo: '', nombre: '', marca: '',
    precio_compra: '',
    precio_venta: '',
    stock_actual: 0, stock_minimo: 0, categoria_id: '', descripcion: '',
  }
  const [form, setForm] = useState(producto ? {
    ...blank,
    ...producto,
    codigo: producto.codigo || '',
    precio_compra: producto.precio_compra || '',
    precio_venta: producto.precio_venta || '',
    categoria_id: producto.categoria_id || '',
  } : blank)
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const margen = form.precio_venta && form.precio_compra
    ? (((parseFloat(form.precio_venta) - parseFloat(form.precio_compra)) / parseFloat(form.precio_compra)) * 100).toFixed(1)
    : null

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        codigo: form.codigo,
        nombre: form.nombre,
        marca: form.marca,
        precio_compra: parseFloat(form.precio_compra) || 0,
        precio_venta: parseFloat(form.precio_venta) || 0,
        stock_actual: parseInt(form.stock_actual) || 0,
        stock_minimo: parseInt(form.stock_minimo) || 0,
        categoria_id: form.categoria_id ? parseInt(form.categoria_id) : null,
        descripcion: form.descripcion || '',
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

            <div className="col-span-2 pt-2 pb-1 border-t border-white/5">
              <p className="text-xs text-gray-500 bg-surface-700 rounded-lg px-3 py-2">💡 Todos los precios en <strong>Bolívares (Bs.)</strong></p>
            </div>

            <div>
              <label className="label">Precio Compra (Bs.)</label>
              <input className="input" type="number" min="0" step="0.01" required value={form.precio_compra} onChange={e => set('precio_compra', e.target.value)} />
            </div>
            <div>
              <label className="label">Precio Venta (Bs.)</label>
              <input className="input" type="number" min="0" step="0.01" required value={form.precio_venta} onChange={e => set('precio_venta', e.target.value)} />
              {margen && <p className="text-xs font-semibold text-accent-green mt-1">Margen: {margen}%</p>}
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
    e.preventDefault(); setSaving(true)
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

// ── Category Manager Modal ───────────────────────────────────────────────────
function CategoryManagerModal({ onClose, onChanged }) {
  const [cats, setCats] = useState([])
  const [allProds, setAllProds] = useState([])
  const [selectedCat, setSelectedCat] = useState(null)
  const [checkedIds, setCheckedIds] = useState(new Set())
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [prodSearch, setProdSearch] = useState('')

  const load = useCallback(async () => {
    const [c, p] = await Promise.all([
      window.api.invoke('categorias:list'),
      window.api.invoke('categorias:productos'),
    ])
    setCats(c)
    setAllProds(p)
  }, [])

  useEffect(() => { load() }, [load])

  const selectCat = (cat) => {
    setSelectedCat(cat)
    setCheckedIds(new Set(allProds.filter(p => p.categoria_id === cat.id).map(p => p.id)))
    setProdSearch('')
  }

  const toggleCheck = (id) => setCheckedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleAll = (filtered) => {
    const filteredIds = filtered.map(p => p.id)
    const allChecked = filteredIds.every(id => checkedIds.has(id))
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (allChecked) { filteredIds.forEach(id => next.delete(id)) }
      else { filteredIds.forEach(id => next.add(id)) }
      return next
    })
  }

  const saveAssign = async () => {
    if (!selectedCat) return
    setSaving(true)
    try {
      await window.api.invoke('categorias:bulk_assign', { categoria_id: selectedCat.id, producto_ids: [...checkedIds] })
      await load(); onChanged()
    } finally { setSaving(false) }
  }

  const addCat = async () => {
    if (!newName.trim()) return
    const cat = await window.api.invoke('categorias:create', { nombre: newName.trim() })
    setNewName(''); await load(); onChanged()
    selectCat({ ...cat, total_productos: 0 })
  }

  const startEdit = (cat) => { setEditingId(cat.id); setEditName(cat.nombre) }
  const saveEdit = async (id) => {
    if (!editName.trim()) return
    await window.api.invoke('categorias:update', { id, nombre: editName.trim() })
    setEditingId(null); await load(); onChanged()
    if (selectedCat?.id === id) setSelectedCat(c => ({ ...c, nombre: editName.trim() }))
  }

  const deleteCat = async () => {
    if (!confirmDel) return
    await window.api.invoke('categorias:delete', confirmDel.id)
    setConfirmDel(null)
    if (selectedCat?.id === confirmDel.id) setSelectedCat(null)
    await load(); onChanged()
  }

  const filteredProds = allProds.filter(p =>
    !prodSearch || p.nombre.toLowerCase().includes(prodSearch.toLowerCase()) || (p.codigo || '').toLowerCase().includes(prodSearch.toLowerCase())
  )

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-lg" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex justify-between items-center mb-5 shrink-0">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2"><LuFolderOpen className="text-brand-400" /> Gestor de Categorías</h2>
            <p className="text-xs text-gray-500">{cats.length} categorías · {allProds.length} productos</p>
          </div>
          <button onClick={onClose} className="btn-ghost btn-sm text-xl">✕</button>
        </div>

        <div className="flex gap-4 overflow-hidden flex-1" style={{ minHeight: 0 }}>
          <div className="flex flex-col gap-3 w-60 shrink-0">
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Nueva categoría..." value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCat()} />
              <button className="btn-primary btn-sm" onClick={addCat}><LuPlus /></button>
            </div>
            <div className="flex flex-col gap-1 overflow-y-auto flex-1">
              {cats.map(cat => (
                <div key={cat.id}
                  className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-colors group ${selectedCat?.id === cat.id ? 'bg-brand-600 text-white' : 'bg-surface-700 hover:bg-surface-600'}`}
                  onClick={() => selectCat(cat)}>
                  {editingId === cat.id ? (
                    <>
                      <input className="input text-sm flex-1 py-0.5 px-2 h-7"
                        value={editName} onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(cat.id); if (e.key === 'Escape') setEditingId(null) }}
                        onClick={e => e.stopPropagation()} autoFocus />
                      <button onClick={e => { e.stopPropagation(); saveEdit(cat.id) }} className="text-accent-green hover:scale-110"><LuCheck /></button>
                      <button onClick={e => { e.stopPropagation(); setEditingId(null) }} className="text-gray-400 hover:scale-110"><LuX /></button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium truncate">{cat.nombre}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedCat?.id === cat.id ? 'bg-white/20' : 'bg-surface-600'}`}>{cat.total_productos}</span>
                      <button onClick={e => { e.stopPropagation(); startEdit(cat) }}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity text-xs ${selectedCat?.id === cat.id ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-white'}`}><LuPencil /></button>
                      <button onClick={e => { e.stopPropagation(); setConfirmDel(cat) }}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity text-xs ${selectedCat?.id === cat.id ? 'text-red-300 hover:text-red-200' : 'text-red-400 hover:text-red-300'}`}><LuTrash2 /></button>
                    </>
                  )}
                </div>
              ))}
              {cats.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Sin categorías aún</p>}
            </div>
          </div>

          <div className="flex flex-col flex-1 overflow-hidden gap-3">
            {selectedCat ? (
              <>
                <div className="flex items-center justify-between shrink-0">
                  <div>
                    <p className="text-sm font-semibold text-white">Productos en <span className="text-brand-400">{selectedCat.nombre}</span></p>
                    <p className="text-xs text-gray-500">{checkedIds.size} seleccionados</p>
                  </div>
                  <button onClick={saveAssign} disabled={saving} className="btn-primary btn-sm">
                    {saving ? '⏳ Guardando...' : '💾 Guardar Asignación'}
                  </button>
                </div>
                <input className="input shrink-0" placeholder="Buscar producto..."
                  value={prodSearch} onChange={e => setProdSearch(e.target.value)} />
                <div className="overflow-y-auto flex-1 border border-white/5 rounded-xl">
                  <table className="w-full text-sm" style={{ minWidth: 'unset' }}>
                    <thead className="bg-surface-700 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left">
                          <input type="checkbox" className="accent-brand-500"
                            checked={filteredProds.length > 0 && filteredProds.every(p => checkedIds.has(p.id))}
                            onChange={() => toggleAll(filteredProds)} />
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Producto</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Categoría Actual</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProds.map(p => (
                        <tr key={p.id}
                          className={`border-t border-white/5 cursor-pointer transition-colors ${checkedIds.has(p.id) ? 'bg-brand-600/10' : 'hover:bg-surface-700/50'}`}
                          onClick={() => toggleCheck(p.id)}>
                          <td className="px-3 py-2"><input type="checkbox" className="accent-brand-500" checked={checkedIds.has(p.id)} onChange={() => toggleCheck(p.id)} onClick={e => e.stopPropagation()} /></td>
                          <td className="px-3 py-2">
                            <p className="font-medium text-white">{p.nombre}</p>
                            {p.marca && <p className="text-xs text-gray-500">{p.marca}</p>}
                          </td>
                          <td className="px-3 py-2">
                            {p.categoria_nombre
                              ? <span className={`badge-blue text-xs ${p.categoria_id === selectedCat.id ? 'bg-brand-600/30 text-brand-300 border-brand-500/30' : ''}`}>{p.categoria_nombre}</span>
                              : <span className="text-gray-500 text-xs">—</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-400">{p.stock_actual}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-500">
                <LuFolderOpen className="text-4xl mb-3 text-gray-600" />
                <p className="text-sm">Selecciona una categoría para gestionar sus productos</p>
              </div>
            )}
          </div>
        </div>

        {confirmDel && (
          <ConfirmationModal
            title={`¿Eliminar «${confirmDel.nombre}»?`}
            message={`Los productos de esta categoría quedarán sin categoría asignada. Esta acción no se puede deshacer.`}
            onConfirm={deleteCat}
            onCancel={() => setConfirmDel(null)}
          />
        )}
      </div>
    </div>
  )
}

// ── Main Inventario page ─────────────────────────────────────────────────────
export default function Inventario() {
  const { fmt } = useApp()
  const [data, setData] = useState({ productos: [], total: 0, pages: 0 })
  const [page, setPage] = useState(1)
  const PER_PAGE = 25
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterBajoStock, setFilterBajoStock] = useState(false)
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    const [paginatedData, cats] = await Promise.all([
      window.api.invoke('productos:paginated', {
        page: p,
        perPage: PER_PAGE,
        search: search || undefined,
        categoria_id: filterCat || undefined,
        bajo_stock: filterBajoStock || undefined,
      }),
      window.api.invoke('categorias:list'),
    ])
    setData(paginatedData)
    setCategorias(cats)
    setPage(p)
    setLoading(false)
  }, [search, filterCat, filterBajoStock])

  useEffect(() => { load(1) }, [search, filterCat, filterBajoStock]) // Removed load from deps and manually control search trigger

  const deleteProd = async (p) => { setConfirmDelete(p) }
  const handleConfirmDelete = async () => {
    const p = confirmDelete
    if (!p) return
    await window.api.invoke('productos:delete', p.id)
    setConfirmDelete(null)
    load(page)
  }

  // The true count of total low stock isn't known without querying specifically, but we can 
  // assume if they check "Solo bajo stock" the total goes to `data.total`.

  return (
    <div className="page pb-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">📦 Inventario</h1>
          <p className="text-sm text-gray-500">{data.total} productos · {categorias.length} categorías</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button onClick={() => setModal('categorias')} className="btn-secondary flex items-center gap-2">
            <LuFolderOpen /> <span className="hidden sm:inline">Categorías</span>
          </button>
          <button onClick={() => { setSelected(null); setModal('crear') }} className="btn-primary flex items-center gap-2">
            <LuPlus /> <span className="hidden sm:inline">Nuevo </span>Producto
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><LuSearch /></span>
          <input className="input w-full pl-10" placeholder="Buscar por nombre, código..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select min-w-[140px] flex-1 sm:flex-none sm:w-48" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" id="bajo" checked={filterBajoStock} onChange={e => setFilterBajoStock(e.target.checked)} className="accent-brand-500" />
          <label htmlFor="bajo">Solo bajo stock</label>
        </div>
      </div>

      <div className="card table-wrapper flex-1">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th className="text-right">Compra (Bs.)</th>
              <th className="text-right">Venta (Bs.)</th>
              <th className="text-center">Stock</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-500">Cargando...</td></tr>
            ) : data.productos.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-500">Sin productos. Crea el primero ↑</td></tr>
            ) : data.productos.map(p => {
              const bajo = p.stock_actual <= p.stock_minimo
              return (
                <tr key={p.id} className={bajo ? 'bg-red-900/10' : ''}>
                  <td><span className="font-mono text-xs text-brand-400">{p.codigo}</span></td>
                  <td>
                    <p className="font-medium text-white">{p.nombre}</p>
                    {p.marca && <p className="text-xs text-gray-500">{p.marca}</p>}
                  </td>
                  <td><span className="badge-blue">{p.categoria_nombre || '—'}</span></td>
                  <td className="text-right text-gray-400">{fmt(p.precio_compra)}</td>
                  <td className="text-right">
                    <span className="text-accent-green font-bold bg-accent-green/10 px-2 py-0.5 rounded-md text-xs border border-accent-green/20">
                      {fmt(p.precio_venta)}
                    </span>
                  </td>
                  <td className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`font-bold text-sm ${bajo ? 'text-red-400' : 'text-white'}`}>{p.stock_actual}</span>
                      {bajo && <span className="badge-red text-xs transition-colors flex items-center gap-1"><LuTriangleAlert /> mín {p.stock_minimo}</span>}
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => { setSelected(p); setModal('editar') }} className="btn-ghost btn-sm text-brand-400" title="Editar"><LuPencil /></button>
                      <button onClick={() => { setSelected(p); setModal('merma') }} className="btn-ghost btn-sm text-accent-yellow" title="Registrar merma"><LuTrendingDown /></button>
                      <button onClick={() => deleteProd(p)} className="btn-ghost btn-sm text-red-400" title="Eliminar"><LuTrash2 /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {data.pages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-5 gap-4">
          <span className="text-xs text-gray-500 bg-surface-800 px-3 py-1.5 rounded-lg border border-white/5">Página <strong className="text-white">{data.page}</strong> de <strong className="text-white">{data.pages}</strong> · {data.total} elementos</span>
          <div className="flex gap-1.5 bg-surface-800 p-1 rounded-xl border border-white/5 shadow-inner">
            <button onClick={() => load(1)} disabled={page === 1} className="btn-ghost btn-sm h-8 w-8 p-0 flex items-center justify-center rounded-lg" title="Primera">«</button>
            <button onClick={() => load(page - 1)} disabled={page === 1} className="btn-ghost btn-sm h-8 w-8 p-0 flex items-center justify-center rounded-lg"><LuChevronLeft /></button>
            {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, data.pages - 4))
              const _p = start + i
              if (_p > data.pages) return null
              return <button key={_p} onClick={() => load(_p)} className={`btn-sm h-8 min-w-[32px] p-0 flex items-center justify-center rounded-lg text-sm transition-colors ${_p === page ? 'bg-brand-600 text-white shadow-md' : 'hover:bg-surface-700 text-gray-400'}`}>{_p}</button>
            })}
            <button onClick={() => load(page + 1)} disabled={page === data.pages} className="btn-ghost btn-sm h-8 w-8 p-0 flex items-center justify-center rounded-lg"><LuChevronRight /></button>
            <button onClick={() => load(data.pages)} disabled={page === data.pages} className="btn-ghost btn-sm h-8 w-8 p-0 flex items-center justify-center rounded-lg" title="Última">»</button>
          </div>
        </div>
      )}

      {(modal === 'crear' || modal === 'editar') && (
        <ProductoModal producto={modal === 'editar' ? selected : null} categorias={categorias}
          onClose={() => setModal(null)} onSave={() => { setModal(null); load(page) }} />
      )}
      {modal === 'merma' && selected && (
        <MermaModal producto={selected} onClose={() => setModal(null)} onSave={() => { setModal(null); load(page) }} />
      )}
      {modal === 'categorias' && (
        <CategoryManagerModal onClose={() => setModal(null)} onChanged={load} />
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
