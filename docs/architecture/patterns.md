# Patrones de Diseño

## 🧩 Patrones Arquitectónicos Relevantes

### 1. Model-View-Controller (MVC) Adaptado

Aunque React utiliza un patrón diferente (component-based), el proyecto tiene un MVC implícito:

| Capa | Ubicación | Responsabilidad |
|------|-----------|-----------------|
| **Modelo** | `electron/database/` (tablas, handlers) | Estructura de datos, acceso a DB |
| **Vista** | `src/pages/`, `src/components/` (React JSX) | Renderizado de UI |
| **Controlador** | Handlers IPC (`electron/database/handlers/*.js`) | Lógica de negocio, orquestación |

**Flujo:**
```
Vista (React) → invoke('ventas:create') → Controlador (handler) → Modelo (DB queries) → Resultado ← Controlador ← Vista
```

---

### 2. Repository Pattern (Implícito)

Los handlers actúan como **repositories** que encapsulan el acceso a datos:

```javascript
// Handler = Repository con métodos específicos
ipcMain.handle('productos:list', async (_, filters) => {
  // Lógica de consulta (SELECT con joins, filters)
  return await db.all(sql, params)
})

ipcMain.handle('productos:create', async (_, data) => {
  // Lógica de escritura (INSERT)
  return await db.run(...)
})
```

**Ventaja:**
- El frontend no conoce el esquema SQL
- Permite cambiar implementación sin tocar UI
- Centraliza validaciones y business rules

---

### 3. Facade Pattern (IPC API)

`window.api` es un **facade** que simplifica la comunicación:

```javascript
// Antes (sin facade):
const channel = 'ventas:create'
ipcRenderer.invoke(channel, payload)... // repetitivo

// Con facade:
window.api.invoke('ventas:create', payload) // limpio
```

Y el **preload script** es el facade que expone solo lo necesario:

```javascript
contextBridge.exposeInMainWorld('api', {
  invoke: ...,
  on: ...
})
// oculta el resto de Node.js APIs
```

---

### 4. Observer Pattern (React State + Context)

AppContext usa **Observer** implícito de React:

```javascript
<AppProvider>
  <App> → usa useApp()
</AppProvider>
// Cuando setTasa() cambia, todos los componentes que llaman useApp() se re-renderizan.
```

**Implementación:**
- `useState` + `useContext` + `useEffect`
- No librería externa, es nativo de React

---

### 5. Strategy Pattern (Métodos de Pago, Moneda)

**Estrategia de conversión monetaria:**

```javascript
// AppContext: estrategias de formateo
const fmt = (usd, currency) => {
  if (currency === 'USD') return `$${usd.toFixed(2)}`
  return `Bs. ${(usd * tasa).toLocaleString(...)}`
}

// Y en POS: estrategias de cálculo de total
const totalPagadoVes = Object.entries(pagos).reduce((acc, [key, val]) => {
  if (key === 'efectivo_usd') return acc + (val * tasa)  // estrategia USD→VES
  return acc + val                                        // estrategia directa VES
}, 0)
```

**Estrategia de descuento:**
```javascript
// tipoDescuento = 'usd' | 'ves' | 'perc'
if (tipo === 'usd') descValVes = valorInput * tasa
if (tipo === 'ves') descValVes = valorInput
if (tipo === 'perc') descValVes = subtotal_ves * (valorInput / 100)
```

---

## 🧵 Patrones de Componentes React

### 1. Componente Controlador vs Presentacional

En las páginas principales (`POS.jsx`, `Inventario.jsx`):
- **Controlador:** Estado local (`useState`), efectos (`useEffect`), lógica de negocio ligera (cálculos de totales)
- **Presentacional:** Modales (`ProductoModal`, `PagoModal`) son puramente UI + props

**Separación clara:**
```javascript
// Presentacional: no sabe de window.api, solo recibe callbacks
function ProductoModal({ producto, onSave }) { ... }

// Controlador: dueño de datos y llamadas a API
export default function Inventario() {
  const [productos, setProductos] = useState([])
  const load = () => window.api.invoke('productos:list')...
}
```

---

### 2. Custom Hooks (Abstracción de Lógica)

```javascript
// useApp() es un custom hook central
export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
```

**Ventaja:** Consistencia, fácilmock en tests, encapsula validación.

---

### 3. Compound Components (Modales)

Los modales siguen patrón compound:

```javascript
// Uso:
<AlertModal
  title="Aviso"
  message="Texto"
  onClose={...}
/>

// Implementación: componente único que recibe props
// No se rompe el árbol de React (no usa render props)
```

---

### 4. Callback Refs (`useRef` + `useEffect`)

**ScannerModal:**
```javascript
const html5QrRef = useRef(null)
// Se pasa al componente Html5Qrcode como elemento DOM
<Html5Qrcode ref={html5QrRef} ... />
```

**BarcodeImg (Inventario):**
```javascript
const ref = useRef(null)
useEffect(() => {
  if (ref.current) JsBarcode(ref.current, code, { ... })
}, [code])
```

---

### 5. Modal Pattern (Backdrop + Content)

UI pattern estándar:

```jsx
<div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
  <div className="modal">
    {/* Contenido */}
  </div>
</div>
```

- Click en backdrop (fondo oscuro) → cierra modal
- Click dentro del modal → no cierra (stopPropagation)

---

## 🗄️ Patrones de Base de Datos

### 1. Soft Delete vs Hard Delete

- **Hard Delete:** `productos:delete`, `categorias:delete`, `insumos:delete`, `servicios:delete`, `mermas:delete` → DELETE físico
- **Soft Delete NO se usa** (excepto `servicios` con `activo=0` que es un soft-delete booleano)

**Decisión:**
- Productos: hard delete (no hay histórico necesario)
- Servicios: soft-delete (campo `activo`) porque pueden desactivarse temporalmente
- Mermas: always present (no se borran)

---

### 2. Snapshot Pattern (Cierres de Día)

Tabla `cierres_dia` guarda un **snapshot** con JSON de datos:

```sql
INSERT INTO cierres_dia (
  fecha, tasa_cierre, total_ventas, ingresos_usd, ...,
  pagos_json, abonos_json, ventas_json
)
```

**Razón:**
- Los reportes históricos deben ser inmutables (no cambiar si luego se edita una venta)
- JSON permite preservar el estado completo del día (detalle de cada venta, cada pago)
- Útil para auditoría y recálculos

**Trade-off:**
- + Lectura muy rápida (solo leer 1 row)
- - No se puede modificar un cierre sin romper consistencia
- - Algo de duplicación de datos (ventas ya existen en tabla `ventas`)

**Implementación:**
- `buildDayData()` calcula todo y devuelve objeto plano
- `upsertCierre()` hace INSERT OR IGNORE + UPDATE
- `reportes:hoy` devuelve snapshot si existe, sino live data

---

### 3. Transaction Script (Handlers)

Los handlers son **scripts transaccionales**:

```javascript
ipcMain.handle('ventas:create', async (_, payload) => {
  await db.run('BEGIN')
  // Paso 1
  // Paso 2
  // Paso 3
  await db.run('COMMIT')
})
```

**Ventaja:**
- Lógica de negocio cerca de la base de datos
- Transaccionalidad asegurada
- Fácil de seguir (código secuencial)

**Desventaja:**
- Podría迁移 a Domain Services si el dominio crece

---

### 4. Event Slight (Light) - Auto-Close

```javascript
// main.js: autoClosePreviousDays()
// Al arrancar, consulta días con ventas no cerradas y los cierra.
```

Es un **event-sourcing-lite**: los eventos (ventas insertadas) se consultan y se genera un snapshot (cierre). No se guardan eventos individuales, pero la idea de reconstruir estado desde eventos está presente.

---

## 🎭 Patrones de UI/UX

### 1. Progressive Disclosure

Los detalles se muestran bajo demanda:

- **POS:** Carrito oculto hasta que hay items → `cart.length > 0 ? visible : hidden`
- **Reportes:** Ventas expandibles (click en row → expand to show detalles, pagos)
- **Inventario:** Modal de categorías (gestión separada)

---

### 2. Optimistic UI (No hay, pero podría haber)

En este sistema, **no se usa optimistic UI**:
- Las operaciones esperan respuesta del backend antes de actualizar UI
- Porque la DB es local y las operaciones son instantáneas (< 100ms)

---

### 3. Skeleton Loading

En Dashboard:

```javascript
{loading ? (
  <div className="spinner">Cargando...</div>
) : (
  <StatsCards />
)}
```

Simple, efectivo. No hay skeleton screens complejos.

---

## ♻️ Patrones de Estado

### Lifting State Up

El estado del carrito (`cart`) vive en `POS.jsx` (el controller de la página), no en cada item.

**Razón:** Necesitas calcular totales globales (subtotal, descuento, total final) → state debe estar en el nivel más alto que los necesite.

---

## 📡 Patrones de Comunicación

### Request-Response Síncrono (IPC)

```javascript
// Frontend
const result = await window.api.invoke('channel', arg1, arg2)

// Backend
ipcMain.handle('channel', async (event, arg1, arg2) => {
  return datos // serializado automáticamente
})
```

**No se usa** `ipcMain.on` (eventos asíncronos sin respuesta) excepto en `api-server.js` para intercept.

---

## 🔄 Ciclo de Vida Importante

### Inicialización App

```javascript
main.js:
1. app.whenReady()
2. initDb() → crea tablas + seeds
3. require handlers → registra ipcMain.handle
4. autoClosePreviousDays()
5. startApiServer()
6. createWindow()

React:
1. App() → AppProvider
2. AppContext loadConfig() → config:getAll
3. Renderiza Layout + Routes
```

### Transacción de Venta (ventas:create)

```javascript
1. BEGIN
2. INSERT ventas → get lastID
3. FOR each detalle:
     INSERT detalle_venta
     UPDATE stock (producto o insumo)
4. FOR each pago: INSERT pagos
5. COMMIT
6. Return { id: lastID }
```

Si falla cualquier paso: ROLLBACK, error al frontend.

---

## 🏷️ Convenciones de Código

### naming conventions

- **Archivos handlers:** plural, snake_case: `productos.js`, `cuentas.js`
- **Canales IPC:** `<modulo>:<accion>` → `'ventas:create'`, `'config:get'`
- **Componentes React:** PascalCase → `POS`, `ProductoModal`
- **Variables camelCase:** `tasa`, `subtotal_usd`
- **Constantes snake_case UPPER:** no se usa, pero sería `API_PORT`

---

## 🧪 Patrones de Testing (Manual)

No hay tests automatizados. Patrón manual:

1. **Testing de flujos:**ejecutar npm run dev, seguir checklist de escenarios
2. **Console logging:** Para debug, `console.log('[DB] ...')`
3. **AlertModal:** Muestra errores al usuario (no ideal para prod)

**Para futuro:**
- Jest para handlers (unit test SQL queries)
- React Testing Library para componentes
- Playwright para E2E

---

*Documento mantenido como código - actualizar con nuevos patrones.*
