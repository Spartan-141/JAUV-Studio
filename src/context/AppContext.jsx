import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [tasa, setTasa] = useState(40.0)
  const [config, setConfig] = useState({})
  const [loading, setLoading] = useState(true)

  const loadConfig = useCallback(async () => {
    if (!window.api) {
      setLoading(false)
      return
    }
    try {
      const cfg = await window.api.invoke('config:getAll')
      setConfig(cfg)
      setTasa(parseFloat(cfg.tasa_del_dia) || 40.0)
    } catch (e) {
      console.error('Config load error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  const updateTasa = useCallback(async (nuevaTasa) => {
    const val = parseFloat(nuevaTasa)
    if (isNaN(val) || val <= 0) return
    await window.api.invoke('config:set', 'tasa_del_dia', String(val))
    setTasa(val)
    setConfig(prev => ({ ...prev, tasa_del_dia: String(val) }))
  }, [])

  const updateConfig = useCallback(async (clave, valor) => {
    await window.api.invoke('config:set', clave, valor)
    setConfig(prev => ({ ...prev, [clave]: valor }))
  }, [])

  // Formatting utilities
  const fmt = useCallback((usd, currency = 'USD') => {
    if (currency === 'USD') return `$${Number(usd || 0).toFixed(2)}`
    const ves = (usd || 0) * tasa
    return `Bs. ${ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }, [tasa])

  const toVes = useCallback((usd) => (usd || 0) * tasa, [tasa])
  const toUsd = useCallback((ves) => (ves || 0) / tasa, [tasa])

  return (
    <AppContext.Provider value={{ tasa, config, loading, loadConfig, updateTasa, updateConfig, fmt, toVes, toUsd }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
