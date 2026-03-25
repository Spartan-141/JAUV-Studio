import React, { useState, useEffect, useCallback, useRef } from 'react'
import { LuBanknote, LuSmartphone, LuLandmark, LuSearch, LuUser, LuTrash2, LuPlus, LuMinus, LuCreditCard, LuX, LuDollarSign, LuShoppingCart, LuCircleCheck, LuClipboardList, LuCamera } from 'react-icons/lu'
import { useApp } from '../context/AppContext.jsx'
import { format } from 'date-fns'
import AlertModal from '../components/AlertModal.jsx'
import ScannerModal from '../components/ScannerModal.jsx'

const METODOS = [
  { key: 'efectivo_usd', label: '$ Efectivo USD', icon: <LuDollarSign /> },
  { key: 'efectivo_ves', label: 'Bs. Efectivo', icon: <LuBanknote /> },
  { key: 'pago_movil',   label: 'Bs. Pago Móvil', icon: <LuSmartphone /> },
  { key: 'transferencia',label: 'Bs. Transferencia', icon: <LuLandmark /> },
]

// ── Ticket printing ───────────────────────────────────────────────────────────
function printTicket({ venta, detalles, pagos, config, tasa }) {
  const w = window.open('', '_blank', 'width=350,height=600')
  const ancho = config?.impresora_ancho === '58' ? '58mm' : '80mm'
  const total_ves = (venta.total_usd * tasa).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ticket</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Courier New', monospace; font-size: 11px; width: ${ancho}; padding: 6px; color:#000; }
    h1 { font-size:14px; text-align:center; font-weight:bold; }
    .center { text-align:center; }
    .divider { border-top: 1px dashed #000; margin: 5px 0; }
    .row { display:flex; justify-content:space-between; margin: 2px 0; }
    .bold { font-weight:bold; }
    .total { font-size:14px; font-weight:bold; }
    .small { font-size:10px; }
  </style></head><body>
  <h1>${config?.nombre_tienda || 'JAUV Studio'}</h1>
  <p class="center small">${config?.direccion_tienda || 'Venezuela'}</p>
  <p class="center small">${config?.telefono_tienda || ''}</p>
  <div class="divider"></div>
  <p>Fecha: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
  <p>N° Venta: #${venta.id}</p>
  ${venta.cliente_nombre ? `<p>Cliente: ${venta.cliente_nombre}</p>` : ''}
  <div class="divider"></div>
  ${detalles.map(d=>`
    <p class="bold">${d.nombre}</p>
    <div class="row"><span>${d.cantidad} x $${Number(d.precio_unitario_usd).toFixed(2)}</span><span>$${Number(d.subtotal_usd).toFixed(2)}</span></div>
  `).join('')}
  <div class="divider"></div>
  ${venta.descuento_otorgado_usd > 0 ? `<div class="row"><span>Descuento:</span><span>-$${Number(venta.descuento_otorgado_usd).toFixed(2)}</span></div>` : ''}
  <div class="row total"><span>TOTAL:</span><span>$${Number(venta.total_usd).toFixed(2)}</span></div>
  <div class="row small"><span></span><span>Bs. ${total_ves}</span></div>
  <div class="divider"></div>
  ${pagos.map(p=>`<div class="row small"><span>${METODOS.find(m=>m.key===p.metodo)?.label||p.metodo}:</span><span>$${Number(p.monto_usd).toFixed(2)}</span></div>`).join('')}
  <div class="divider"></div>
  <p class="center small">${config?.ticket_pie || 'Gracias por su compra!'}</p>
  <p class="center small">Tasa: Bs. ${Number(tasa).toFixed(2)}/$</p>
  </body></html>`)
  w.document.close()
  setTimeout(() => { w.print(); w.close() }, 400)
}

// ── Payment Modal ─────────────────────────────────────────────────────────────
function PagoModal({ cart, totalFinal, exactTotalVes, tasa, config, onClose, onConfirm }) {
  const [pagos, setPagos] = useState({ efectivo_usd: '', efectivo_ves: '', pago_movil: '', transferencia: '' })
  const [clienteNombre, setClienteNombre] = useState('')
  const [saving, setSaving] = useState(false)

  const totalPagadoUsd = Object.entries(pagos).reduce((acc, [key, val]) => {
    if (!val || val === '') return acc
    const num = parseFloat(val) || 0
    if (key === 'efectivo_usd') return acc + num
    return acc + (num / tasa)
  }, 0)
  
  const totalPagadoVes = Object.entries(pagos).reduce((acc, [key, val]) => {
    if (!val || val === '') return acc
    const num = parseFloat(val) || 0
    if (key === 'efectivo_usd') return acc + (num * tasa)
    return acc + num
  }, 0)

  const faltaUsd = Math.max(0, totalFinal - totalPagadoUsd)
  const faltaVes = Math.max(0, exactTotalVes - totalPagadoVes)
  
  const vueltoUsd = totalPagadoUsd > totalFinal ? totalPagadoUsd - totalFinal : 0
  const vueltoVes = totalPagadoVes > exactTotalVes ? totalPagadoVes - exactTotalVes : 0
  
  const esCredito = faltaUsd > 0.005

  const confirm = async () => {
    if (esCredito && !clienteNombre.trim()) { alert('Se requiere nombre del cliente para ventas a crédito'); return }
    setSaving(true)
    try {
      const pagosArr = Object.entries(pagos)
        .filter(([_, v]) => parseFloat(v) > 0)
        .map(([key, val]) => {
          const num = parseFloat(val) || 0
          const isVes = key !== 'efectivo_usd'
          return {
            metodo: key,
            monto_usd: isVes ? num / tasa : num,
            monto_ves: isVes ? num : num * tasa,
          }
        })

      await onConfirm({ pagosArr, clienteNombre, esCredito, falta: faltaUsd })
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal-lg">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold">💳 Registrar Pago</h2>
          <button onClick={onClose} className="btn-ghost btn-sm text-xl">✕</button>
        </div>

        <div className="bg-brand-900/30 border border-brand-500/30 rounded-xl p-4 mb-5 text-center">
          <p className="text-gray-400 text-sm">Total a cobrar</p>
          <p className="text-3xl font-bold text-white">${Number(totalFinal).toFixed(2)}</p>
          <p className="text-sm text-gray-400">Bs. {exactTotalVes.toLocaleString('es-VE',{maximumFractionDigits:2})}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {METODOS.map(m => (
            <div key={m.key}>
              <label className="label">{m.icon} {m.label}</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="0.00"
                value={pagos[m.key]} onChange={e => setPagos(p => ({ ...p, [m.key]: e.target.value }))} />
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-surface-700 rounded-xl p-4 space-y-2 text-sm mb-4">
          <div className="flex justify-between"><span className="text-gray-400">Total pagado:</span><span className="text-white font-semibold">${totalPagadoUsd.toFixed(2)} / Bs.{totalPagadoVes.toLocaleString('es-VE',{maximumFractionDigits:2})}</span></div>
          {faltaUsd > 0.005 && <div className="flex justify-between"><span className="text-red-400">Falta por pagar:</span><span className="text-red-400 font-bold">${faltaUsd.toFixed(2)} / Bs.{faltaVes.toLocaleString('es-VE',{maximumFractionDigits:2})}</span></div>}
          {vueltoUsd > 0.005 && <div className="flex justify-between"><span className="text-accent-green">Vuelto:</span><span className="text-accent-green font-bold">${vueltoUsd.toFixed(2)} / Bs.{vueltoVes.toLocaleString('es-VE',{maximumFractionDigits:2})}</span></div>}
        </div>

        {esCredito && (
          <div className="mb-4 p-3 bg-accent-yellow/10 border border-accent-yellow/30 rounded-xl">
            <p className="text-accent-yellow text-sm mb-2">⚠️ Esta venta quedará como <strong>crédito</strong>. Se require nombre del cliente.</p>
            <input className="input" required placeholder="Nombre del cliente *"
              value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} />
          </div>
        )}

        <div className="flex gap-3 justify-end flex-wrap">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={confirm} disabled={saving || (totalPagadoUsd < 0.005 && !esCredito)}
            className="btn-success btn-lg">
            {saving ? '⏳ Guardando...' : esCredito ? '📋 Guardar como Crédito' : '✅ Confirmar Venta'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Copy service line entry ───────────────────────────────────────────────────
function ServicioCopioModal({ servicio, onClose, onAdd }) {
  const { fmt, tasa } = useApp()
  const [cant, setCant] = useState(1)
  const [hojas, setHojas] = useState(1)
  
  const isVes = servicio.moneda_precio === 'ves'
  const subtotal_usd = isVes ? (servicio.precio_ves / tasa) * cant : servicio.precio_usd * cant
  const subtotal_ves = isVes ? servicio.precio_ves * cant : subtotal_usd * tasa

  const add = () => onAdd({
    tipo: 'servicio', ref_id: servicio.id,
    nombre: servicio.nombre, cantidad: parseInt(cant),
    cantidad_hojas_gastadas: parseInt(hojas),
    precio_unitario_usd: isVes ? (servicio.precio_ves / tasa) : servicio.precio_usd,
    subtotal_usd: subtotal_usd,
    precio_unitario_ves: servicio.precio_ves || 0,
    subtotal_ves: subtotal_ves,
    moneda_precio: servicio.moneda_precio || 'usd',
    insumo_id: servicio.insumo_id,
  })

  return (
    <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">{servicio.nombre}</h2>
          <button onClick={onClose} className="btn-ghost btn-sm">✕</button>
        </div>
        <div className="space-y-4">
          <div><label className="label">Cantidad a cobrar (copias)</label>
            <input className="input" type="number" min="1" value={cant} onChange={e=>setCant(e.target.value)} /></div>
          <div><label className="label">Hojas gastadas (incluyendo errores)</label>
            <input className="input" type="number" min="1" value={hojas} onChange={e=>setHojas(e.target.value)} />
            <p className="text-xs text-gray-500 mt-1">Se cobran {cant} copias pero se descuentan {hojas} hojas del inventario.</p></div>
          <div className="bg-surface-700 rounded-xl p-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Subtotal:</span><span className="font-bold text-white">{fmt(subtotal_usd)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">En Bs.:</span><span className="text-gray-300">Bs. {subtotal_ves.toLocaleString('es-VE',{maximumFractionDigits:2})}</span></div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary">Cancelar</button>
            <button onClick={add} className="btn-primary">➕ Agregar al carrito</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── POS Main ──────────────────────────────────────────────────────────────────
export default function POS() {
  const { fmt, toVes, tasa, config } = useApp()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [cart, setCart] = useState([])
  const [descuento, setDescuento] = useState('')
  const [tipoDescuento, setTipoDescuento] = useState('usd') // 'usd', 'ves', 'perc'
  const [modal, setModal] = useState(null)
  const [selectedResult, setSelectedResult] = useState(null)
  const [lastVenta, setLastVenta] = useState(null)
  const [showSearch, setShowSearch] = useState(false)
  const [alertMsg, setAlertMsg] = useState('')
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const searchRef = useRef(null)

  // Real-time search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      const [prods, srvs] = await Promise.all([
        window.api.invoke('productos:search', query),
        window.api.invoke('servicios:search', query),
      ])
      setResults([
        ...prods.map(p => ({ ...p, _type: 'producto' })),
        ...srvs.map(s => ({ ...s, _type: 'servicio' })),
      ])
      setShowSearch(true)
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  const addToCart = (item) => {
    if (item._type === 'servicio') {
      setSelectedResult(item); setModal('servicio_copia'); return
    }
    setCart(prev => {
      const exists = prev.find(c => c.ref_id === item.id && c.tipo === 'producto')
      if (exists) {
        if (exists.cantidad >= item.stock_actual) {
          setAlertMsg(`Solo quedan ${item.stock_actual} en stock de ${item.nombre}`)
          return prev
        }
        return prev.map(c => c.ref_id === item.id && c.tipo === 'producto'
          ? { ...c, cantidad: c.cantidad + 1, subtotal_usd: (c.cantidad + 1) * c.precio_unitario_usd }
          : c)
      }
      if (item.stock_actual < 1) {
        setAlertMsg(`No hay stock disponible de ${item.nombre}`)
        return prev
      }
      return [...prev, { 
        tipo: 'producto', 
        ref_id: item.id, 
        nombre: item.nombre, 
        cantidad: 1, 
        precio_unitario_usd: item.precio_venta_usd,
        subtotal_usd: item.precio_venta_usd, 
        precio_unitario_ves: item.precio_venta_ves,
        subtotal_ves: item.precio_venta_ves,
        moneda_precio: item.moneda_precio,
        stock_actual: item.stock_actual 
      }]
    })
    setQuery(''); setResults([]); setShowSearch(false)
  }

  const handleScan = async (code) => {
    // Exact match search for the barcode
    const prods = await window.api.invoke('productos:search', code)
    const exactMatch = prods.find(p => p.codigo === code)
    if (exactMatch) {
      addToCart({ ...exactMatch, _type: 'producto' })
    } else {
      setAlertMsg(`No se encontró ningún producto con el código: ${code}`)
    }
  }

  const updateQty = (idx, qty) => {
    if (qty < 1) { removeItem(idx); return }
    setCart(prev => {
      const item = prev[idx]
      if (item.tipo === 'producto' && qty > item.stock_actual) {
        setAlertMsg(`Solo quedan ${item.stock_actual} en stock de ${item.nombre}`)
        return prev.map((c, i) => i===idx ? { ...c, cantidad: item.stock_actual, subtotal_usd: item.stock_actual * c.precio_unitario_usd, subtotal_ves: item.stock_actual * (c.precio_unitario_ves || 0) } : c)
      }
      return prev.map((c, i) => i===idx ? { ...c, cantidad: qty, subtotal_usd: qty * c.precio_unitario_usd, subtotal_ves: qty * (c.precio_unitario_ves || 0) } : c)
    })
  }
  const removeItem = (idx) => setCart(prev => prev.filter((_, i) => i!==idx))
  const clearCart = () => { setCart([]); setDescuento(''); setLastVenta(null) }

  const subtotal_usd = cart.reduce((s, c) => s + c.subtotal_usd, 0)
  const subtotal_ves = cart.reduce((s, c) => s + (c.moneda_precio === 'ves' ? c.subtotal_ves : c.subtotal_usd * tasa), 0)

  const valorInput = parseFloat(descuento) || 0
  let descValUsd = 0
  if (tipoDescuento === 'usd') {
    descValUsd = valorInput
  } else if (tipoDescuento === 'ves') {
    descValUsd = tasa > 0 ? valorInput / tasa : 0
  } else if (tipoDescuento === 'perc') {
    descValUsd = (subtotal_usd * valorInput) / 100
  }

  // Safety bounds
  if (isNaN(descValUsd) || descValUsd < 0) descValUsd = 0
  if (descValUsd > subtotal_usd) descValUsd = subtotal_usd

  const ratioDescuento = subtotal_usd > 0 ? descValUsd / subtotal_usd : 0
  const descValVes = subtotal_ves * ratioDescuento
  
  const totalFinalUsd = Math.max(0, subtotal_usd - descValUsd)
  const totalFinalVes = Math.max(0, subtotal_ves - descValVes)

  const confirmarVenta = async ({ pagosArr, clienteNombre, esCredito, falta }) => {
    const cabecera = {
      subtotal_usd: subtotal_usd,
      descuento_otorgado_usd: descValUsd,
      total_usd: totalFinalUsd,
      tasa_cambio: tasa,
      estado: esCredito ? 'credito' : 'pagada',
      cliente_nombre: clienteNombre || '',
      saldo_pendiente_usd: esCredito ? falta : 0,
      notas: '',
    }
    const result = await window.api.invoke('ventas:create', { cabecera, detalles: cart, pagos: pagosArr })
    const ventaConId = { ...cabecera, id: result.id }
    setLastVenta({ venta: ventaConId, detalles: cart, pagos: pagosArr })
    setModal(null)
    clearCart()
    setModal('ticket')
  }

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Left: search + cart */}
      <div className="flex-1 flex flex-col p-3 sm:p-5 gap-3 sm:gap-4 overflow-hidden min-h-0">
        <div className="flex items-center gap-3">
          <h1 className="page-title whitespace-nowrap">🛒 <span className="hidden sm:inline">Punto de </span>Venta</h1>
          <div className="ml-auto bg-surface-700 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-400">
            Tasa: <span className="font-mono text-brand-400 font-bold">Bs. {Number(tasa).toFixed(2)}</span>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2 relative">
          <div className="relative flex-1">
            <input ref={searchRef} className="input text-base pr-10 w-full"
              placeholder="🔍 Buscar producto o servicio..."
              value={query} onChange={e => setQuery(e.target.value)}
              onFocus={() => results.length && setShowSearch(true)}
              onBlur={() => setTimeout(() => setShowSearch(false), 200)} />
            {query && <button className="absolute right-3 top-2.5 text-gray-400 hover:text-white" onClick={()=>{setQuery('');setResults([])}}>✕</button>}
          </div>
          <button onClick={() => setScannerOpen(true)} className="btn-secondary px-4 shrink-0" title="Escanear Código">
            <LuCamera className="text-xl text-brand-400" />
          </button>
          {showSearch && results.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-surface-700 border border-white/10 rounded-xl shadow-2xl z-30 max-h-72 overflow-y-auto animate-slide-in">
              {results.map((r, i) => (
                <button key={i} onMouseDown={() => addToCart(r)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-600 text-left border-b border-white/5 last:border-0">
                  <div>
                    <span className={`badge-sm mr-2 text-xs ${r._type==='servicio' ? 'badge-purple' : 'badge-blue'}`}>{r._type==='servicio'?'🖨️':'📦'}</span>
                    <span className="text-white text-sm font-medium">{r.nombre}</span>
                    {r.codigo && <span className="text-gray-500 text-xs ml-2 font-mono">{r.codigo}</span>}
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-sm">{fmt(r.precio_venta_usd || r.precio_usd)}</p>
                    {r._type==='producto' && <p className="text-xs text-gray-500">Stock: {r.stock_actual}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="flex-1 overflow-y-auto card min-h-0">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-3">
              <LuShoppingCart className="text-5xl opacity-20" />
              <p>El carrito está vacío</p>
              <p className="text-sm text-gray-500">Busca un producto para comenzar</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr>
                <th>Producto / Servicio</th>
                <th className="text-center w-24 sm:w-28">Cant.</th>
                <th className="text-right hidden sm:table-cell">P. Unit</th>
                <th className="text-right">Subtotal</th>
                <th></th>
              </tr></thead>
              <tbody>
                {cart.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <p className="font-medium text-white text-xs sm:text-sm">{item.nombre}</p>
                      {item.tipo === 'producto' && <p className="text-xs text-brand-400">Stock: {item.stock_actual}</p>}
                      {item.cantidad_hojas_gastadas > 0 && <p className="text-xs text-gray-500">{item.cantidad_hojas_gastadas} hojas gastadas</p>}
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                        <button onClick={()=>updateQty(i,item.cantidad-1)} className="btn-ghost btn-sm w-6 h-6 p-0">-</button>
                        <input type="number" min="1" value={item.cantidad}
                          onChange={e=>updateQty(i,parseInt(e.target.value)||1)}
                          className="input-sm w-10 sm:w-14 text-center" />
                        <button onClick={()=>updateQty(i,item.cantidad+1)} className="btn-ghost btn-sm w-6 h-6 p-0">+</button>
                      </div>
                    </td>
                    <td className="text-right hidden sm:table-cell">
                      <p className="font-semibold text-white">Bs. {(item.moneda_precio === 'ves' ? item.precio_unitario_ves : item.precio_unitario_usd * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-[10px] text-gray-500">{fmt(item.precio_unitario_usd)} USD</p>
                    </td>
                    <td className="text-right">
                      <p className="font-bold text-brand-400 text-xs sm:text-sm">Bs. {(item.moneda_precio === 'ves' ? item.subtotal_ves : item.subtotal_usd * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-[10px] text-gray-400">{fmt(item.subtotal_usd)} USD</p>
                    </td>
                    <td><button onClick={()=>removeItem(i)} className="btn-ghost btn-sm text-red-400">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right: totals panel — always visible on md+, collapsible on mobile */}
      <div className={`md:w-80 bg-surface-800 border-t md:border-t-0 md:border-l border-white/5 md:flex md:flex-col md:p-5 md:gap-4 ${
        cart.length > 0 ? '' : 'hidden md:flex'
      }`}>
        {/* Mobile toggle header */}
        <button
          className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 w-full"
          onClick={() => setSummaryOpen(o => !o)}
        >
          <span className="font-bold text-white">Resumen del pedido</span>
          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="text-brand-400 font-bold text-sm">Bs. {totalFinalVes.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
              <p className="text-gray-400 text-[10px]">{fmt(totalFinalUsd)} USD</p>
            </div>
            <span className="text-gray-400 text-xs">{summaryOpen ? '▲' : '▼'}</span>
          </div>
        </button>

        {/* Panel content */}
        <div className={`flex flex-col gap-4 p-4 md:p-0 md:flex-1 ${
          summaryOpen ? 'flex' : 'hidden md:flex'
        }`}>
          <h2 className="font-bold text-lg text-white hidden md:block">Resumen</h2>

          <div className="space-y-3 md:flex-1">
            <div className="flex justify-between text-sm"><span className="text-gray-400">Subtotal:</span><span className="text-white">{fmt(subtotal_usd)}</span></div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-400">Descuento</label>
                <div className="flex bg-surface-700 rounded-lg p-0.5 border border-white/5">
                  {[
                    { id: 'usd', label: '$' },
                    { id: 'ves', label: 'Bs' },
                    { id: 'perc', label: '%' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setTipoDescuento(t.id); setDescuento('') }}
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all ${tipoDescuento === t.id ? 'bg-brand-600 text-white shadow-glow' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <input 
                className="input input-sm" 
                type="text" 
                placeholder={tipoDescuento === 'perc' ? "0 %" : tipoDescuento === 'ves' ? "0.00 Bs" : "0.00 $"}
                value={descuento} 
                onChange={e => {
                  let v = e.target.value;
                  // Allow empty or just a minus/dot initially
                  if (v === '' || v === '.') {
                    setDescuento(v);
                    return;
                  }
                  
                  // Only allow valid numbers
                  if (!/^\d*\.?\d*$/.test(v)) return;

                  const num = parseFloat(v);
                  // Validation
                  if (tipoDescuento === 'perc' && num > 100) return;
                  if (tipoDescuento === 'usd' && num > subtotal_usd) return;
                  if (tipoDescuento === 'ves' && num > subtotal_ves) return;
                  
                  setDescuento(v);
                }} 
              />
            </div>

            <div className="border-t border-white/10 pt-3">
              <div className="flex justify-between items-baseline">
                <span className="text-gray-300 font-medium">Total Final:</span>
                <span className="text-2xl font-bold text-brand-400">Bs. {totalFinalVes.toLocaleString('es-VE',{maximumFractionDigits:2})}</span>
              </div>
              <p className="text-right text-xs text-gray-500 mt-1">Equivalente: {fmt(totalFinalUsd)} USD</p>
            </div>
          </div>

          <div className="space-y-2">
            <button onClick={() => cart.length && setModal('pago')} disabled={cart.length === 0}
              className="btn-success btn-lg w-full flex flex-col items-center py-2">
              <span className="text-base">💳 COBRAR</span>
              {cart.length > 0 && (
                <span className="text-[10px] opacity-90">
                  Bs. {totalFinalVes.toLocaleString('es-VE', { maximumFractionDigits: 2 })} ({fmt(totalFinalUsd)} USD)
                </span>
              )}
            </button>
            <button onClick={clearCart} disabled={cart.length===0} className="btn-ghost w-full text-sm">
              🗑️ Limpiar carrito
            </button>
          </div>
        </div>
      </div>

      {/* Service copy modal */}
      {modal === 'servicio_copia' && selectedResult && (
        <ServicioCopioModal servicio={selectedResult} onClose={()=>setModal(null)}
          onAdd={item => { setCart(p=>[...p,item]); setModal(null); setQuery(''); setResults([]) }} />
      )}

      {/* Payment modal */}
      {modal === 'pago' && (
        <PagoModal cart={cart} totalFinal={totalFinalUsd} exactTotalVes={totalFinalVes} tasa={tasa} config={config}
          onClose={()=>setModal(null)} onConfirm={confirmarVenta} />
      )}

      {/* Ticket modal */}
      {modal === 'ticket' && lastVenta && (
        <div className="modal-backdrop">
          <div className="modal text-center">
            <LuCircleCheck className="text-6xl text-accent-green mb-4 mx-auto" />
            <h2 className="text-xl font-bold text-white mb-1">¡Venta Registrada!</h2>
            <p className="text-gray-400 text-sm mb-6 flex items-center justify-center gap-1.5">
              Venta #{lastVenta.venta.id} · {lastVenta.venta.estado === 'credito' ? <><LuClipboardList className="text-accent-yellow" /> A crédito</> : 'Pagada'}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={()=>setModal(null)} className="btn-secondary">Cerrar</button>
              <button onClick={()=>printTicket({...lastVenta, config, tasa})} className="btn-primary">🖨️ Imprimir Ticket</button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertMsg && (
        <AlertModal
          title="Aviso"
          message={alertMsg}
          onClose={() => setAlertMsg('')}
        />
      )}

      {/* Barcode Scanner Modal */}
      {scannerOpen && (
        <ScannerModal
          onDetected={(code) => {
            setScannerOpen(false)
            handleScan(code)
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  )
}
