# API IPC - Canales de Comunicación

## 📡 Visión General

La comunicación entre **React (renderer)** y **Electron Main** se realiza a través de **IPC (Inter-Process Communication)** usando el patrón **request-response** con `ipcRenderer.invoke` / `ipcMain.handle`.

**Canal:** string identificador único (ej: `'ventas:create'`)
**Argumentos:** cualquier JSON-serializable
**Respuesta:** cualquier JSON-serializable (incluye null, numbers, objects, arrays)

---

## 🏗️ Estructura de Naming

```
<modulo>:<accion>
```

**Ejemplos:**
- `config:get` → obtener un valor de configuración
- `productos:list` → listar productos con filtros
- `ventas:create` → crear una venta (transacción)
- `cuentas:abonar` → registrar abono a crédito

**Convenciones:**
- Módulo en **singular** (`producto` → `productos:` porque es colección)
- Acción en **imperativo** (`get`, `set`, `list`, `create`, `update`, `delete`)
- Usamos `:` como separator (no `.` para evitar colisiones con eventos Electron)

---

## 🔌 Exposición en Frontend

### Preload Script

```javascript
// electron/preload.js
contextBridge.exposeInMainWorld('api', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, callback) => { /* para eventos futuros */ }
})
```

Esto crea `window.api` global accesible desde React.

### Polyfill para Dev (Browser sin Electron)

```javascript
// src/context/AppContext.jsx:4-25
if (typeof window !== 'undefined' && !window.api) {
  window.api = {
    invoke: async (channel, ...args) => {
      const res = await fetch('/api/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, args })
      })
      const { result } = await res.json()
      return result
    }
  }
}
```

**Cuándo se usa:** Cuando corres la app con `npm run dev`, Vite sirve en `localhost:5173` y el proxy `/api` redirige a Express en puerto 3001. En producción (Electron) `window.api` ya existe (por preload).

---

## 📋 Catálogo Completo de Canales

### Configuración (`config`)

| Canal | Signature | Descripción | Parámetros | Retorno |
|-------|-----------|-------------|------------|---------|
| `config:get` | `(clave: string) => string \| null` | Obtiene un valor por clave | `clave` | valor o null |
| `config:getAll` | `() => Record<string, string>` | Obtiene todos losKV | ninguno | `{ clave1: valor1, clave2: valor2, ... }` |
| `config:set` | `(clave, valor) => boolean` | Guarda (INSERT OR REPLACE) | `clave`, `valor` | `true` |

**Ejemplo:**
```javascript
// Set
await window.api.invoke('config:set', 'tasa_del_dia', '42.50')
// Get
const tasa = await window.api.invoke('config:get', 'tasa_del_dia') // "42.50"
// GetAll
const cfg = await window.api.invoke('config:getAll')
// cfg = { tasa_del_dia: "42.50", nombre_tienda: "JAUV Studio", ... }
```

---

### Categorías (`categorias`)

| Canal | Signature | Descripción |
|-------|-----------|-------------|
| `categorias:list` | `() => Categoria[]` | Lista todas las categorías con conteo de productos |
| `categorias:create` | `({ nombre }) => Categoria` | Crea nueva categoría |
| `categorias:update` | `({ id, nombre }) => boolean` | Actualiza nombre de categoría |
| `categorias:delete` | `(id: number) => boolean` | Elimina categoría (desvincula productos) |
| `categorias:productos` | `(categoria_id?) => Producto[]` | Lista todos los productos (opcionalmente filtrados por categoría) — usado por el gestor de categorías |
| `categorias:bulk_assign` | `({ categoria_id, producto_ids }) => boolean` | Asigna masivamente productos a categoría (desvincula los que no estén en la lista) |

**Tipo `Categoria`:**
```typescript
{
  id: number
  nombre: string
  total_productos: number  // join COUNT
}
```

**Tipo `Producto` (parcial en este contexto):**
```typescript
{
  id: number
  nombre: string
  marca?: string
  codigo?: string
  stock_actual: number
  categoria_id: number | null
  categoria_nombre?: string
}
```

---

### Productos (`productos`)

| Canal | Signature | Descripción |
|-------|-----------|-------------|
| `productos:list` | `(filters?) => Producto[]` | Lista productos con JOIN a categoría |
| `productos:get` | `(id: number) => Producto | null` | Obtiene un producto por ID |
| `productos:create` | `(data) => { id, codigo }` | Crea producto, genera código si no se provee |
| `productos:update` | `({ id, ...data }) => boolean` | Actualiza producto |
| `productos:delete` | `(id: number) => boolean` | Elimina producto |
| `productos:search` | `(query: string) => Producto[]` | Búsqueda fuzzy (nombre, código, marca), limit 20 |

**Filtros `productos:list`:**
```javascript
{
  search?: string,       // búsqueda por nombre/código/marca
  categoria_id?: number, // filtrar por categoría
  bajo_stock?: boolean   // solo stock_actual <= stock_minimo
}
```

**Tipo `Producto` (completo):**
```typescript
{
  id: number
  codigo: string          // ej: "PAP-1A2B3C"
  nombre: string
  marca: string
  precio_compra_usd: number
  precio_venta_usd: number
  precio_compra_ves: number
  precio_venta_ves: number
  moneda_precio: 'usd' | 'ves'
  stock_actual: number
  stock_minimo: number
  categoria_id: number | null
  categoria_nombre?: string  // JOIN
  descripcion: string
  created_at: string         // timestamp
}
```

**Lógica especial `productos:create`:**
- Si `data.codigo` está vacío, se genera automáticamente: `'PAP-' + crypto.randomBytes(3).toString('hex').toUpperCase()`
- El código generado es único (función `ensureUniqueCode` hace loop hasta encontrar código no usado)
- Los precios VES se derivan de USD × tasa al guardar (en JS antes de invocar)

---

### Insumos (`insumos`)

| Canal | Signature | Descripción |
|-------|-----------|-------------|
| `insumos:list` | `() => Insumo[]` | Lista todos los insumos |
| `insumos:create` | `(data) => { id }` | Crea insumo |
| `insumos:update` | `({ id, ...data }) => boolean` | Actualiza insumo |
| `insumos:delete` | `(id: number) => boolean` | Elimina insumo |
| `insumos:ajustar` | `({ id, cantidad, operacion }) => { stock_hojas }` | Ajusta stock (sumar/restar) sin transacción completa |

**Tipo `Insumo`:**
```typescript
{
  id: number
  nombre: string
  tipo: string       // 'carta', 'oficio', 'doble-carta', 'otro'
  stock_hojas: number
  stock_minimo: number
  costo_por_hoja_usd: number
}
```

**`insumos:ajustar`**:
- `operacion`: `'sumar'` o `'restar'`
- NO crea registro en `mermas` (eso es para pérdidas). Es para ajustes contables manuales.
- Returns el nuevo `stock_hojas`.

---

### Servicios (`servicios`)

| Canal | Signature | Descripción |
|-------|-----------|-------------|
| `servicios:list` | `() => Servicio[]` | Lista todos los servicios (activos + inactivos) |
| `servicios:create` | `(data) => { id }` | Crea servicio |
| `servicios:update` | `({ id, ...data }) => boolean` | Actualiza servicio |
| `servicios:delete` | `(id: number) => boolean` | Elimina servicio |
| `servicios:search` | `(query: string) => Servicio[]` | Búsqueda por nombre (solo activos), limit 20 |

**Tipo `Servicio`:**
```typescript
{
  id: number
  nombre: string
  precio_usd: number
  precio_ves: number
  moneda_precio: 'usd' | 'ves'
  insumo_id: number | null
  insumo_nombre?: string  // JOIN desde insumos
  activo: 0 | 1          // 1=disponible, 0=oculto en POS
}
```

**Nota:** `servicios:search` filtra `activo = 1` automáticamente.

---

### Ventas (`ventas`)

**⚠️ Transaccional - el canal más importante**

| Canal | Signature | Descripción |
|-------|-----------|-------------|
| `ventas:create` | `(payload) => { id }` | **Transacción completa**: crea venta + detalles + pagos + descuenta stock |
| `ventas:list` | `(filters?) => Venta[]` | Lista ventas (sin detalles ni pagos) |
| `ventas:get` | `(id: number) => VentaCompleta | null` | Obtiene venta con líneas, pagos, abonos |
| `ventas:ultimas` | `(limit?) => Venta[]` | Últimas N ventas (default 20) |
| `ventas:paginated` | `({ page, perPage, fechaDesde, fechaHasta, estado }) => PaginatedResponse` | Lista paginada con filtros |

**Payload de `ventas:create`:**
```typescript
{
  cabecera: {
    subtotal_usd: number
    descuento_otorgado_usd: number
    total_usd: number
    tasa_cambio: number      // tasa del día al momento de venta
    estado: 'pagada' | 'credito'
    cliente_nombre: string   // '' si consumidor final
    saldo_pendiente_usd: number   // 0 si pagada, >0 si crédito
    notas: string
  },
  detalles: Array<{
    tipo: 'producto' | 'servicio'
    ref_id: number           // producto.id o servicio.id
    nombre: string           // copia al momento de venta
    cantidad: number
    cantidad_hojas_gastadas?: number  // solo servicios
    precio_unitario_usd: number
    subtotal_usd: number
  }>,
  pagos: Array<{
    metodo: 'efectivo_usd' | 'efectivo_ves' | 'pago_movil' | 'transferencia'
    monto_usd: number
    monto_ves?: number
  }>
}
```

**Retorno:** `{ id: number }` (ID de la venta creada)

**Proceso interno (transacción):**
```javascript
BEGIN TRANSACTION
1. INSERT INTO ventas (campos) → obtiene ventaId
2. FOR each detalle:
   a) INSERT INTO detalle_venta
   b) IF tipo='producto':
        UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?
      ELSE IF tipo='servicio' AND insumo_id:
        UPDATE insumos SET stock_hojas = stock_hojas - cantidad_hojas_gastadas WHERE id = ?
3. FOR each pago:
   INSERT INTO pagos (venta_id, metodo, monto_usd, monto_ves)
COMMIT
```

**Si cualquier paso falla → ROLLBACK → null**

**Tipo `VentaCompleta`:**
```typescript
{
  id: number
  fecha: string
  subtotal_usd: number
  descuento_otorgado_usd: number
  total_usd: number
  tasa_cambio: number
  estado: 'pagada' | 'credito'
  cliente_nombre: string
  saldo_pendiente_usd: number
  notas: string
  detalles: DetalleVenta[]
  pagos: Pago[]
  abonos: Abono[]   // solo para ventas a crédito
}
```

---

### Cuentas por Cobrar (`cuentas`)

| Canal | Signature | Descripción |
|-------|-----------|-------------|
| `cuentas:list` | `() => Venta[]` | Lista ventas con `estado = 'credito'` (con saldo_pendiente_usd > 0) |
| `cuentas:get` | `(ventaId: number) => VentaCompleta` | Obtiene una venta de crédito con todos sus detalles, pagos y abonos |
| `cuentas:abonar` | `({ venta_id, metodo, monto_usd, monto_ves, tasa }) => { saldo_pendiente_usd, estado }` | Registra un abono (pago parcial) y recalcula el saldo |
| `cuentas:ajustar_deuda` | `({ venta_id, nuevo_saldo_ves, nueva_tasa_cambio }) => { saldo_pendiente_usd, tasa_cambio, estado }` | Ajuste manual de deuda por admin (útil si se renegocia) |

**`cuentas:abonar` proceso:**
```javascript
BEGIN TRANSACTION
1. INSERT INTO abonos (venta_id, metodo, monto_usd, monto_ves)
2. SELECT saldo_pendiente_usd, total_usd FROM ventas WHERE id = ?
3. nuevoSaldo = max(0, oldSaldo - monto_usd)
4. UPDATE ventas SET saldo_pendiente_usd = nuevoSaldo,
                    estado = (nuevoSaldo <= 0.001 ? 'pagada' : 'credito')
                  WHERE id = ?
COMMIT
```

**Retorno:**
```typescript
{
  saldo_pendiente_usd: number
  estado: 'pagada' | 'credito'
}
```

---

### Reportes (`reportes`)

| Canal | Signature | Descripción |
|-------|-----------|-------------|
| `reportes:hoy` | `() => ReporteHoy` | Reporte en vivo del día actual (calculado en tiempo real) |
| `reportes:cerrar_dia` | `({ tasa }) => ReporteHoy` | Fuerza cierre del día (upsert de snapshot) |
| `reportes:historial` | `() => CierreHistorial[]` | Lista de todos los días cerrados |
| `reportes:cierre_detalle` | `(fecha: string) => CierreCompleto | null` | Detalle completo (con JSON parsed) de un día cerrado |
| `reportes:inventario` | `(tasa: number) => { stats, bajo_stock }` | Métricas de inventario + alertas |
| `dashboard:metrics` | `() => DashboardMetrics` | Métricas extendidas para Dashboard (trend, top productos, top deudores) |

**Tipo `ReporteHoy`:**
```typescript
{
  cerrado: boolean                // ¿ya se ejecutó reportes:cerrar_día hoy?
  cerrado_en: string | null       // timestamp del cierre
  tasa_cierre: number | null      // tasa usada en el cierre (si cerrado)
  fecha: string                   // 'YYYY-MM-DD'
  total_ventas: number
  ingresos_usd: number
  ingresos_ves: number            // sum(pagos.monto_ves) + sum(abonos.monto_ves)
  descuentos_usd: number
  pendiente_cobrar_usd: number    // suma de saldo_pendiente_usd de créditos
  ganancia_neta_usd: number       // (precio_venta - precio_compra) - descuentos
  pagos: Array<{ metodo, total_usd, total_ves }>
  abonos: Array<{ metodo, total_usd, total_ves }>
  ventas: VentaCompleta[]         // lista completa con detalles
}
```

**Tipo `CierreHistorial`:**
```typescript
{
  id: number
  fecha: string
  tasa_cierre: number
  total_ventas: number
  ingresos_usd: number
  ingresos_ves: number
  cerrado_en: string
}
```

**Tipo `CierreCompleto`:** = `ReporteHoy` pero con `pagos_json`, `abonos_json`, `ventas_json` ya parseados.

**Tipo `ReporteInventario`:**
```typescript
{
  stats: {
    total_productos: number
    total_articulos: number     // suma de stock_actual
    inversion_usd: number       // suma (precio_compra × stock) en USD
    ganancia_potencial_usd: number  // (precio_venta - precio_compra) × stock
  }
  bajo_stock: Array<{
    id: number
    codigo: string
    nombre: string
    marca?: string
    stock_actual: number
    stock_minimo: number
  }>
}
```

**Tipo `DashboardMetrics`:**
```typescript
{
  trend: Array<{ fecha: string, total: number }>  // 7 días, completa días faltantes con 0
  top_productos: Array<{ ref_id: number, nombre: string, total_vendido: number, ingresos: number }>
  top_deudores: Array<{ nombre: string, deuda: number }>
}
```

---

### Mermas (`mermas`)

| Canal | Signature | Descripción |
|-------|-----------|-------------|
| `mermas:list` | `() => Merma[]` | Lista últimas 200 mermas |
| `mermas:create` | `(data) => { id }` | Crea merma y descuenta stock (transacción) |

**Payload `mermas:create`:**
```typescript
{
  producto_id?: number   // uno de los dos debe estar presente
  insumo_id?: number
  cantidad: number
  motivo: 'daño' | 'robo' | 'uso_interno' | 'vencimiento' | 'otro'
  notas?: string
}
```

**Proceso interno:**
```javascript
BEGIN
1. INSERT INTO mermas (producto_id, insumo_id, cantidad, motivo, notas)
2. SI producto_id → UPDATE productos SET stock_actual = stock_actual - cantidad WHERE id = ?
3. SI insumo_id → UPDATE insumos SET stock_hojas = stock_hojas - cantidad WHERE id = ?
COMMIT
```

---

## 🎯 Tipos de Datos Compartidos

### Enumeraciones

**Moneda Precio:**
```typescript
type MonedaPrecio = 'usd' | 'ves'
```

**Estado Venta:**
```typescript
type EstadoVenta = 'pagada' | 'credito'
```

**Métodos de Pago:**
```typescript
type MetodoPago =
  | 'efectivo_usd'
  | 'efectivo_ves'
  | 'pago_movil'
  | 'transferencia'
```

**Motivos de Merma:**
```typescript
type MotivoMerma =
  | 'daño'
  | 'robo'
  | 'uso_interno'
  | 'vencimiento'
  | 'otro'
```

---

## ❌ Canales no Implementados (Futuro)

Estos canales fueron considerados pero no implementados:

| Canal | Propuesto para | Razón no implementado |
|-------|----------------|-----------------------|
| `productos:bulk_update` | Actualizar múltiples productos precios | No necesario, UI no lo requiere |
| `ventas:refund` | Devolución/nota de crédito | Fuera de scope v2.5.0 |
| `usuarios:*` | Autenticación | No hay login |
| `config:reset` | Resetear toda la DB | Peligroso, no expuesto |
| `db:vacuum` | Compactar DB | Manual, no automático |

---

## 🧪 Ejemplos de Uso

### Leer configuración

```javascript
const cfg = await window.api.invoke('config:getAll')
const tasa = parseFloat(cfg.tasa_del_dia)
const nombre = cfg.nombre_tienda
```

### Buscar producto para POS

```javascript
const query = 'cuaderno'
const resultados = await window.api.invoke('productos:search', query)
// [
//   { id: 1, nombre: 'Cuaderno Deletreo', precio_venta_usd: 2.50, ... },
//   ...
// ]
```

### Crear venta (POS)

```javascript
const ventaId = await window.api.invoke('ventas:create', {
  cabecera: {
    subtotal_usd: 25.50,
    descuento_otorgado_usd: 0,
    total_usd: 25.50,
    tasa_cambio: 36.5,
    estado: 'pagada',
    cliente_nombre: '',
    saldo_pendiente_usd: 0,
    notas: ''
  },
  detalles: [{
    tipo: 'producto',
    ref_id: 5,
    nombre: 'Lapicero Negro',
    cantidad: 2,
    precio_unitario_usd: 0.50,
    subtotal_usd: 1.00
  }],
  pagos: [{
    metodo: 'efectivo_usd',
    monto_usd: 25.50,
    monto_ves: 931.25
  }]
})
```

### Registrar abono

```javascript
const result = await window.api.invoke('cuentas:abonar', {
  venta_id: 42,
  metodo: 'pago_movil',
  monto_usd: 10,
  monto_ves: 365,     // opcional si das monto_usd
  tasa: 36.5
})
// { saldo_pendiente_usd: 15.50, estado: 'credito' }
```

---

## 🔄 Manejo de Errores

**Errores se propagan como excepciones JavaScript:**

```javascript
try {
  await window.api.invoke('productos:get', 9999)
} catch (err) {
  console.error(err.message) // "Result set is empty" o SQL error
}
```

**Errores comunes:**

| Error | Causa | Solución |
|-------|--------|----------|
| `No handler implemented` | El canal IPC no existe (typo en nombre) | Verificar nombre exacto |
| `Database not initialized` | `initDb()` no ha corrido | App debe iniciar main primero |
| `SQLITE_CONSTRAINT` | Violación de UNIQUE o NOT NULL | Validar datos antes de enviar |
| `Result set is empty` | `db.get` no encontró fila | Comprobar ID existente |

---

## 📊 Performance Considerations

- **IPC overhead:** ~1-5ms por llamada en producción (dentro de misma máquina)
- **Consultas grandes:** `ventas:paginated` con perPage=25 es rápido (< 50ms)
- **Transacciones:** `ventas:create` tarda ~10-30ms dependiendo de número de items
- **Búsquedas:** `productos:search` usa `LIKE %term%` → full-text scan si no hay índice → limit 20 para mitigar
- **Reportes:** `reportes:hoy` con 1000 ventas → ~100ms (porque hace N+1 queries, podría optimizarse)

**Recomendación:** Evitar llamadasIPC en loops → batch cuando sea posible (`ventas:create` ya batch). Para listados grandes, usar paginated.

---

## 🔒 Seguridad IPC

**Preload aísla los canales:**
- Solo se expone `window.api.invoke` y `window.api.on`
- El renderer NO tiene acceso directo a `require`, `process`, `ipcRenderer`

**Validación en backend:**
- Los handlers no asumen tipos correctos ─ usan `parseFloat` fallback
- Pero **no hay validación estricta** (no usa Joi/Zod). Confía en frontend.

**Sanitización:**
- SQL usa bound parameters (`?`) → previene inyección
- Strings se pasan tal cual a DB → riesgo de XSS si se muestran sin escapar (pero React escapea por defecto)

---

## 📡 API HTTP Equivalente

Cada canal IPC tiene su endpoint HTTP correspondiente:

```
POST http://localhost:3001/api/invoke
Content-Type: application/json

{
  "channel": "ventas:create",
  "args": [ { cabecera: {...}, detalles: [...], pagos: [...] } ]
}
```

**Respuesta:**
```json
{
  "result": { "id": 123 }
}
```

**Error HTTP 404:**
```json
{
  "error": "No handler implemented for channel: foo:bar"
}
```

**Error HTTP 500:**
```json
{
  "error": "SQLITE_CONSTRAINT: NOT NULL constraint failed: productos.nombre"
}
```

---

*Documento mantenido como código - actualizar cuando se agreguen/eliminen canales.*
