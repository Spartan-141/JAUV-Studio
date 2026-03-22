import React, { useState } from 'react'
import { LuLayoutDashboard, LuShoppingCart, LuPackage, LuPrinter, LuClipboardList, LuChartColumn, LuPencil, LuCheck, LuStore, LuX } from 'react-icons/lu'
import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import SplashScreen from './components/SplashScreen.jsx'
import logoLateral from '../img/logo_barra_lateral.png'
import { AppProvider, useApp } from './context/AppContext.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Inventario from './pages/Inventario.jsx'
import CentroCopiado from './pages/CentroCopiado.jsx'
import POS from './pages/POS.jsx'
import CuentasPorCobrar from './pages/CuentasPorCobrar.jsx'
import Reportes from './pages/Reportes.jsx'

const NAV_ITEMS = [
  { to: '/',          icon: <LuLayoutDashboard />, label: 'Dashboard' },
  { to: '/pos',       icon: <LuShoppingCart />,    label: 'Ventas' },
  { to: '/inventario',icon: <LuPackage />,         label: 'Inventario' },
  { to: '/copiado',   icon: <LuPrinter />,         label: 'Copiado' },
  { to: '/cuentas',   icon: <LuClipboardList />,   label: 'Cobrar' },
  { to: '/reportes',  icon: <LuChartColumn />,     label: 'Reportes' },
]

function ExchangeRateBar() {
  const { tasa, updateTasa } = useApp()
  const [editing, setEditing] = React.useState(false)
  const [val, setVal] = React.useState('')

  const start = () => { setVal(String(tasa)); setEditing(true) }
  const save = async () => {
    await updateTasa(val)
    setEditing(false)
  }

  return (
    <div className="px-4 py-4 border-t border-white/5">
      <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Tasa del Día</p>
      {editing ? (
        <div className="flex gap-2">
          <input
            className="input flex-1 text-sm h-9"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
            autoFocus
            type="number" min="0.01" step="0.01"
          />
          <button onClick={save} className="btn-primary w-9 h-9 flex items-center justify-center"><LuCheck className="text-lg" /></button>
        </div>
      ) : (
        <button onClick={start}
          className="w-full flex items-center justify-between bg-brand-900/40 border border-brand-500/30 rounded-xl px-3 py-2 hover:border-brand-500 transition-colors group">
          <span className="text-white font-mono font-bold">Bs. {Number(tasa).toFixed(2)}</span>
          <span className="text-brand-400 group-hover:text-brand-300"><LuPencil className="text-sm" /></span>
        </button>
      )}
    </div>
  )
}

/* ─── Desktop Sidebar ──────────────────────────────────────────────────────── */
function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-64 bg-surface-800 border-r border-white/5 shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-center">
        <img src={logoLateral} alt="JAUV Studio" className="h-10 w-auto object-contain" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-brand-600/80 text-white shadow-glow'
                  : 'text-gray-400 hover:bg-surface-700 hover:text-white'
              }`
            }>
            <span className="text-lg w-6 flex items-center justify-center">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Exchange rate footer */}
      <ExchangeRateBar />
    </aside>
  )
}

/* ─── Mobile Bottom Nav ────────────────────────────────────────────────────── */
function BottomNav({ onTasaOpen }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-800/95 backdrop-blur-lg border-t border-white/5 safe-area-bottom">
      <div className="flex items-stretch">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-all duration-150 ${
                isActive
                  ? 'text-brand-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`
            }>
            {({ isActive }) => (
              <>
                <span className={`text-xl transition-transform duration-150 ${isActive ? 'scale-110' : ''}`}>{icon}</span>
                <span>{label}</span>
                {isActive && <span className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-0.5 bg-brand-400 rounded-full" />}
              </>
            )}
          </NavLink>
        ))}

        {/* Tasa button */}
        <button
          onClick={onTasaOpen}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-gray-500 hover:text-brand-400 transition-colors">
          <span className="text-xl"><LuPencil /></span>
          <span>Tasa</span>
        </button>
      </div>
    </nav>
  )
}

/* ─── Mobile Tasa Drawer ───────────────────────────────────────────────────── */
function TasaDrawer({ open, onClose }) {
  const { tasa, updateTasa } = useApp()
  const [val, setVal] = React.useState('')

  React.useEffect(() => {
    if (open) setVal(String(tasa))
  }, [open, tasa])

  const save = async () => {
    await updateTasa(val)
    onClose()
  }

  if (!open) return null

  return (
    <div className="md:hidden fixed inset-0 z-50 flex items-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full bg-surface-800 rounded-t-3xl border-t border-white/10 p-6 pb-10 z-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white">Tasa del Día</h2>
            <p className="text-xs text-gray-500">Tasa BCV actual: Bs. {Number(tasa).toFixed(2)}/$</p>
          </div>
          <button onClick={onClose} className="btn-ghost btn-sm text-xl"><LuX /></button>
        </div>
        <label className="label">Nueva tasa (Bs./$)</label>
        <input
          className="input text-xl font-mono text-center mb-4"
          type="number" min="0.01" step="0.01"
          value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          autoFocus
        />
        <button onClick={save} className="btn-primary w-full btn-lg">
          <LuCheck /> Guardar Tasa
        </button>
      </motion.div>
    </div>
  )
}

/* ─── Main Layout ──────────────────────────────────────────────────────────── */
function Layout() {
  const [tasaOpen, setTasaOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden bg-surface-900">
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/pos"        element={<POS />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/copiado"    element={<CentroCopiado />} />
          <Route path="/cuentas"    element={<CuentasPorCobrar />} />
          <Route path="/reportes"   element={<Reportes />} />
        </Routes>
      </main>
      <BottomNav onTasaOpen={() => setTasaOpen(true)} />
      <AnimatePresence>
        {tasaOpen && <TasaDrawer open={tasaOpen} onClose={() => setTasaOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <AppProvider>
      <HashRouter>
        <AnimatePresence>
          {isLoading && <SplashScreen key="splash" onComplete={() => setIsLoading(false)} />}
        </AnimatePresence>
        <Layout />
      </HashRouter>
    </AppProvider>
  )
}
