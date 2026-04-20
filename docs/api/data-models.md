# Modelos de Datos

Este documento define todos los tipos de datos (interfaces) que se transmiten entre frontend y backend. Está escrito en estilo TypeScript pero el proyecto usa JavaScript puro.

---

## 📦 Tipos Fundamentales

### Monedas

```typescript
type Moneda = 'usd' | 'ves'
```

**Uso:** Campo `moneda_precio` en productos y servicios.

**Semántica:**
- `'usd'`: el precio base está en dólares; el precio en VES se calcula multiplicando por `tasa`
- `'ves'`: el precio base está fijo en bolívares; el precio en USD se calcula dividiendo por `tasa`

---

### Estados de Venta

```typescript
type EstadoVenta = 'pagada' | 'credito'
```

- `'pagada'`: todos los pagos cubren el total, no hay saldo pendiente
- `'credito'`: hay saldo_pendiente_usd > 0, se puede abonar parcialmente

---

### Métodos de Pago

```typescript
type MetodoPago =
  | 'efectivo_usd'     // Efectivo en dólares
  | 'efectivo_ves'     // Efectivo en bolívares
  | 'pago_movil'       // Pago móvil (VES)
  | 'transferencia'    // Transferencia bancaria (VES)
```

**Conversión a VES:**
- `efectivo_usd`: `monto_ves = monto_usd × tasa`
- Otros: `monto_ves = monto_ingresado`, `monto_usd = monto_ves / tasa`

---

### Motivos de Merma

```typescript
type MotivoMerma =
  | 'daño'           // Producto dañado/roto
  | 'robo'           // Robo o extravío
  | 'uso_interno'    // Consumo interno (ej: prueba de impresora)
  | 'vencimiento'    // Producto vencido
  | 'otro'           // Otro motivo
```

---

## 📊 Modelo de Producto

### Forma Completa

```typescript
interface Producto {
  id: number
  codigo: string               // Ej: "PAP-1A2B3C"
  nombre: string               // Requerido
  marca: string                // Opcional, default ''
  descripcion: string          // Opcional, default ''
  // ── Precios ─────────────────────────────────────
  precio_compra_usd: number    // Costo en USD (para calcular ganancia)
  precio_venta_usd: number     // Precio venta si moneda='usd'
  precio_compra_ves: number    // Costo en VES (solo si moneda='ves')
  precio_venta_ves: number     // Precio venta si moneda='ves'
  moneda_precio: Moneda        // 'usd' o 'ves'
  // ── Inventario ──────────────────────────────────
  stock_actual: number         // Unidades disponibles
  stock_minimo: number         // Alerta cuando ≤ este valor
  // ── Relaciones ─────────────────────────────────
  categoria_id: number | null  // FK a categorias
  categoria_nombre?: string    // JOIN (solo en list)
  created_at: string           // Timestamp SQLite (ej: "2025-04-19 10:30:00")
}
```

### Ejemplo

```json
{
  "id": 42,
  "codigo": "PAP-X7Y9Z2",
  "nombre": "Cuaderno Deletreo 80 hojas",
  "marca": "Norma",
  "descripcion": "Cuaderno de 80 hojas, línea infantil",
  "precio_compra_usd": 1.50,
  "precio_venta_usd": 3.50,
  "precio_compra_ves": 0,
  "precio_venta_ves": 0,
  "moneda_precio": "usd",
  "stock_actual": 25,
  "stock_minimo": 10,
  "categoria_id": 1,
  "categoria_nombre": "Cuadernos",
  "created_at": "2025-03-15 14:22:00"
}
```

### Cálculos en Frontend

```javascript
// Precio mostrado en VES:
const precioVes = producto.moneda_precio === 'ves'
  ? producto.precio_venta_ves
  : producto.precio_venta_usd * tasa

// Precio mostrado en USD:
const precioUsd = producto.moneda_precio === 'usd'
  ? producto.precio_venta_usd
  : producto.precio_venta_ves / tasa

// Margen de ganancia (si moneda=usd):
const margen = ((precio_venta_usd - precio_compra_usd) / precio_compra_usd) * 100
```

---

## 📦 Modelo de Insumo

### Forma Completa

```typescript
interface Insumo {
  id: number
  nombre: string           // Ej: "Papel Carta"
  tipo: string             // 'carta' | 'oficio' | 'doble-carta' | 'otro'
  stock_hojas: number      // Cantidad de hojas (o unidades) disponibles
  stock_minimo: number     // Alerta cuando ≤ esto
  costo_por_hoja_usd: number  // Costo unitario en USD
}
```

### Ejemplo

```json
{
  "id": 1,
  "nombre": "Papel Carta",
  "tipo": "carta",
  "stock_hojas": 500,
  "stock_minimo": 50,
  "costo_por_hoja_usd": 0.003
}
```

---

## 📄 Modelo de Servicio

### Forma Completa

```typescript
interface Servicio {
  id: number
  nombre: string                 // Ej: "Copia B/N Carta"
  precio_usd: number             // Precio si moneda='usd' (derivado si moneda='ves')
  precio_ves: number             // Precio si moneda='ves' (derivado si moneda='usd')
  moneda_precio: Moneda          // 'usd' o 'ves'
  insumo_id: number | null      // FK a insumos (qué material consume)
  insumo_nombre?: string         // JOIN (opcional)
  activo: 0 | 1                 // 1 = disponible en POS, 0 = oculto
}
```

**Nota sobre precios VES:**
- Si `moneda_precio='usd'`, el campo `precio_ves` en DB suele ser 0, pero se calcula en frontend multiplicando por tasa
- Si `moneda_precio='ves'`, el campo `precio_usd` en DB suele ser 0, pero se calcula dividiendo por tasa

### Ejemplo (moneda USD)

```json
{
  "id": 1,
  "nombre": "Copia B/N Carta",
  "precio_usd": 0.05,
  "precio_ves": 0,
  "moneda_precio": "usd",
  "insumo_id": 1,
  "insumo_nombre": "Papel Carta",
  "activo": 1
}
```

**Precio en VES (calculado en frontend):**
```javascript
const precioVes = servicio.precio_usd * tasa  // digamos 0.05 × 40 = 2.00 Bs
```

---

## 🛒 Modelo de Carrito (POS - no persistido)

### Item del Carrito

```typescript
interface CartItem {
  tipo: 'producto' | 'servicio'
  ref_id: number           // ID del producto o servicio
  nombre: string           // Copia al momento de agregar (para histórico)
  cantidad: number         // Unidades (copias para servicios)
  // ── Precios (ambos siempre presentes) ─────────────
  precio_unitario_usd: number
  precio_unitario_ves: number
  subtotal_usd: number
  subtotal_ves: number
  // ── Campos adicionales según tipo ─────────────────
  moneda_precio?: Moneda   // solo para productos
  stock_actual?: number    // solo para productos
  cantidad_hojas_gastadas?: number  // solo para servicios
  insumo_id?: number      // solo para servicios
}
```

**Construcción:**
- Para **productos:** precios se calculan al agregar según `producto.moneda_precio` y `tasa`
- Para **servicios:** precio viene del servicio (se calcula al agregar)

---

## 💶 Modelo de Cabecera de Venta (ventas)

```typescript
interface VentaCabecera {
  subtotal_usd: number
  descuento_otorgado_usd: number
  total_usd: number              // subtotal - descuento
  tasa_cambio: number            // Tasa BCV usada en esta transacción
  estado: EstadoVenta
  cliente_nombre: string         // '' si consumidor final
  saldo_pendiente_usd: number    // 0 si pagada, >0 si crédito
  notas: string
}
```

**Relación con carrito:**
```javascript
const subtotal_usd = cart.reduce((s, i) => s + i.subtotal_usd, 0)
const descuento_otorgado_usd = calcularDescuentoEnUsd(...)
const total_usd = subtotal_usd - descuento_otorgado_usd
```

---

## 📝 Modelo de Línea de Venta (detalle_venta)

```typescript
interface DetalleVenta {
  venta_id: number
  tipo: 'producto' | 'servicio'
  ref_id: number            // producto.id o servicio.id
  nombre: string            // snapshot del nombre al momento de venta
  cantidad: number          // unidades vendidas
  cantidad_hojas_gastadas?: number  // solo servicios (default 0)
  precio_unitario_usd: number
  subtotal_usd: number      // = cantidad × precio_unitario_usd
}
```

**Nota:** `cantidad_hojas_gastadas` es la cantidad física de hojas/insumo consumido:
- Para productos normalmente vale 0
- Para servicios de copia, puede ser > `cantidad` por errores

---

## 💳 Modelo de Pago (pagos)

```typescript
interface Pago {
  venta_id: number
  metodo: MetodoPago
  monto_usd: number
  monto_ves: number
  fecha: string             // timestamp de la transacción
}
```

### Ejemplo de conjunto de pagos para una venta de $15 ($10 USD + $5 VES)

```json
[
  { "metodo": "efectivo_usd", "monto_usd": 10.00, "monto_ves": 400.00 },
  { "metodo": "pago_movil",   "monto_usd": 5.00,  "monto_ves": 200.00 }
]
```

**Total pagado en USD:**
```javascript
const totalPagadoUsd = pagos.reduce((sum, p) => sum + p.monto_usd, 0)  // = 15
```

---

## 💰 Modelo de Abono (abonos)

Misma estructura que `Pago` pero para pagos posteriores de créditos.

```typescript
interface Abono extends Omit<Pago, 'venta_id'> {
  id: number
  venta_id: number
  fecha: string
}
```

**Diferencia:** `Pago` se crea junto a la venta; `Abono` se crea después mediante `cuentas:abonar`.

---

## 📈 Modelo de Cierre de Día (cierres_dia)

```typescript
interface CierreDia {
  id: number
  fecha: string                // 'YYYY-MM-DD'
  tasa_cierre: number          // Tasa usada en el cierre (puede diferir de la actual)
  total_ventas: number
  ingresos_usd: number
  ingresos_ves: number
  descuentos_usd: number
  pendiente_cobrar_usd: number
  ganancia_neta_usd: number
  // ── Snapshot JSON (parsed al leer) ─────────────────
  pagos: Array<{ metodo: string, total_usd: number, total_ves: number }>
  abonos: Array<{ metodo: string, total_usd: number, total_ves: number }>
  ventas: VentaCompleta[]      // Con detalles, pagos, abonos incluidos
  cerrado_en: string           // Timestamp del cierre (ej: "2025-04-19 20:30:45")
}
```

**Lectura:**
- `reportes:hoy` → devuelve `ReporteHoy` (campos planos + arrays, no usa JSON parse porque no viene de DB)
- `reportes:cierre_detalle` → lee row de `cierres_dia` y parsea los JSON columns

**Cálculo de `ganancia_neta_usd`:**
```sql
ganancia_bruta = SUM((precio_venta_usd - precio_compra_usd) × cantidad)
ganancia_neta = ganancia_bruta - descuentos_usd
```

---

## 🔍 Modelo de Merma (mermas)

```typescript
interface Merma {
  id: number
  producto_id: number | null
  insumo_id: number | null
  cantidad: number
  motivo: MotivoMerma
  notas: string
  fecha: string
  // JOINs (para mostrar en lista)
  producto_nombre?: string
  insumo_nombre?: string
}
```

**Ejemplo de lista:**

```json
[
  {
    "id": 1,
    "producto_id": 5,
    "insumo_id": null,
    "cantidad": 3,
    "motivo": "daño",
    "notas": "Paquete maltratado en recepción",
    "fecha": "2025-04-18 09:12:00",
    "producto_nombre": "Cuaderno Deletreo"
  }
]
```

---

## 🏷️ Modelo de Categoría

```typescript
interface Categoria {
  id: number
  nombre: string
  total_productos: number   // COUNT de productos en esta categoría
}
```

---

## 🏪 Modelo de Configuración

```typescript
interface Config {
  tasa_del_dia: string         // "40.00" (se parsea a float)
  nombre_tienda: string
  telefono_tienda: string
  direccion_tienda: string
  ticket_pie: string
  impresora_ancho: string      // "58" | "80"
  [key: string]: string        // extensible (clave-valor genérico)
}
```

**Acceso:**
```javascript
const cfg = await window.api.invoke('config:getAll')
// cfg.tasa_del_dia → string
const tasa = parseFloat(cfg.tasa_del_dia)
```

---

**Para ver todos los tipos reales bajo la nueva arquitectura DDD:**
- `electron/domain/repositories/interfaces/*.ts` (Interfaces centrales)
- `electron/application/use-cases/**/*.ts` (Esquemas Zod)

---

*Documento mantenido como código - tipo-check manual recommended.*
