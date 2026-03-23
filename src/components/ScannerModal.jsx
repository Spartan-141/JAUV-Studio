import React, { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { LuCamera, LuCameraOff, LuRefreshCw, LuZap } from 'react-icons/lu'

const SCANNER_ELEMENT_ID = 'jauv-barcode-scanner-region'

/**
 * ScannerModal — Opens a live camera feed and scans for barcodes.
 * Works in both Electron (desktop camera / DroidCam) and browser.
 *
 * Props:
 *   onDetected(code: string) — called once with the decoded barcode string then the modal closes
 *   onClose() — called when user dismisses the modal
 */
export default function ScannerModal({ onDetected, onClose }) {
  const html5QrRef = useRef(null)
  const [cameras, setCameras] = useState([])
  const [selectedCam, setSelectedCam] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)
  const [lastCode, setLastCode] = useState(null)
  const detectedRef = useRef(false) // prevent double-fire

  // On mount: enumerate cameras
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then(devices => {
        if (!devices || devices.length === 0) {
          setError('No se encontraron cámaras. Asegúrate de que DroidCam esté activo.')
          return
        }
        setCameras(devices)
        // Prefer the last camera (usually the external/DroidCam on desktop)
        setSelectedCam(devices[devices.length - 1].id)
      })
      .catch(err => {
        console.error('[Scanner] getCameras error:', err)
        setError('No se puede acceder a la cámara. Verifica los permisos.')
      })
    return () => stopScanner()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Start / stop scanner when selectedCam changes
  useEffect(() => {
    if (selectedCam) startScanner(selectedCam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCam])

  const startScanner = async (cameraId) => {
    if (scanning) await stopScanner()
    setError(null)
    detectedRef.current = false

    try {
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID)
      html5QrRef.current = scanner

      await scanner.start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.5,
          disableFlip: false,
        },
        (decodedText) => {
          if (detectedRef.current) return // already fired
          detectedRef.current = true
          setLastCode(decodedText)
          // Small delay so user sees the "detected" flash before closing
          setTimeout(() => {
            stopScanner()
            onDetected(decodedText)
          }, 350)
        },
        () => {} // ignore frame-level scan errors (no code in view)
      )
      setScanning(true)
    } catch (err) {
      console.error('[Scanner] start error:', err)
      setError(`Error al iniciar la cámara: ${err.message || err}`)
      setScanning(false)
    }
  }

  const stopScanner = async () => {
    if (html5QrRef.current) {
      try {
        if (html5QrRef.current.isScanning) {
          await html5QrRef.current.stop()
        }
        html5QrRef.current.clear()
      } catch { /* ignore stop errors */ }
      html5QrRef.current = null
    }
    setScanning(false)
  }

  const handleClose = async () => {
    await stopScanner()
    onClose()
  }

  const switchCamera = async (camId) => {
    await stopScanner()
    setSelectedCam(camId)
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="modal max-w-lg" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <LuCamera className="text-brand-400 text-xl" />
            <div>
              <h2 className="text-base font-bold text-white">Escanear Código de Barras</h2>
              <p className="text-xs text-gray-500">Apunta la cámara al código del producto</p>
            </div>
          </div>
          <button onClick={handleClose} className="btn-ghost btn-sm text-lg">✕</button>
        </div>

        {/* Camera selector */}
        {cameras.length > 1 && (
          <div className="flex gap-2 mb-3">
            <select
              className="select text-xs flex-1"
              value={selectedCam || ''}
              onChange={e => switchCamera(e.target.value)}
            >
              {cameras.map(c => (
                <option key={c.id} value={c.id}>{c.label || `Cámara ${c.id.slice(0, 8)}...`}</option>
              ))}
            </select>
            <button
              onClick={() => switchCamera(selectedCam)}
              className="btn-secondary btn-sm"
              title="Reiniciar cámara"
            >
              <LuRefreshCw className={scanning ? '' : 'animate-spin'} />
            </button>
          </div>
        )}

        {/* Scanner viewport */}
        <div className="relative rounded-xl overflow-hidden bg-black" style={{ minHeight: '240px' }}>
          <div id={SCANNER_ELEMENT_ID} className="w-full" />

          {/* Scan line animation */}
          {scanning && !lastCode && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-[10%] right-[10%] top-[20%] bottom-[20%] border-2 border-brand-400/60 rounded-lg">
                <div className="absolute inset-x-0 h-0.5 bg-brand-400/80 animate-[scanLine_2s_ease-in-out_infinite]"
                  style={{ top: '50%', boxShadow: '0 0 8px #6366f1' }} />
              </div>
            </div>
          )}

          {/* Detection flash */}
          {lastCode && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-accent-green/20 border-2 border-accent-green rounded-xl">
              <LuZap className="text-accent-green text-4xl mb-2" />
              <p className="text-accent-green font-bold text-lg">¡Detectado!</p>
              <p className="text-white font-mono text-sm mt-1 bg-black/40 px-3 py-1 rounded-lg">{lastCode}</p>
            </div>
          )}

          {/* Error or no camera state */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-800">
              <LuCameraOff className="text-red-400 text-4xl mb-3" />
              <p className="text-red-400 text-sm text-center px-4">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {!scanning && !error && !lastCode && cameras.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-800">
              <div className="text-center">
                <LuCamera className="text-brand-400 text-4xl mx-auto mb-2 animate-pulse" />
                <p className="text-gray-400 text-sm">Iniciando cámara...</p>
              </div>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${scanning ? 'bg-accent-green animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-xs text-gray-400">{scanning ? 'Cámara activa' : 'Cámara inactiva'}</span>
          </div>
          <button onClick={handleClose} className="btn-secondary btn-sm">Cancelar</button>
        </div>
      </div>
    </div>
  )
}
