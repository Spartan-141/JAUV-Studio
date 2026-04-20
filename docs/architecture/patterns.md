# Patrones de Diseño

## 🧩 Patrones Arquitectónicos Relevantes

### 1. Clean Architecture (Capas)

El sistema ahora sigue una arquitectura de capas concéntricas (arquitectura hexagonal/cebolla):

| Capa | Ubicación | Responsabilidad |
|------|-----------|-----------------|
| **Dominio** | `electron/domain/` | Reglas de negocio puras, Entidades e interfaces de Repositorios. |
| **Aplicación** | `electron/application/` | Casos de uso (Use Cases) que orquestan el negocio. |
| **Infraestructura**| `electron/infrastructure/` | Implementaciones (SQLite, IPC Controllers, DI). |

**Flujo:**
```
Vista (React) → IPC Controller → Use Case → Repository → SQLite
```

---

### 2. Repository Pattern (Explícito)

Separamos la definición de los datos de su implementación técnica mediante interfaces en el dominio:

```typescript
// domain/repositories/interfaces/IProductosRepository.ts
export interface IProductosRepository {
  getAll(): Promise<Result<Producto[]>>;
  create(data: any): Promise<Result<number>>;
}

// infrastructure/database/repositories/SqliteProductosRepository.ts
export class SqliteProductosRepository implements IProductosRepository {
  // Implementación real con SQL
}
```

**Ventaja:** Permite cambiar la DB (ej. de SQLite a PostgreSQL) sin tocar una sola línea de lógica de negocio en los Casos de Uso.

---

### 3. Case-based Logic (Use Cases)

Cada acción que el usuario puede realizar en el sistema tiene un Caso de Uso dedicado:

- `CrearVentaUseCase`
- `RegistrarAbonoUseCase`
- `GenerarReporteHoy`

Esto centraliza la validación (vía **Zod**) y asegura que las reglas de negocio se apliquen de forma consistente, sin importar si la petición viene de Electron o de la API HTTP.

---

### 4. Patrón Result

En lugar de lanzar excepciones (`throw`), las capas de dominio y aplicación devuelven objetos `Result`.

```typescript
if (!producto) return ResultFactory.fail('Producto no encontrado');
return ResultFactory.ok(producto);
```

**Beneficios:**
- Tipado estricto de errores.
- Obliga al desarrollador a considerar el escenario de fallo.
- Evita crashes inesperados en el proceso Main.

---

### 5. Dependency Injection (DI)

Las clases no instancian sus dependencias. En su lugar, las reciben en el constructor:

```typescript
constructor(private repo: IProductosRepository) {}
```

El **DI Container** (`infrastructure/di/setup.ts`) se encarga de "armar" el rompecabezas al inicio de la aplicación.

---

### 6. Unit of Work (Transacciones)

Para garantizar la integridad de los datos en operaciones complejas, utilizamos una abstracción de transacciones:

```typescript
await uow.start();
try {
  await repo1.save();
  await repo2.delete();
  await uow.commit();
} catch {
  await uow.rollback();
}
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
main.ts:
1. app.whenReady()
2. initDb() → crea tablas + seeds
3. setupDI() → registra repositorios, UseCases y Controladores
4. Llamada inicial a ReportesUseCases.executeAutoClosePreviousDays()
5. startApiServer()
6. createWindow()

React:
1. App() → AppProvider
2. AppContext loadConfig() → config:getAll
3. Renderiza Layout + Routes
```

### Transacción de Venta (ventas:create)

```typescript
1. uow.start() → BEGIN TRANSACTION
2. VentasRepository.createVenta() → get lastID
3. FOR each detalle:
     VentasRepository.createDetalle()
     ProductosRepository.update() o InsumosRepository.ajustarStock()
4. FOR each pago: VentasRepository.createPago()
5. uow.commit() → COMMIT TRANSACTION
6. Return ResultFactory.ok({ id: lastID })
```

Si falla cualquier paso: ROLLBACK, error al frontend.

---

## 🏷️ Convenciones de Código

### Naming Conventions

- **Use Cases:** PascalCase: `VentasUseCases.ts`, `MermasUseCases.ts`
- **Controladores:** `<Modulo>IpcController.ts` → `VentasIpcController.ts`
- **Canales IPC:** `<modulo>:<accion>` → `'ventas:create'`, `'config:get'`
- **Componentes React:** PascalCase → `POS`, `ProductoModal`
- **Variables camelCase:** `tasa`, `subtotal_usd`
- **Constantes snake_case UPPER:** no se usa, pero sería `API_PORT`

---

## 🧪 Patrones de Testing (Manual)

No hay tests automatizados todavía, pero la arquitectura DDD permite pruebas unitarias. Patrón manual actual:

1. **Testing de flujos:**ejecutar npm run dev, seguir checklist de escenarios
2. **Console logging:** Para debug, `console.log('[DB] ...')`
3. **AlertModal:** Muestra errores al usuario (no ideal para prod)

**Para futuro:**
- Jest para handlers (unit test SQL queries)
- React Testing Library para componentes
- Playwright para E2E

---

*Documento mantenido como código - actualizar con nuevos patrones.*
