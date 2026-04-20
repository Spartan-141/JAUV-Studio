# API HTTP Local

## 🌐 Visión General

Un servidor **Express** corre en el puerto `3001` (en todas las interfaces `0.0.0.0`) cuando la aplicación se inicia. Este servidor HTTP expone todos los handlers IPC a clientes en la red local (tablets, teléfonos, otras PCs).

**Base URL:** `http://<IP-local>:3001`

**Endpoint único:**
```
POST /api/invoke
```

**Motivo:** Permitir acceso a la base de datos desde dispositivos móviles sin necesidad de Electron (solo navegador). Útil para futura app móvil o dashboard web remoto.

---

## 🚀 Inicio del Servidor

**Ubicación:** `electron/api-server.js`

```javascript
function startApiServer() {
  const app = express()

  app.use(cors())           // Permite cualquier origen (CORS abierto)
  app.use(express.json())   // Body parser para JSON

  app.post('/api/invoke', async (req, res) => {
    const { channel, args = [] } = req.body

    // Obtener handler desde el mapa interno de Electron
    const handler = ipcMain._customHandlers?.get(channel)

    if (!handler) {
      return res.status(404).json({ error: `No handler implemented for channel: ${channel}` })
    }

    // Ejecutar handler (simula que viene de IPC)
    const mockEvent = {}
    try {
      const result = await handler(mockEvent, ...args)
      res.json({ result })
    } catch (error) {
      res.status(500).json({ error: error.message || 'Internal Server Error' })
    }
  })

  const PORT = 3001
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[API Server] Local network API running on http://0.0.0.0:${PORT}`)
  })
}
```

**Registro en `main.ts`:**
```typescript
app.whenReady().then(async () => {
  await initDb()
  setupDI()                           // registra controladores IPC
  const { startApiServer } = require('./api-server')
  startApiServer()  // ← arranca Express
  createWindow()
})
```

**Nota:** Si el puerto 3001 está ocupado, el servidor **falla silenciosamente** (try-catch en main.js) y solo se loguea error. La app desktop sigue funcionando (usa IPC directo).

---

## 📡 Formato de Requerimiento

### Request

**Método:** `POST`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "channel": "ventas:create",
  "args": [
    {
      "cabecera": { ... },
      "detalles": [ ... ],
      "pagos": [ ... ]
    }
  ]
}
```

- `channel` (string, required): nombre del canal IPC
- `args` (array, optional): argumentos que se pasan al handler (suelen ser 1 objeto, pero puede ser múltiples)

---

### Response Success (200 OK)

```json
{
  "result": { "id": 123 }
}
```

El `result` contiene exactamente lo que retorna el handler IPC.

**Ejemplo de `result` complejo:**

```json
{
  "result": {
    "cerrado": false,
    "total_ventas": 12,
    "ingresos_usd": 450.50,
    "ventas": [
      {
        "id": 101,
        "fecha": "2025-04-19 10:30:00",
        "total_usd": 25.00,
        "detalles": [ ... ],
        "pagos": [ ... ]
      }
    ]
  }
}
```

---

### Response Error

**404 - Channel no encontrado:**
```json
{
  "error": "No handler implemented for channel: foo:bar"
}
```

**500 - Error interno del handler:**
```json
{
  "error": "SQLITE_CONSTRAINT: NOT NULL constraint failed: productos.nombre"
}
```

---

## 🧪 Ejemplos con cURL

### 1. Leer configuración

```bash
curl -X POST http://localhost:3001/api/invoke \
  -H "Content-Type: application/json" \
  -d '{"channel":"config:getAll"}'
```

**Respuesta:**
```json
{
  "result": {
    "tasa_del_dia": "40.00",
    "nombre_tienda": "JAUV Studio",
    "telefono_tienda": "",
    "direccion_tienda": "Venezuela",
    "ticket_pie": "Gracias por su compra!",
    "impresora_ancho": "80"
  }
}
```

---

### 2. Buscar productos

```bash
curl -X POST http://localhost:3001/api/invoke \
  -H "Content-Type: application/json" \
  -d '{"channel":"productos:search","args":["cuaderno"]}'
```

**Respuesta:**
```json
{
  "result": [
    {
      "id": 1,
      "codigo": "PAP-A1B2C3",
      "nombre": "Cuaderno Deletreo 80 hojas",
      "marca": "Norma",
      "precio_venta_usd": 3.50,
      "precio_venta_ves": 140,
      "moneda_precio": "usd",
      "stock_actual": 25,
      "categoria_id": 1,
      "categoria_nombre": "Cuadernos",
      "descripcion": ""
    }
  ]
}
```

---

### 3. Crear una venta

```bash
curl -X POST http://localhost:3001/api/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "ventas:create",
    "args": [{
      "cabecera": {
        "subtotal_usd": 10.00,
        "descuento_otorgado_usd": 0,
        "total_usd": 10.00,
        "tasa_cambio": 40.0,
        "estado": "pagada",
        "cliente_nombre": "María López",
        "saldo_pendiente_usd": 0,
        "notas": ""
      },
      "detalles": [
        {
          "tipo": "producto",
          "ref_id": 5,
          "nombre": "Lapicero Negro",
          "cantidad": 2,
          "precio_unitario_usd": 0.50,
          "subtotal_usd": 1.00
        }
      ],
      "pagos": [
        {
          "metodo": "efectivo_usd",
          "monto_usd": 10.00,
          "monto_ves": 400.00
        }
      ]
    }]
  }'
```

**Respuesta:**
```json
{
  "result": { "id": 452 }
}
```

---

### 4. Listar cuentas por cobrar

```bash
curl -X POST http://localhost:3001/api/invoke \
  -H "Content-Type: application/json" \
  -d '{"channel":"cuentas:list"}'
```

---

### 5. Registrar abono

```bash
curl -X POST http://localhost:3001/api/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "cuentas:abonar",
    "args": [{
      "venta_id": 100,
      "metodo": "pago_movil",
      "monto_usd": 5.00,
      "monto_ves": 200.00,
      "tasa": 40.0
    }]
  }'
```

---

### 6. Obtener reporte de hoy

```bash
curl -X POST http://localhost:3001/api/invoke \
  -H "Content-Type: application/json" \
  -d '{"channel":"reportes:hoy"}'
```

---

## 🔐 Seguridad CORS

El servidor Express usa `cors()` sin configuración → permite **cualquier origen**.

```javascript
app.use(cors())  // ← sin options → allow all origins
```

**Implicación:** Cualquier dispositivo en la misma red local puede hacer POST a `/api/invoke`.

**Recomendación (futuro):**
```javascript
app.use(cors({
  origin: ['http://localhost:5173', 'http://192.168.1.100:5173'], // whitelist
  methods: ['POST']
}))
```

---

## 🏠 Red Local - Descubrimiento

Para que un dispositivo móvil sepa la IP de la PC:

1. **IP estática configurada manualmente** (ej: `http://192.168.1.50:3001`)
2. **Bonjour/Avahi** (mDNS) no implementado
3. **DNS local** (router asigna nombre como `jauv-station.local`)

**Recomendación UI futura:** Mostrar en Dashboard la IP local y un QR code para conectar desde móvil.

---

## 🔄 Política de Errores

### Errores de Validación

Si un handler lanza excepción, Express la captura y retorna 500:

```javascript
try {
  const result = await handler(mockEvent, ...args)
  res.json({ result })
} catch (error) {
  res.status(500).json({ error: error.message })
}
```

**Ejemplo:**
- Request: `POST /api/invoke` con `channel: 'ventas:create'` pero payload mal formado
- Response: `500 { "error": "SQLITE_CONSTRAINT:..." }`

**NO se hacen validaciones previas en Express** (se delega al handler).

---

## 📊 Logging

El API server loguea cada request:

```javascript
console.log(`[API Server] Processing ${channel} with args:`, args)
console.log(`[API Server] Success ${channel}:`, result ? '(data)' : 'null')
```

**No se loguean:**
- Contenido completo de arguments grandes (podría serverbose)
- Resultados completos (solo si existe o null)

**Log level:** info (no hay debug/error separado)

---

## 🧩 Compatibilidad con Electron IPC

El API server **reutiliza** los handlers de IPC gracias a:

```javascript
const handler = ipcMain._customHandlers?.get(channel)
```

`ipcMain._customHandlers` es un Map que el proyecto **intercepta** en `main.js` para guardar todos los handlers:

```javascript
// main.js:6-12
ipcMain._customHandlers = new Map()
const originalHandle = ipcMain.handle.bind(ipcMain)
ipcMain.handle = (channel, listener) => {
  ipcMain._customHandlers.set(channel, listener)
  originalHandle(channel, listener)
}
```

Esto significa:
- Mismos handlers IPC → mismos JSON payloads/returns
- Transaccionalidad idéntica
- **Sin duplicación de lógica**

---

## 🧪 Testing Manual

Para probar que el API server está vivo:

```bash
# 1. Arrancar la app en modo dev (npm run dev) → levanta el API server

# 2. Probar endpoint base (404 esperado sin channel)
curl -X POST http://localhost:3001/api/invoke \
  -H "Content-Type: application/json" \
  -d '{}'

# Respuesta: 404 { "error": "Missing invoke channel" }

# 3. Probar canal válido
curl -X POST http://localhost:3001/api/invoke \
  -H "Content-Type: application/json" \
  -d '{"channel":"config:getAll"}'

# Respuesta: 200 { "result": { ... } }
```

---

## 📱 Ejemplo de Cliente Móvil (React Native / Web)

```javascript
async function callApi(channel, args) {
  const response = await fetch('http://192.168.1.50:3001/api/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, args })
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error)
  }
  const { result } = await response.json()
  return result
}

// Uso:
const productos = await callApi('productos:list', { bajo_stock: true })
```

---

## ⚙️ Configuración Avanzada

### Cambiar Puerto

Editar `electron/api-server.js`:

```javascript
const PORT = 3001  // ← cambiar a 3002, 8080, etc.
```

**Nota:** El proxy de Vite en `vite.config.js` también apunta a 3001. Cambiarlo también:
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:3002',  // ← cambiar
    changeOrigin: true,
  }
}
```

### Deshabilitar API Server

Comentar o eliminar la llamada en `main.js`:
```javascript
// startApiServer();  // ← comentar
```

---

## 🔒 Consideraciones de Seguridad (Futuro)

**Estado actual:** CORS abierto + sin autenticación → **solo para red local confiable**.

**Riesgos:**
- Cualquier dispositivo en la misma WiFi puede invocar cualquier canal IPC
- Podrían modificar precios, eliminar ventas, etc.

**Mejoras recomendadas (v3.0):**
1. API Key en header `X-API-Key: <secreto>`
2. CORS restrictivo (orígenes whitelist)
3. Rate limiting por IP
4. HTTPS con certificado self-signed (encriptación)
5. JWT tokens para autenticación de usuario

---

*Documento mantenido como código - actualizar si cambia el servidor API.*
