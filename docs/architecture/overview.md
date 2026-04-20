# Arquitectura - Visión General

## 📐 Panorama General

JAUV Studio POS es una aplicación de escritorio **Electron** que ejecuta una interfaz **React** en el renderer process y lógica de negocio en el **main process** (Node.js). La comunicación se realiza mediante **IPC (Inter-Process Communication)** seguro con `contextBridge`.

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                    │
│  (Node.js - acceso a filesystem, SQLite, sistema)          │
├─────────────────────────────────────────────────────────────┤
│  IPC Handlers (ventas:, productos:, config:...)            │
│  ↓                                                        │
│  Database Layer (db.js + handlers/)                        │
│  ↓                                                        │
│  SQLite (jauv_pos.db)                                      │
└─────────────────────────────────────────────────────────────┘
                         ↑ ↑  ↑
                         │ │  │ IPC (invoke/handle)
                         │ │  │
┌────────────────────────┘ │  └──────────────────────────────┐
│  Electron Preload Script (expose 'api')                    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Renderer Process (React App - BrowserWindow)      │    │
│  │  ┌────────────────────────────────────────────────┐│    │
│  │  │  React Components + Context (AppContext)       ││    │
│  │  │  window.api.invoke('channel', args)            ││    │
│  │  └────────────────────────────────────────────────┘│    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Patrones Arquitectónicos

### 1. **Electron Main-Renderer con IPC**

**Patrón:** Main process es el "servidor", renderer process es el "cliente".

- **Main process** expone handlers IPC asíncronos (`ipcMain.handle`)
- **Renderer** invoca handlers a través de `window.api.invoke` (exposed por preload)
- **Preload script** usa `contextBridge` para exponer solo la API necesaria, no todo Node.js

```javascript
// main.js → registra handler
ipcMain.handle('ventas:create', async (event, payload) => { ... })

// preload.js → puente seguro
contextBridge.exposeInMainWorld('api', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
})

// React → consume
const result = await window.api.invoke('ventas:create', payload)
```

**Ventajas:**
- Seguridad: isolate del contexto Node.js
- Async/await natural (no callbacks)
- Máximo 1 handler por canal (unicast)

### 2. **Controladores por Módulo (Handlers)**

Cada área funcional tiene su propio archivo handler:
- `config.js` → configuraciones globales
- `productos.js` → CRUD productos
- `ventas.js` → lógica transaccional de ventas
- `reportes.js` → cálculos de métricas y cierres
- etc.

Cada handler define múltiples canales IPC:
```javascript
ipcMain.handle('productos:list', ...)
ipcMain.handle('productos:create', ...)
ipcMain.handle('productos:update', ...)
```

**Razón:** Separación de preocupaciones, fácil de testear, escalable.

### 3. **Context API para Estado Global**

AppContext provee estado compartido a toda la app:

```javascript
<AppProvider>
  {children}
</AppProvider>
// Acceso desde cualquier componente:
const { tasa, config, fmt, toVes } = useApp()
```

**Valores almacenados:**
- `tasa` - tasa BCV actual (float)
- `config` - objeto con todas las claves de configuracion
- `loading` - estado de carga inicial
- Métodos: `updateTasa`, `updateConfig`, `fmt`, `toVes`, `toUsd`

**Razón:** La tasa y configuración se usan en casi todas las páginas; evitar prop-drilling.

### 4. **Transacciones Atómicas**

Toda operación que modifica múltiples tablas (venta, abono, merma) usa BEGIN/COMMIT/ROLLBACK:

```javascript
try {
  await db.run('BEGIN TRANSACTION');
  // ... múltiples INSERT/UPDATE
  await db.run('COMMIT');
} catch (err) {
  await db.run('ROLLBACK');
  throw err;
}
```

Garantiza **ACID**:
- Atomicidad: o todo se aplica o nada
- Consistencia: constraints de SQLite se respetan
- Aislamiento: SQLite usa locks
- Durabilidad: WAL mode garantiza persistencia

---

## 📁 Estructura de Archivos

```
electron/
├── main.js                     # Entry point (crea ventana, registra handlers)
├── preload.js                  # Expone window.api (contextBridge)
├── api-server.js               # Express HTTP server (red local)
└── database/
    ├── db.js                   # initDb() - crea tablas, seeds, migraciones
    └── handlers/              # IPC handlers (1 archivo por módulo)
        ├── config.js           # config:get, config:set, config:getAll
        ├── categorias.js       # CRUD categorías + bulk assign
        ├── productos.js        # CRUD productos + search + list
        ├── insumos.js          # CRUD insumos + ajuste stock
        ├── servicios.js        # CRUD servicios
        ├── ventas.js           # ventas:create (transaccional), list, get, paginated
        ├── cuentas.js          # cuentas:list, abonar, ajustar_deuda
        ├── mermas.js           # mermas:create (transaccional)
        └── reportes.js         # reportes:hoy, cerrar_dia, historial, inventario, dashboard:metrics

src/
├── App.jsx                     # Layout principal + enrutamiento
├── main.jsx                    # Entry point (React 18 createRoot)
├── index.css                   # Tailwind + componentes UI reutilizables
├── context/
│   └── AppContext.jsx          # Estado global (tasa, config, utils)
├── pages/
│   ├── Dashboard.jsx           # Panel principal (stats + gráficos)
│   ├── POS.jsx                 # Punto de Venta (carrito, pago, ticket)
│   ├── Inventario.jsx          # Gestión productos + categorías
│   ├── CentroCopiado.jsx       # Insumos y servicios
│   ├── CuentasPorCobrar.jsx    # Créditos y abonos
│   └── Reportes.jsx            # Reportes + cierres + inventario metrics
└── components/
    ├── ScannerModal.jsx        # Escáner de códigos (html5-qrcode)
    ├── AlertModal.jsx          # Alertas (warning/danger)
    ├── ConfirmationModal.jsx   # Confirmación (sí/no)
    └── SplashScreen.jsx        # Pantalla de carga inicial
```

---

## 🔄 Flujo de Datos

### 1. **Inicialización**

```javascript
// main.js
app.whenReady().then(async () => {
  await initDb();              // → Crea DB + tablas + seeds
  require('./database/handlers/...'); // → Registra todos los handlers IPC
  autoClosePreviousDays();     // → Cierra días anteriores automáticamente
  startApiServer();            // → Inicia Express en puerto 3001
  createWindow();              // → Muestra ventana principal
})
```

```javascript
// AppContext (React)
useEffect(() => {
  const cfg = await window.api.invoke('config:getAll')
  setConfig(cfg)
  setTasa(parseFloat(cfg.tasa_del_dia))
}, [])
```

### 2. **Venta Completa (Transacción)**

```javascript
// POS.jsx - Usuario presiona "COBRAR"
const result = await window.api.invoke('ventas:create', {
  cabecera: {
    subtotal_usd, descuento_otorgado_usd, total_usd,
    tasa_cambio, estado: 'pagada' | 'credito',
    cliente_nombre, saldo_pendiente_usd, notas
  },
  detalles: [ { tipo:'producto'|'servicio', ref_id, nombre, cantidad,
                cantidad_hojas_gastadas, precio_unitario_usd, subtotal_usd } ],
  pagos: [ { metodo, monto_usd, monto_ves } ]
})

// ventas.js handler
BEGIN TRANSACTION
1. INSERT INTO ventas → obtiene ventaId
2. For each detalle:
   - INSERT INTO detalle_venta
   - UPDATE productos SET stock_actual -= cantidad WHERE id = ?
   - O UPDATE insumos SET stock_hojas -= hojas WHERE id = ?
3. For each pago: INSERT INTO pagos
COMMIT

// Respuesta al frontend con id de venta
return { id: ventaId }
```

### 3. **Reporte del Día**

```javascript
// Reportes.jsx
const hoy = await window.api.invoke('reportes:hoy')

// reportes.js handler
const snapshot = await db.get('SELECT * FROM cierres_dia WHERE fecha = ?', [today])
if (!snapshot) {
  // Compute live data
  const data = await buildDayData(db, today) // ← función de 66 líneas
  return { cerrado: false, ...data }
} else {
  // Return stored snapshot (parsed JSON)
  return {
    cerrado: true,
    ...snapshot,
    pagos: JSON.parse(snapshot.pagos_json),
    abonos: JSON.parse(snapshot.abonos_json),
    ventas: JSON.parse(snapshot.ventas_json)
  }
}
```

---

## 🎨 Diseño de UI (Tailwind + Temario)

### Tema de Colores

```css
/* primary brand - indigo/purple */
brand-500: #6366f1
brand-600: #4f46e5 (default button)

/* surface (backgrounds) */
surface-900: #0f0f1a (body bg)
surface-800: #161625 (cards)
surface-700: #1e1e33 (inputs, table headers)

/* semantic colors */
accent-green: #10b981 (success, money)
accent-yellow: #f59e0b (warning, credits)
accent-red: #ef4444 (danger, alerts)
```

### Sistema de Diseño Reutilizable

Clases utilitarias en `index.css`:
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost`, `.btn-success`
- `.input`, `.input-sm`, `.select`, `.label`
- `.card`, `.card-p`
- `.badge-*` (green, red, yellow, blue, purple)
- `.modal-backdrop`, `.modal`, `.modal-lg`
- `.page`, `.page-header`, `.page-title`
- `.stat-card`

**Ventaja:** consistencia visual, cambios globales en un archivo.

---

## 💾 Persistencia de Datos

### Ubicación del Archivo SQLite

```javascript
// electron/database/db.js:18
const userDataPath = app.getPath('userData') // directorio estándar del OS
const dbPath = path.join(userDataPath, 'jauv_pos.db')
```

| OS | Ruta |
|----|------|
| Windows | `C:\Users\<Usuario>\AppData\Roaming\jauv-studio-pos\jauv_pos.db` |
| Linux   | `~/.config/jauv-studio-pos/jauv_pos.db` |
| macOS   | `~/Library/Application Support/jauv-studio-pos/jauv_pos.db` |

### JOURNAL Mode: WAL

```sql
PRAGMA journal_mode = WAL;
-- Write-Ahead Logging: mejor concurrencia, más rápido
-- Crea archivos -wal y -shm junto al .db
```

### Esquema de Tablas

| Tabla | Row Count Estimado | Índices |
|-------|-------------------|---------|
| configuracion | ≤ 20 | PRIMARY KEY (clave) |
| categorias | ≤ 50 | PRIMARY KEY |
| productos | ≤ 50,000 | PRIMARY KEY, UNIQUE(codigo), INDEX(categoria_id), INDEX(nombre) |
| insumos | ≤ 200 | PRIMARY KEY |
| servicios | ≤ 100 | PRIMARY KEY |
| ventas | ≤ 500,000/año | PRIMARY KEY, INDEX(fecha), INDEX(estado) |
| detalle_venta | ≤ 1,000,000/año | INDEX(venta_id), INDEX(ref_id) |
| pagos | ≤ 500,000/año | INDEX(venta_id) |
| abonos | ≤ 100,000/año | INDEX(venta_id) |
| mermas | ≤ 10,000 | INDEX(fecha), INDEX(producto_id) |
| cierres_dia | ≤ 365/año | UNIQUE(fecha) |

---

## 🔌 API HTTP (Red Local)

**Motivo:** Permitir a dispositivos móviles en la misma red usar las mismas funcionalidades (futuro: app móvil).

**Configuración:**
```javascript
// api-server.js
const PORT = 3001;
app.listen(PORT, '0.0.0.0'); // bind todas las interfaces
```

**Proxy en Vite (dev):**
```javascript
// vite.config.js:24
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  }
}
```

**Polyfill (React):**
Cuando `window.api` no existe (ejecución en navegador sin Electron), AppContext crea un polyfill que invoca `/api/invoke`:

```javascript
// AppContext.jsx:4-25
if (typeof window !== 'undefined' && !window.api) {
  window.api = {
    invoke: async (channel, ...args) => {
      const res = await fetch('/api/invoke', { ... })
      return data.result
    }
  }
}
```

**Flujo en Producción:**
1. React → `window.api.invoke('ventas:list', {})`
2. Preload → `ipcRenderer.invoke('ventas:list', {})`
3. Main → handler de `ventas:list` se ejecuta
4. Main → accede a DB
5. Main → retorna resultado a renderer vía IPC

**Flujo en Dev (Vite + Express):**
1. React → `window.api.invoke(...)`
2. Preload NO existe (no es Electron) → usa polyfill
3. Polyfill → `fetch('/api/invoke', {channel, args})`
4. Vite proxy → enruta a `http://localhost:3001`
5. Express server → intercepta `ipcMain._customHandlers`
6. Handler ejecuta y retorna JSON

---

## 🏷️ Manejo de Monedas

### Precios en DB

Cada producto/servicio tiene 4-5 campos monetarios:

```sql
productos:
  precio_compra_usd REAL
  precio_venta_usd  REAL
  precio_compra_ves REAL  -- solo si moneda_precio = 'ves'
  precio_venta_ves  REAL  -- solo si moneda_precio = 'ves'
  moneda_precio     TEXT  -- 'usd' | 'ves'
```

**Lógica:**
- Si `moneda_precio === 'usd'`: el precio es fijo en USD, se convierte a VES con tasa del día
- Si `moneda_precio === 'ves'`: el precio es fijo en VES, se convierte a USD dividiendo por tasa
- Campo `tasa_cambio` en `ventas` almacena la tasa que se usó en esa transacción (para histórico)

### Conversiones en Frontend

```javascript
// Precio en VES (para mostrar)
const precioVes = producto.moneda_precio === 'ves'
  ? producto.precio_venta_ves
  : producto.precio_venta_usd * tasa

// Precio en USD (para cálculos internos)
const precioUsd = producto.moneda_precio === 'usd'
  ? producto.precio_venta_usd
  : producto.precio_venta_ves / tasa
```

**Nota:** El backend SIEMPRE guarda en USD (campos `*_usd`). Los campos VES son derivados en frontend o se calculan al guardar si `moneda_precio='ves'`.

---

## ⚠️ Consideraciones de Concurrencia

SQLite usa **lock a nivel archivo**:
- Solo 1 writer a la vez
- Múltiples readers concurrentes
- WAL mode mejora concurrencia (readers + writer simultáneos)

**En esta app:**
- Single-user → no hay conflictos
- Si se abre en dos computadoras con misma DB (red compartida): NO soportado (corrupción likely)

**Para futuro multi-user:**
- Migrar a PostgreSQL/MySQL
- O usar SQLite con servidor de API que serialice requests

---

## 🔐 Seguridad

### Context Isolation

```javascript
// main.js:26-31
webPreferences: {
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,  // ✅ Habilita sandbox
  nodeIntegration: false,   // ✅ Deshabilitado
  sandbox: false,          // ⚠️ false porque necesitamos algunos Node features en renderer
}
```

**Exposición controlada:**
```javascript
// preload.js - solo expone 'api' con invoke/on
contextBridge.exposeInMainWorld('api', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, callback) => { ... }
})
```

**Razón:** Previene XSS → remote code execution (ataque común en Electron).

### Validación de Inputs

- Frontend: inputs `type="number"`, `min="0"`, `step="0.01"`
- Backend: `parseFloat(...) || 0` fallback a 0
- Bound parameters en SQL (`?` placeholders) → previene inyección SQL

---

## 📈 Escalabilidad Futura

### Posibles Extensiones

1. **Multi-sucursal:**
   - Añadir tabla `sucursales` con `id`
   - Añadir `sucursal_id` a productos, ventas
   - API server centralizado (cloud) con replicación offline-first (CRDT)

2. **Facturación Electrónica:**
   - Generar XML según normativa SENIAT
   - Integración con plataformas de facturación

3. **Módulo de Compras:**
   - Registro de órdenes de compra a proveedores
   - Recepción de mercancía y ajuste automático de stock

4. **App Móvil (React Native / Capacitor):**
   - Compartir misma API HTTP
   - Sincronización offline con conflict resolution

---

*Documento mantenido como código - actualizar con cambios en arquitectura.*
