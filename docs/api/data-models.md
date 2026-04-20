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

## 📈 Modelo de Cierre de Día

```typescript
interface CierreDia {
  id: number
  fecha: string                // 'YYYY-MM-DD'
  total_ventas: number
  ingresos: number             // Total VES
  descuentos: number           
  pendiente_cobrar: number     
  ganancia_neta: number        
  // Snapshots JSON
  pagos: Array<{ metodo: string, total: number }>
  abonos: Array<{ metodo: string, total: number }>
  ventas: any[]                
  cerrado_en: string           
}
```

---

**Arquitectura de Tipado:**
Para verificar las validaciones exactas realizadas en el backend, consulte los esquemas de **Zod** definidos en:
- `electron/application/use-cases/`
