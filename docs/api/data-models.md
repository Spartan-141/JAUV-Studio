# Modelos de Datos (VES Only)

Este documento define las estructuras de datos que se transmiten entre el frontend (Renderer) y el backend (Main). 

---

## 📦 Tipos Fundamentales

### Monedas

El sistema está optimizado para operar exclusivamente en Bolívares. El campo `moneda_precio` se mantiene en el esquema de base de datos por compatibilidad pero su valor es siempre `'ves'`.

```typescript
type Moneda = 'ves'
```

---

### Estados de Venta

```typescript
type EstadoVenta = 'pagada' | 'credito'
```

- `'pagada'`: Transacción completada, sin saldo pendiente.
- `'credito'`: Transacción con saldo pendiente por cobrar en VES.

---

### Métodos de Pago

```typescript
type MetodoPago =
  | 'efectivo_ves'     // Efectivo en bolívares
  | 'pago_movil'       // Pago móvil (VES)
  | 'transferencia'    // Transferencia bancaria (VES)
```

---

## 📊 Modelo de Producto

```typescript
interface Producto {
  id: number
  codigo: string               // Ej: "PROD-X7Y9Z2"
  nombre: string
  marca: string
  descripcion: string
  precio_compra: number        // Costo en VES
  precio_venta: number         // Precio en VES
  stock_actual: number         
  stock_minimo: number         
  categoria_id: number | null  
  categoria_nombre?: string    
  created_at: string           
}

interface ProductoPaginationParams {
  page: number
  perPage: number
  search?: string
  categoria_id?: number | string
  bajo_stock?: boolean | string
}

interface PaginatedProductos {
  productos: Producto[]
  total: number
  page: number
  perPage: number
  pages: number
}
```

---

## 📦 Modelo de Insumo

```typescript
interface Insumo {
  id: number
  nombre: string
  tipo: string             // 'carta' | 'oficio' | etc.
  stock_hojas: number      
  stock_minimo: number     
  costo_por_hoja: number   // Costo unitario en VES
}
```

---

## 📄 Modelo de Servicio

```typescript
interface Servicio {
  id: number
  nombre: string                 
  precio: number                 // Precio en VES
  insumo_id: number | null      
  insumo_nombre?: string         
  activo: 0 | 1                 
}
```

---

## 🛒 Modelo de Carrito (POS)

```typescript
interface CartItem {
  tipo: 'producto' | 'servicio'
  ref_id: number           
  nombre: string           
  cantidad: number         
  precio_unitario: number   // Siempre en VES
  subtotal: number          // cantidad * precio_unitario
  // Campos adicionales
  stock_actual?: number    // solo productos
  cantidad_hojas_gastadas?: number  // solo servicios
}
```

---

## 💶 Modelo de Venta (Cabecera)

```typescript
interface VentaCabecera {
  id?: number
  fecha?: string
  subtotal: number
  descuento: number
  total: number              // subtotal - descuento
  estado: EstadoVenta
  cliente_nombre: string     
  saldo_pendiente: number    
  notas: string
}
```

---

## 💳 Modelo de Pago

```typescript
interface Pago {
  venta_id: number
  metodo: MetodoPago
  monto: number             // Monto en VES
  fecha: string             
}
```

---

## 📈 Modelos de Reportes (Dinámicos)

> [!NOTE]
> El modelo `CierreDia` ha sido descartado en favor de cálculos en tiempo real para evitar inconsistencias de datos.

```typescript
interface ReporteResumen {
  ingresos: number            // Total facturado bruto
  descuentos: number          
  pendiente_cobrar: number    // Deuda activa en este rango
  ganancia_neta: number       // Estimado (Venta - Compra)
  pagos: Array<{ metodo: string, total_ves: number }>
}

interface PaginatedVentas {
  ventas: VentaCabecera[]      // Lista de facturas con sus detalles/pagos
  total: number               // Total de facturas en el filtro
  page: number
  perPage: number
  pages: number
  resumen: ReporteResumen      // Métricas calculadas para este filtro
}

export interface CalendarioDia {
  fecha: string;         // 'YYYY-MM-DD'
  total_ventas: number;  // número de ventas en el día
  ingresos: number;      // sumatoria de total_usd
  creditos: number;      // número de ventas a crédito
}

> [!IMPORTANT]
> **Cálculo de "Cobrado"**: A partir de la v2.7.0, el monto cobrado visualizado en la interfaz no es una resta matemática (`total - saldo`), sino la suma real de la tabla `pagos` y `abonos`. Esto asegura que si el precio de un ítem baja, los pagos previos se mantengan íntegros en el reporte.
```

---

**Arquitectura de Tipado:**
Para verificar las validaciones exactas realizadas en el backend, consulte los esquemas de **Zod** definidos en:
- `electron/application/use-cases/`
