import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

if (typeof window !== 'undefined' && !window.api) {
  window.api = {
    invoke: async (channel, ...args) => {
      try {
        const res = await fetch('/api/invoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel, args })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        return data.result;
      } catch (err) {
        console.error(`[API Polyfill] Error on channel ${channel}:`, err);
        throw err;
      }
    }
  };
  console.log('[API Polyfill] Running in browser mode. HTTP bridge attached.');
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [config, setConfig]   = useState({})
  const [loading, setLoading] = useState(true)

  // ── Theme (persisted in localStorage, applied to <html> element) ──────────
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('jauv-theme') || 'dark'
  })

  // Apply class to <html> whenever theme changes
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('jauv-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }, [])

  // ── Config (persisted in SQLite via Electron config:* channels) ──────────
  const loadConfig = useCallback(async () => {
    try {
      const cfg = await window.api.invoke('config:getAll')
      setConfig(cfg)
    } catch (e) {
      console.error('Config load error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  const updateConfig = useCallback(async (clave, valor) => {
    await window.api.invoke('config:set', clave, valor)
    setConfig(prev => ({ ...prev, [clave]: valor }))
  }, [])

  // ── Currency formatter ────────────────────────────────────────────────────
  const fmt = useCallback((ves) => {
    return `Bs. ${Number(ves || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }, [])

  return (
    <AppContext.Provider value={{ config, loading, loadConfig, updateConfig, fmt, theme, toggleTheme }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
