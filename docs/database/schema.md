# Esquema de Base de Datos (VES Only)

## 📊 Visión General

La base de datos **SQLite3** (`jauv_pos.db`) contiene **11 tablas principales** optimizadas para un sistema de punto de venta configurado exclusivamente en **Bolívares (VES)**.

**Total de tablas:** 11 de negocio.
**Tamaño estimado:** < 500 MB para 5 años de operación.
**Journal mode:** WAL (Write-Ahead Logging).

---

## 📝 Diccionario de Datos (Campos Clave)

### Tabla `configuracion`

Almacena la configuración global.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `clave` | TEXT | Identificador único |
| `valor` | TEXT | Valor de configuración |

**Configuraciones activas:** `nombre_tienda`, `telefono_tienda`, `direccion_tienda`, `ticket_pie`, `impresora_ancho`.
*Nota: El campo `tasa_del_dia` se mantiene físicamente por compatibilidad pero ya no es utilizado por la lógica de la aplicación.*

---

### Tabla `productos`

Inventario de productos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER | PK |
| `codigo` | TEXT | Código único (barcode) |
| `nombre` | TEXT | Nombre del producto |
| `precio_compra_ves` | REAL | Costo en Bolívares |
| `precio_venta_ves` | REAL | Precio de venta en Bolívares |
| `moneda_precio` | TEXT | Siempre 'ves' |
| `stock_actual` | INTEGER | Unidades físicas |
| `stock_minimo` | INTEGER | Alerta de stock |

---

### Tabla `insumos`

Materiales consumibles para el centro de copiado.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER | PK |
| `nombre` | TEXT | Ej: "Papel Carta" |
| `stock_hojas` | INTEGER | Hojas disponibles |
| `costo_por_hoja_usd` | REAL | Almacena el costo en VES (Legacy name) |

---

### Tabla `servicios`

Catálogo de servicios (fotocopias, impresiones).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER | PK |
| `nombre` | TEXT | Nombre del servicio |
| `precio_ves` | REAL | Precio en Bolívares |
| `insumo_id` | INTEGER | FK a la tabla insumos |

---

### Tabla `ventas` (Cabecera)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER | PK |
| `fecha` | TEXT | Timestamp de la venta |
| `subtotal_usd` | REAL | Subtotal en VES (Legacy name) |
| `descuento_otorgado_usd` | REAL | Descuento en VES |
| `total_usd` | REAL | Total final en VES |
| `estado` | TEXT | 'pagada' o 'credito' |
| `saldo_pendiente_usd` | REAL | Saldo por cobrar en VES |

---

### Tabla `detalle_venta`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `venta_id` | INTEGER | FK a ventas |
| `nombre` | TEXT | Snapshot del nombre |
| `cantidad` | INTEGER | Unidades cobradas |
| `precio_unitario_usd` | REAL | Precio en VES (Legacy name) |

---

### Tabla `pagos` y `abonos`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `metodo` | TEXT | 'efectivo_ves', 'pago_movil', 'transferencia' |
| `monto_ves` | REAL | Monto pagado en Bolívares |

---

### Tabla `cierres_dia` (OBSOLETA / LEGACY)

> [!IMPORTANT]
> A partir de la versión 2.6.0, esta tabla **ya no es utilizada** por la aplicación. Los reportes se calculan dinámicamente sobre la tabla `ventas` para garantizar datos siempre actualizados en tiempo real. Se mantiene en el esquema físico para compatibilidad con bases de datos antiguas.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ingresos_ves` | REAL | Suma total de pagos recibidos |
| `descuentos_usd` | REAL | Suma de descuentos en VES |
| `ganancia_neta_usd` | REAL | Ganancia calculada en VES |
| `pagos_json` | TEXT | Snapshot de métodos de pago |

---

## 🚀 Migraciones y Compatibilidad

La arquitectura actual preserva los nombres de columnas originales con sufijo `_usd` para evitar migraciones de esquema costosas, pero la lógica de negocio trata todos los montos como **Bolívares (VES)**. 

Para nuevos desarrollos, se recomienda utilizar las columnas con sufijo `_ves` cuando estén disponibles (como en `productos` y `servicios`).
