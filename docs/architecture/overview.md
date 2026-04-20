# Arquitectura - Visión General

## 📐 Panorama General

JAUV Studio POS es una aplicación de escritorio **Electron** que ejecuta una interfaz **React** en el renderer process y lógica de negocio en el **main process** (Node.js). La comunicación se realiza mediante **IPC (Inter-Process Communication)** seguro con `contextBridge`.

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                    │
│   (TypeScript - DDD / Clean Architecture)                   │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure Layer (Controllers, DI, Repositories)       │
│  ↓                                                          │
│  Application Layer (Use Cases + Validation)                │
│  ↓                                                          │
│  Domain Layer (Entities, Repositories Interfaces)           │
│  ↓                                                          │
│  SQLite (jauv_pos.db) via IUnitOfWork                       │
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

### 2. **Arquitectura Limpia (Layered/DDD)**

El Main Process está organizado en tres capas desacopladas:

- **Dominio (`domain/`):** Contiene la lógica de negocio pura, interfaces de repositorios y entidades. No depende de ninguna otra capa.
- **Aplicación (`application/`):** Orquestación de Casos de Uso. Valida entradas con **Zod** y utiliza interfaces para interactuar con la infraestructura.
- **Infraestructura (`infrastructure/`):** Implementaciones técnicas (SQLite, Controladores IPC, Contenedor DI). Depende de las capas internas.

**Ventajas:**
- Desacoplamiento total de la tecnología (SQLite).
- Testabilidad unitaria de los Casos de Uso sin DB.
- Prevención de errores mediante tipado estricto y validación temprana.

### 3. **Inyección de Dependencias (DI)**

Utilizamos un contenedor manual en `electron/infrastructure/di/setup.ts` para gestionar la creación y vida de las instancias de repositorios y servicios de forma centralizada.

### 4. **Unidad de Trabajo (Unit of Work)**

Toda operación que modifica múltiples tablas (venta, abono, merma) utiliza la interfaz `IUnitOfWork`. Esto asegura atomicidad (ACID) sin acoplar la lógica de negocio a APIs específicas de base de datos dentro de los Casos de Uso.

```typescript
try {
  await this.uow.start();
  // ... operaciones múltiples vía repositorios
  await this.uow.commit();
} catch (err) {
  await this.uow.rollback();
  throw err;
}
```

### 5. **Patrón Result**

Cada Caso de Uso retorna un objeto `Result<T>`, eliminando el uso de excepciones para errores de negocio y garantizando un manejo de errores predecible en los controladores.

---

## 📁 Estructura de Archivos

```
electron/
├── main.ts                     # Entry point (DI setup + inicia controladores)
├── preload.ts                  # Expone window.api (contextBridge)
├── application/                # 🧠 Capa de Aplicación
│   ├── use-cases/              # Casos de uso (Lógica de Orquestación)
│   └── interfaces/             # IUnitOfWork y otros contratos técnicos
├── domain/                     # 🛡️ Capa de Dominio
│   ├── common/                 # Clase Result y ResultFactory
│   ├── services/               # GeneradorCodigoBarras, etc.
│   └── repositories/           # Interfaces de Repositorios
└── infrastructure/             # 🛠️ Capa de Infraestructura
    ├── controllers/            # Controladores IPC (exponen canales)
    ├── database/               # Implementaciones de DB y Repositorios
    └── di/                     # Inyección de Dependencias (setup.ts)

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
// main.ts
app.whenReady().then(async () => {
  await initDb();                           // → Crea DB + tablas + seeds
  setupDI();                                // → Configura Inyección de Dependencias
  
  // Resuelve y registra controladores
  container.resolve('VentasIpcController').register();

  // Usa Casos de Uso para auto-cierre
  const reportes = container.resolve('ReportesUseCases');
  await reportes.executeAutoClosePreviousDays();
  
  startApiServer();                         // → Inicia Express HTTP
  createWindow();                           // → Muestra ventana
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

// VentasUseCases.ts
try {
  await this.uow.start();
  // 1. Crear venta (IVentasRepository)
  // 2. Por cada detalle: insert detalle y descontar stock (IProductosRepository y IInsumosRepository)
  // 3. Por cada pago: registrar pago (IVentasRepository)
  await this.uow.commit();
  return ResultFactory.ok({ id: ventaId });
} catch(e) {
  await this.uow.rollback();
  return ResultFactory.fail(e);
}
```

### 3. **Reporte del Día**

```javascript
// Reportes.jsx
const hoy = await window.api.invoke('reportes:hoy')

// ReportesIpcController.ts
const hoy = await this.useCases.getReporteHoy(todayStr());

// SqliteReportesRepository.ts (CQRS approach)
const snapshot = await db.get('SELECT * FROM cierres_dia WHERE fecha = ?', [today])
if (!snapshot) {
  // Compute live data without instantiating entities (optimizacion)
  const data = await buildDayData(today)
  return { cerrado: false, ...data }
} else {
  // Return stored snapshot
  return { cerrado: true, ...snapshot }
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
