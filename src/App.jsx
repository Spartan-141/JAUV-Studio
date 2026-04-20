import React, { useState } from 'react'
import { LuLayoutDashboard, LuShoppingCart, LuPackage, LuPrinter, LuClipboardList, LuChartColumn } from 'react-icons/lu'
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import SplashScreen from './components/SplashScreen.jsx'
import logoLateral from '../img/logo_barra_lateral.png'
import { AppProvider } from './context/AppContext.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Inventario from './pages/Inventario.jsx'
import CentroCopiado from './pages/CentroCopiado.jsx'
import POS from './pages/POS.jsx'
import CuentasPorCobrar from './pages/CuentasPorCobrar.jsx'
import Reportes from './pages/Reportes.jsx'

const NAV_ITEMS = [
  { to: '/',           icon: <LuLayoutDashboard />, label: 'Dashboard' },
  { to: '/pos',        icon: <LuShoppingCart />,    label: 'Ventas' },
  { to: '/inventario', icon: <LuPackage />,         label: 'Inventario' },
  { to: '/copiado',    icon: <LuPrinter />,         label: 'Copiado' },
  { to: '/cuentas',    icon: <LuClipboardList />,   label: 'Cobrar' },
  { to: '/reportes',   icon: <LuChartColumn />,     label: 'Reportes' },
]

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

      {/* Currency indicator */}
      <div className="px-4 py-4 border-t border-white/5">
        <div className="w-full flex items-center justify-between bg-brand-900/40 border border-brand-500/30 rounded-xl px-3 py-2">
          <span className="text-xs text-gray-400 uppercase tracking-wider">Moneda</span>
          <span className="text-white font-mono font-bold text-sm">Bs. VES</span>
        </div>
      </div>
    </aside>
  )
}

/* ─── Mobile Bottom Nav ────────────────────────────────────────────────────── */
function BottomNav() {
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
      </div>
    </nav>
  )
}

/* ─── Main Layout ──────────────────────────────────────────────────────────── */
function Layout() {
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
      <BottomNav />
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
