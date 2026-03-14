import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { format } from 'date-fns'
import AlertModal from '../components/AlertModal.jsx'

const METODOS = [
  { key: 'efectivo_usd', label: '$ Efectivo USD', icon: '💵' },
  { key: 'efectivo_ves', label: 'Bs. Efectivo', icon: '💴' },
  { key: 'pago_movil',   label: 'Bs. Pago Móvil', icon: '📱' },
  { key: 'transferencia',label: 'Bs. Transferencia', icon: '🏦' },
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
function PagoModal({ cart, totalFinal, tasa, config, onClose, onConfirm }) {
  const { toVes } = useApp()
  const [pagos, setPagos] = useState({ efectivo_usd: '', efectivo_ves: '', pago_movil: '', transferencia: '' })
  const [clienteNombre, setClienteNombre] = useState('')
  const [saving, setSaving] = useState(false)

  const totalPagadoUsd = Object.entries(pagos).reduce((acc, [key, val]) => {
    if (!val || val === '') return acc
    const num = parseFloat(val) || 0
    if (key === 'efectivo_usd') return acc + num
    return acc + (num / tasa)
  }, 0)

  const falta = Math.max(0, totalFinal - totalPagadoUsd)
  const vuelto = totalPagadoUsd > totalFinal ? totalPagadoUsd - totalFinal : 0
  const esCredito = falta > 0.005

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

      await onConfirm({ pagosArr, clienteNombre, esCredito, falta })
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
          <p className="text-sm text-gray-400">Bs. {toVes(totalFinal).toLocaleString('es-VE',{maximumFractionDigits:2})}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
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
          <div className="flex justify-between"><span className="text-gray-400">Total pagado:</span><span className="text-white font-semibold">${totalPagadoUsd.toFixed(2)}</span></div>
          {falta > 0.005 && <div className="flex justify-between"><span className="text-red-400">Falta por pagar:</span><span className="text-red-400 font-bold">${falta.toFixed(2)} / Bs.{(falta*tasa).toLocaleString('es-VE',{maximumFractionDigits:2})}</span></div>}
          {vuelto > 0.005 && <div className="flex justify-between"><span className="text-accent-green">Vuelto:</span><span className="text-accent-green font-bold">${vuelto.toFixed(2)}</span></div>}
        </div>

        {esCredito && (
          <div className="mb-4 p-3 bg-accent-yellow/10 border border-accent-yellow/30 rounded-xl">
            <p className="text-accent-yellow text-sm mb-2">⚠️ Esta venta quedará como <strong>crédito</strong>. Se require nombre del cliente.</p>
            <input className="input" required placeholder="Nombre del cliente *"
              value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} />
          </div>
        )}

        <div className="flex gap-3 justify-end">
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
  const { fmt, toVes } = useApp()
  const [cant, setCant] = useState(1)
  const [hojas, setHojas] = useState(1)
  const subtotal = Number(servicio.precio_usd) * cant

  const add = () => onAdd({
    tipo: 'servicio', ref_id: servicio.id,
    nombre: servicio.nombre, cantidad: parseInt(cant),
    cantidad_hojas_gastadas: parseInt(hojas),
    precio_unitario_usd: servicio.precio_usd,
    subtotal_usd: subtotal, insumo_id: servicio.insumo_id,
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
            <div className="flex justify-between"><span className="text-gray-400">Subtotal:</span><span className="font-bold text-white">{fmt(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">En Bs.:</span><span className="text-gray-300">Bs. {toVes(subtotal).toLocaleString('es-VE',{maximumFractionDigits:2})}</span></div>
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
  const [modal, setModal] = useState(null)
  const [selectedResult, setSelectedResult] = useState(null)
  const [lastVenta, setLastVenta] = useState(null)
  const [showSearch, setShowSearch] = useState(false)
  const [alertMsg, setAlertMsg] = useState('')
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
      return [...prev, { tipo:'producto', ref_id: item.id, nombre: item.nombre, cantidad: 1, precio_unitario_usd: item.precio_venta_usd, subtotal_usd: item.precio_venta_usd, stock_actual: item.stock_actual }]
    })
    setQuery(''); setResults([]); setShowSearch(false)
  }

  const updateQty = (idx, qty) => {
    if (qty < 1) { removeItem(idx); return }
    setCart(prev => {
      const item = prev[idx]
      if (item.tipo === 'producto' && qty > item.stock_actual) {
        setAlertMsg(`Solo quedan ${item.stock_actual} en stock de ${item.nombre}`)
        return prev.map((c, i) => i===idx ? { ...c, cantidad: item.stock_actual, subtotal_usd: item.stock_actual * c.precio_unitario_usd } : c)
      }
      return prev.map((c, i) => i===idx ? { ...c, cantidad: qty, subtotal_usd: qty * c.precio_unitario_usd } : c)
    })
  }
  const removeItem = (idx) => setCart(prev => prev.filter((_, i) => i!==idx))
  const clearCart = () => { setCart([]); setDescuento(''); setLastVenta(null) }

  const subtotal = cart.reduce((s, c) => s + c.subtotal_usd, 0)
  const descVal = parseFloat(descuento) || 0
  const totalFinal = Math.max(0, subtotal - descVal)

  const confirmarVenta = async ({ pagosArr, clienteNombre, esCredito, falta }) => {
    const totalPagado = pagosArr.reduce((s, p) => s + p.monto_usd, 0)
    const cabecera = {
      subtotal_usd: subtotal,
      descuento_otorgado_usd: descVal,
      total_usd: totalFinal,
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
    <div className="flex h-full overflow-hidden">
      {/* Left: search + cart */}
      <div className="flex-1 flex flex-col p-5 gap-4 overflow-hidden">
        <div className="flex items-center gap-4">
          <h1 className="page-title whitespace-nowrap">🛒 Punto de Venta</h1>
          {/* Tasa display */}
          <div className="ml-auto bg-surface-700 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-400">
            Tasa: <span className="font-mono text-brand-400 font-bold">Bs. {Number(tasa).toFixed(2)}</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input ref={searchRef} className="input text-base pr-10"
            placeholder="🔍 Buscar producto o servicio (nombre / código)..."
            value={query} onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length && setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)} />
          {query && <button className="absolute right-3 top-2.5 text-gray-400 hover:text-white" onClick={()=>{setQuery('');setResults([])}}>✕</button>}
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
        <div className="flex-1 overflow-y-auto card">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-3">
              <span className="text-5xl">🛒</span>
              <p>El carrito está vacío</p>
              <p className="text-sm">Busca un producto para comenzar</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr><th>Producto / Servicio</th><th className="text-center w-28">Cant.</th><th className="text-right">P. Unit</th><th className="text-right">Subtotal</th><th></th></tr></thead>
              <tbody>
                {cart.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <p className="font-medium text-white">{item.nombre}</p>
                      {item.tipo === 'producto' && <p className="text-xs text-brand-400">Stock: {item.stock_actual}</p>}
                      {item.cantidad_hojas_gastadas > 0 && <p className="text-xs text-gray-500">{item.cantidad_hojas_gastadas} hojas gastadas</p>}
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={()=>updateQty(i,item.cantidad-1)} className="btn-ghost btn-sm w-6 h-6 p-0">-</button>
                        <input type="number" min="1" value={item.cantidad}
                          onChange={e=>updateQty(i,parseInt(e.target.value)||1)}
                          className="input-sm w-14 text-center" />
                        <button onClick={()=>updateQty(i,item.cantidad+1)} className="btn-ghost btn-sm w-6 h-6 p-0">+</button>
                      </div>
                    </td>
                    <td className="text-right text-gray-300">{fmt(item.precio_unitario_usd)}</td>
                    <td className="text-right font-semibold text-white">{fmt(item.subtotal_usd)}</td>
                    <td><button onClick={()=>removeItem(i)} className="btn-ghost btn-sm text-red-400">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right: totals panel */}
      <div className="w-80 bg-surface-800 border-l border-white/5 flex flex-col p-5 gap-4">
        <h2 className="font-bold text-lg text-white">Resumen</h2>

        <div className="space-y-3 flex-1">
          <div className="flex justify-between text-sm"><span className="text-gray-400">Subtotal:</span><span className="text-white">{fmt(subtotal)}</span></div>

          <div>
            <label className="label">Descuento (USD)</label>
            <input className="input" type="number" min="0" step="0.01" placeholder="0.00"
              value={descuento} onChange={e=> { const v=e.target.value; if(parseFloat(v)||0<=subtotal) setDescuento(v) }} />
          </div>

          <div className="border-t border-white/10 pt-3">
            <div className="flex justify-between items-baseline">
              <span className="text-gray-300 font-medium">Total Final:</span>
              <span className="text-2xl font-bold text-white">{fmt(totalFinal)}</span>
            </div>
            <p className="text-right text-xs text-gray-500 mt-1">Bs. {toVes(totalFinal).toLocaleString('es-VE',{maximumFractionDigits:2})}</p>
          </div>

          {/* Breakdown per method hint */}
          <div className="bg-surface-700 rounded-xl p-3 space-y-1 text-xs text-gray-400">
            <p className="font-medium text-white mb-2">Equivalencias:</p>
            {METODOS.map(m => (
              <div key={m.key} className="flex justify-between">
                <span>{m.icon} {m.label}:</span>
                <span className="text-gray-300">
                  {m.key === 'efectivo_ves' ? `Bs. ${toVes(totalFinal).toLocaleString('es-VE',{maximumFractionDigits:2})}` : `$${Number(totalFinal).toFixed(2)}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <button onClick={() => cart.length && setModal('pago')} disabled={cart.length === 0}
            className="btn-success btn-lg w-full">
            💳 COBRAR {cart.length > 0 ? fmt(totalFinal) : ''}
          </button>
          <button onClick={clearCart} disabled={cart.length===0} className="btn-ghost w-full text-sm">
            🗑️ Limpiar carrito
          </button>
        </div>
      </div>

      {/* Service copy modal */}
      {modal === 'servicio_copia' && selectedResult && (
        <ServicioCopioModal servicio={selectedResult} onClose={()=>setModal(null)}
          onAdd={item => { setCart(p=>[...p,item]); setModal(null); setQuery(''); setResults([]) }} />
      )}

      {/* Payment modal */}
      {modal === 'pago' && (
        <PagoModal cart={cart} totalFinal={totalFinal} tasa={tasa} config={config}
          onClose={()=>setModal(null)} onConfirm={confirmarVenta} />
      )}

      {/* Ticket modal */}
      {modal === 'ticket' && lastVenta && (
        <div className="modal-backdrop">
          <div className="modal text-center">
            <div className="text-5xl mb-3">✅</div>
            <h2 className="text-xl font-bold text-white mb-1">¡Venta Registrada!</h2>
            <p className="text-gray-400 text-sm mb-6">Venta #{lastVenta.venta.id} · {lastVenta.venta.estado === 'credito' ? '📋 A crédito' : 'Pagada'}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={()=>setModal(null)} className="btn-secondary">Cerrar</button>
              <button onClick={()=>printTicket({...lastVenta, config, tasa})} className="btn-primary">🖨️ Imprimir Ticket</button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertMsg && (
        <AlertModal
          title="Stock Insuficiente"
          message={alertMsg}
          onClose={() => setAlertMsg('')}
        />
      )}
    </div>
  )
}
