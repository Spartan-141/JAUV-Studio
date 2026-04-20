# Esquema de Base de Datos

## 📊 Visión General

La base de datos **SQLite** (`jauv_pos.db`) contiene **11 tablas principales** diseñadas para un sistema POS bimoneda con inventario, servicios de copiado y cuentas por cobrar.

**Total de tablas:** 13 (11 de negocio + 2 meta: SQLite internal)
**Tama estimado:** < 500 MB para 5 años de operación
**Journal mode:** WAL (Write-Ahead Logging)

---

## 🗂️ Diagrama Relacional (Texto)

```
configuracion (1──∞)  categorias (1──∞)  productos
     │                       │                 │
     │                       │                 │
     └───────────────┬───────┘                 │
                     │                        │
                insumos (1──∞)              servicios
                     │                        │
                     ├──────────┬─────────────┘
                     │          │
                     ▼          ▼
                 mermas   detalle_venta ◄──┐
                                       │   │
                                       ▼   │
                                     ventas ◄─┘
                                        │
                               ┌────────┼────────┐
                               ▼        ▼        ▼
                            pagos    abonos   cierres_dia
```

**Relaciones:**
- `categorias` → `productos` (1:N, opcional)
- `productos` → `detalle_venta` (1:N, por `ref_id` + `tipo='producto'`)
- `insumos` → `servicios` (1:N, opcional)
- `insumos` → `detalle_venta` (1:N, por `ref_id` + `tipo='servicio'`)
- `ventas` → `detalle_venta` (1:N, ON DELETE CASCADE)
- `ventas` → `pagos` (1:N, ON DELETE CASCADE)
- `ventas` → `abonos` (1:N, ON DELETE CASCADE)
- `ventas` → `cierres_dia` (1:N, por fecha)

---

## 📝 Diccionario de Datos

### Tabla `configuracion`

Almacena configuración global del sistema en formato clave-valor.

| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| `clave` | TEXT | PRIMARY KEY | Identificador único (ej: 'tasa_del_dia') |
| `valor` | TEXT | NOT NULL | Valor almacenado como string (se parsea según contexto) |

**Semillas iniciales (db.js:152-158):**
```sql
INSERT OR IGNORE INTO configuracion VALUES
  ('tasa_del_dia', '40.00'),
  ('nombre_tienda', 'JAUV Studio'),
  ('telefono_tienda', ''),
  ('direccion_tienda', 'Venezuela'),
  ('ticket_pie', 'Gracias por su compra!'),
  ('impresora_ancho', '80')
```

**Uso:**
- `tasa_del_dia` → tasa BCV para conversiones (float)
- `nombre_tienda`, `telefono_tienda`, `direccion_tienda` → impresión de tickets
- `ticket_pie` → mensaje final del ticket
- `impresora_ancho` → '58' o '80' mm (afecta ancho CSS del ticket)

**Handler:** `config:get`, `config:getAll`, `config:set` (config.js)

---

### Tabla `categorias`

Categorías de productos (ej: Cuadernos, Lapiceros, Papel).

| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | ID autoincremental |
| `nombre` | TEXT | NOT NULL UNIQUE | Nombre de categoría |

**Semillas iniciales (db.js:161-163):**
```sql
INSERT OR IGNORE INTO categorias (nombre) VALUES
  ('Cuadernos'), ('Lapiceros'), ('Carpetas'), ('Papel'), ('Tintas'), ('Otros')
```

**Relaciones:**
- 1 categoría → N productos (LEFT JOIN en listados)

**Index:**
- `UNIQUE(nombre)` evita duplicados
- `id` es PK automáticamente indexada

**Handler:** `categorias:list`, `categorias:create`, `categorias:update`, `categorias:delete`, `categorias:productos`, `categorias:bulk_assign` (categorias.js)

---

### Tabla `productos`

Inventario de productos vendibles.

| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `codigo` | TEXT | UNIQUE | Código de barras (formato PAP-XXXXXX) |
| `nombre` | TEXT | NOT NULL | Nombre descriptivo |
| `marca` | TEXT | DEFAULT '' | Marca del producto |
| `precio_compra_usd` | REAL | NOT NULL DEFAULT 0 | Costo en USD (para calcular ganancia) |
| `precio_venta_usd` | REAL | NOT NULL DEFAULT 0 | Precio de venta en USD (si moneda_precio='usd') |
| `precio_compra_ves` | REAL | NOT NULL DEFAULT 0 | Costo en VES (solo si moneda_precio='ves') |
| `precio_venta_ves` | REAL | NOT NULL DEFAULT 0 | Precio de venta en VES (si moneda_precio='ves') |
| `moneda_precio` | TEXT | DEFAULT 'usd' | 'usd' o 'ves' - determina cuál par usar |
| `stock_actual` | INTEGER | NOT NULL DEFAULT 0 | Cantidad disponible |
| `stock_minimo` | INTEGER | NOT NULL DEFAULT 0 | Alerta cuando <= este valor |
| `categoria_id` | INTEGER | REFERENCES categorias(id) ON DELETE SET NULL | Categoría (opcional) |
| `descripcion` | TEXT | DEFAULT '' | Notas internas |
| `created_at` | TEXT | DEFAULT datetime('now','localtime') | Fecha de creación |

**Lógica de precios:**
- Si `moneda_precio = 'usd'`:
  - `precio_venta_ves` = `precio_venta_usd * tasa_actual` (calculado en frontend al mostrar)
  - `precio_compra_ves` = `precio_compra_usd * tasa_actual`
- Si `moneda_precio = 'ves'`:
  - `precio_venta_usd` = `precio_venta_ves / tasa_actual`
  - `precio_compra_usd` = `precio_compra_ves / tasa_actual`

**Restricciones:**
- `codigo` único → evita duplicados de扫码
- `stock_actual >= 0` (validado en frontend, no hay CHECK constraint)
- Foreign key `categoria_id` → si se borra categoría, productos quedan sin categoría (SET NULL)

**Índices:**
- PK en `id`
- UNIQUE en `codigo`
- INDEX implícito en `categoria_id` (por foreign key, SQLite no crea índice automáticamente en FK, pero puede añadirse manualmente si performance issues)

**Handler:** productos:list (con filtros), productos:get, productos:create, productos:update, productos:delete, productos:search (productos.js)

---

### Tabla `insumos`

Materiales consumibles para servicios de copiado (papel, tinta).

| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `nombre` | TEXT | NOT NULL UNIQUE | Ej: "Papel Carta", "Tinta Negra" |
| `tipo` | TEXT | DEFAULT '' | 'carta', 'oficio', 'doble-carta', 'otro' |
| `stock_hojas` | INTEGER | NOT NULL DEFAULT 0 | Cantidad de hojas (o unidades) disponibles |
| `stock_minimo` | INTEGER | NOT NULL DEFAULT 0 | Alerta de reposición |
| `costo_por_hoja_usd` | REAL | DEFAULT 0 | Costo unitario en USD (para calcular costo de servicio) |

**Semillas iniciales (db.js:166-167):**
```sql
INSERT INTO insumos (nombre, tipo, stock_hojas, stock_minimo, costo_por_hoja_usd)
VALUES ('Papel Carta', 'carta', 500, 50, 0.003),
       ('Papel Oficio', 'oficio', 200, 30, 0.004)
```

**Relaciones:**
- 1 insumo → N servicios (opcional, por `insumo_id`)
- 1 insumo → N líneas de venta (cuando servicio consume ese insumo)

**Handler:** insumos:list, insumos:create, insumos:update, insumos:delete, insumos:ajustar (insumos.js)

---

### Tabla `servicios`

Catálogo de servicios de copiado/impresión.

| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `nombre` | TEXT | NOT NULL UNIQUE | Ej: "Copia B/N Carta", "Impresión Color Oficio" |
| `precio_usd` | REAL | NOT NULL | Precio en USD (si moneda_precio='usd') |
| `precio_ves` | REAL | NOT NULL DEFAULT 0 | Precio en VES (si moneda_precio='ves') |
| `moneda_precio` | TEXT | DEFAULT 'usd' | 'usd' o 'ves' |
| `insumo_id` | INTEGER | REFERENCES insumos(id) ON DELETE SET NULL | Insumo que consume este servicio |
| `activo` | INTEGER | DEFAULT 1 | 1 = disponible en POS, 0 = oculto/inactivo |

**Semillas iniciales (db.js:173-183):**
8 servicios predefinidos (copia/impresión B/N y Color para carta y oficio) vinculados a los insumos seed.

**Lógica de doble cantidad:**
- En `detalle_venta`, `cantidad` = unidades cobradas (ej: 5 copias)
- En `detalle_venta`, `cantidad_hojas_gastadas` = hojas físicas consumidas (ej: 6 por 1 error)
- Servicio define `insumo_id` → al vender, se descuenta `cantidad_hojas_gastadas` del insumo

**Handler:** servicios:list, servicios:create, servicios:update, servicios:delete, servicios:search (servicios.js)

---

### Tabla `ventas`

Cabecera de cada transacción de venta.

| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Número de venta secuencial |
| `fecha` | TEXT | DEFAULT datetime('now','localtime') | Timestamp de la venta (formato 'YYYY-MM-DD HH:MM:SS') |
| `subtotal_usd` | REAL | NOT NULL | Suma de (precio_unit * cantidad) antes de descuento |
| `descuento_otorgado_usd` | REAL | NOT NULL DEFAULT 0 | Descuento aplicado en USD |
| `total_usd` | REAL | NOT NULL | subtotal - descuento |
| `tasa_cambio` | REAL | NOT NULL | Tasa BCV utilizada en esta venta (para histórico) |
| `estado` | TEXT | NOT NULL DEFAULT 'pagada' | 'pagada' o 'credito' |
| `cliente_nombre` | TEXT | DEFAULT '' | Nombre del cliente (obligatorio si crédito) |
| `saldo_pendiente_usd` | REAL | NOT NULL DEFAULT 0 | Para créditos: cuánto falta por pagar |
| `notas` | TEXT | DEFAULT '' | Observaciones internas |

**States:**
- `pagada`: todos los pagos cubren el total
- `credito`: hay saldo_pendiente_usd > 0

**Calculo de totales:**
```
total_usd = subtotal_usd - descuento_otorgado_usd
saldo_pendiente_usd = (credito) ? faltante : 0
```

**Relaciones:**
- 1 venta → N detalle_venta
- 1 venta → N pagos
- 1 venta → N abonos

**Handler:** ventas:create (transacción), ventas:list (con filtros), ventas:get (completo con detalles), ventas:ultimas, ventas:paginated (ventas.js)

---

### Tabla `detalle_venta`

Líneas de items de una venta (productos o servicios).

| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `venta_id` | INTEGER | NOT NULL REFERENCES ventas(id) ON DELETE CASCADE | Venta a la que pertenece |
| `tipo` | TEXT | NOT NULL | 'producto' o 'servicio' |
| `ref_id` | INTEGER | NOT NULL | ID del producto (si tipo='producto') o servicio (si tipo='servicio') |
| `nombre` | TEXT | NOT NULL | Copia del nombre al momento de la venta (para histórico) |
| `cantidad` | INTEGER | NOT NULL | Unidades vendidas (o copias cobradas) |
| `cantidad_hojas_gastadas` | INTEGER | DEFAULT 0 | Solo para servicios: hojas físicas consumidas |
| `precio_unitario_usd` | REAL | NOT NULL | Precio unitario al momento de la venta (USD) |
| `subtotal_usd` | REAL | NOT NULL | cantidad * precio_unitario_usd |

**Clave compuesta lógica:** (venta_id, tipo, ref_id) pero no hay constraint unique.

**Foreign keys:**
- `venta_id` → `ventas.id` (CASCADE: si se elimina venta, se eliminan detalles)
- `ref_id` **no** tiene FK directa (no hay tabla polymorphic en SQLite). Se relaciona con `productos.id` o `servicios.id` según `tipo`.

**Datos duplicados a propósito:**
- `nombre` se guarda aquí (no solo ref_id) para preservar el nombre aún si el producto se renombra después
- `precio_unitario_usd` se guarda aquí para histórico (no se modifica si el producto cambia de precio)

**Handler:** interno dentro de ventas:create; lecturas en ventas:get, reportes

---

### Tabla `pagos`

Pagos recibidos al momento de la venta (pueden ser múltiples por venta, mezclando métodos).

| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `venta_id` | INTEGER | NOT NULL REFERENCES ventas(id) ON DELETE CASCADE | |
| `metodo` | TEXT | NOT NULL | 'efectivo_usd', 'efectivo_ves', 'pago_movil', 'transferencia' |
| `monto_usd` | REAL | NOT NULL | Monto en USD (para métodos que son USD o convertidos) |
| `monto_ves` | REAL | DEFAULT 0 | Monto en VES (solo para métodos VES) |
| `fecha` | TEXT | DEFAULT datetime('now','localtime') | Cuando se registró el pago |

**Lógica de conversión:**
- `efectivo_usd`: `monto_usd` = valor, `monto_ves` = valor × tasa
- `efectivo_ves`, `pago_movil`, `transferencia`: `monto_ves` = valor, `monto_usd` = valor / tasa

**Sumatoria:**
```
SUM(pagos.monto_usd) sobre una venta = total pagado en USD equivalentes
```

---

### Tabla `abonos`

Pagos parciales realizados post-venta para saldar deudas de crédito.

| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `venta_id` | INTEGER | NOT NULL REFERENCES ventas(id) ON DELETE CASCADE | |
| `metodo` | TEXT | NOT NULL | Mismos 4 métodos que pagos |
| `monto_usd` | REAL | NOT NULL | Monto del abono en USD (convertido) |
| `monto_ves` | REAL | DEFAULT 0 | Monto en VES (si se pagó en efectivo local) |
| `fecha` | TEXT | DEFAULT datetime('now','localtime') | Fecha del abono |

**Diferencias vs pagos:**
- `pagos` se crean al mismo tiempo que la venta (transacción única)
- `abonos` se crean después, en transacciones separadas (cuentas:abonar)
- Ambos se suman para calcular "total pagado" de una venta

**Handler:** cuentas:abonar (cuentas.js:22)

---

### Tabla `mermas`

Registro de pérdidas, daños o robos de inventario.

| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `producto_id` | INTEGER | REFERENCES productos(id) ON DELETE SET NULL | Producto afectado (opcional) |
| `insumo_id` | INTEGER | REFERENCES insumos(id) ON DELETE SET NULL | Insumo afectado (opcional) |
| `cantidad` | INTEGER | NOT NULL | Unidades perdidas |
| `motivo` | TEXT | NOT NULL | 'daño', 'robo', 'uso_interno', 'vencimiento', 'otro' |
| `notas` | TEXT | DEFAULT '' | Detalle del incidente |
| `fecha` | TEXT | DEFAULT datetime('now','localtime') | |

**Constraints:**
- O `producto_id` o `insumo_id` debe estar presente (al menos uno), pero no hay CHECK constraint en SQLite (se valida en código)

**Efecto secundario:**
- Al crear merma, automáticamente reduce stock del producto/insumo correspondiente (UPDATE stock_actual -= cantidad o stock_hojas -= cantidad)

**Handler:** mermas:create (mermas.js) - transacción con rollback

---

### Tabla `cierres_dia`

Snapshot diario de operación. Un registro por fecha.

| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `fecha` | TEXT | NOT NULL UNIQUE | Fecha en formato 'YYYY-MM-DD' (sin hora) |
| `tasa_cierre` | REAL | NOT NULL | Tasa BCV que se usó para el cierre (puede diferir de tasa actual) |
| `total_ventas` | INTEGER | DEFAULT 0 | Conteo de ventas ese día |
| `ingresos_usd` | REAL | DEFAULT 0 | Suma de total_usd de todas las ventas |
| `ingresos_ves` | REAL | DEFAULT 0 | Suma de pagos en VES (directos o convertidos) |
| `descuentos_usd` | REAL | DEFAULT 0 | Suma de descuentos otorgados |
| `pendiente_cobrar_usd` | REAL | DEFAULT 0 | Suma de saldo_pendiente_usd de ventas en crédito |
| `ganancia_neta_usd` | REAL | DEFAULT 0 | Calculada: ganancia_bruta - descuentos |
| `pagos_json` | TEXT | DEFAULT '[]' | JSON array de pagos del día (para detalle) |
| `abonos_json` | TEXT | DEFAULT '[]' | JSON array de abonos del día |
| `ventas_json` | TEXT | DEFAULT '[]' | JSON array completo de ventas (con detalles y pagos) |
| `cerrado_en` | TEXT | DEFAULT datetime('now','localtime') | Timestamp del cierre |

**Unicidad:**
- `fecha` es UNIQUE → solo un registro por día

**Campos JSON:**
- Almacenan snapshots completos para reconstruir reportes históricos
- Contenido ejemplo de `ventas_json`:
  ```json
  [
    {
      "id": 123,
      "fecha": "2025-04-19 10:30:00",
      "total_usd": 25.50,
      "tasa_cambio": 36.5,
      "estado": "pagada",
      "detalles": [ ... ],
      "pagos": [ ... ]
    }
  ]
  ```

**Handler:** reportes:cerrar_dia (upsert), reportes:hoy (lectura), reportes:historial, reportes:cierre_detalle (reportes.js)

**Auto-cierre:**
- Función `autoClosePreviousDays()` en `reportes.js:95` → se ejecuta al iniciar la app en `main.js:64`
- Para cada fecha < hoy con ventas, hace `upsertCierre()` con tasa actual

---

## 🔧 Migraciones

Las migraciones están **incorporadas** en `db.js` (no hay archivos de migración separados).

### Migración 1: Añadir ganancia_neta_usd a cierres_dia

```sql
ALTER TABLE cierres_dia ADD COLUMN ganancia_neta_usd REAL DEFAULT 0
```

**Cuándo:** Durante initDb, después de crear tablas (db.js:189-192)
**Compatibilidad:** Si la columna ya existe, el ALTER TABLE falla → catch y se ignora silenciosamente.

---

### Migración 2: Añadir precios duales (VES) a productos

```sql
ALTER TABLE productos ADD COLUMN precio_compra_ves REAL NOT NULL DEFAULT 0
ALTER TABLE productos ADD COLUMN precio_venta_ves REAL NOT NULL DEFAULT 0
ALTER TABLE productos ADD COLUMN moneda_precio TEXT DEFAULT 'usd'
```

**Razón:** Inicialmente solo se manejaba USD. Se agregó VES para precios fijos en bolívares.
**Cuándo:** db.js:195-200

---

### Migración 3: Añadir precios duales a servicios

```sql
ALTER TABLE servicios ADD COLUMN precio_ves REAL NOT NULL DEFAULT 0
ALTER TABLE servicios ADD COLUMN moneda_precio TEXT DEFAULT 'usd'
```

**Cuándo:** db.js:203-207

---

### Migración 4: Deduplicar servicios

```sql
DELETE FROM servicios
WHERE id NOT IN (
  SELECT MAX(id) FROM servicios GROUP BY nombre
)
```

**Razón:** Seeds iniciales podrían ejecutarse múltiples veces → duplicados.
**Cuándo:** db.js:210-222 (dentro del try-catch)

---

### Migración 5: Deduplicar insumos

Igual que servicios pero para `insumos`.
**Cuándo:** db.js:225-237

---

## 🌱 Seeds Iniciales

El método `initDb()` inserta datos por defecto al primera ejecución:

1. **Configuración** (6 claves)
2. **Categorías** (6 categorías estándar)
3. **Insumos** (2: Papel Carta y Papel Oficio)
4. **Servicios** (8: 4 servicios × 2 tipos de papel)
   - Asociados a los insumos correspondientes

**Idempotencia:** Todos los INSERT usan `INSERT OR IGNORE` → seguros contra re-ejecución.

---

## 📈 Estadísticas de Tablas (Proyección)

| Tabla | Growth Rate (estimado) | 1 año | 3 años | 5 años |
|-------|------------------------|-------|--------|--------|
| configuracion | 0 | 6 | 6 | 6 |
| categorias | 0.5/mes | 6 | 18 | 30 |
| productos | 10/semana | 520 | 1,560 | 2,600 |
| insumos | 1/mes | 12 | 36 | 60 |
| servicios | 0.5/mes | 6 | 18 | 30 |
| ventas | 50/día hábil | 12,500 | 37,500 | 62,500 |
| detalle_venta | 4 × ventas | 50,000 | 150,000 | 250,000 |
| pagos | 1.2 × ventas | 15,000 | 45,000 | 75,000 |
| abonos | 0.3 × ventas | 3,750 | 11,250 | 18,750 |
| mermas | 2/semana | 104 | 312 | 520 |
| cierres_dia | 1/día | 365 | 1,095 | 1,825 |

*(Estimación conservadora asumiendo 5 días hábiles/semana)*

---

## 🚀 Optimizaciones Sugeridas (Futuro)

1. **Índices adicionales:**
   ```sql
   CREATE INDEX idx_ventas_fecha_estado ON ventas(fecha, estado)
   CREATE INDEX idx_detalle_venta_ref ON detalle_venta(tipo, ref_id)
   ```

2. **Vistas materializadas:** Para reportes frecuentes (dashboard metrics)

3. **Particionado por fecha:** Si `ventas` crece mucho (>1M), particionar por mes.

4. **Backup automático:** Copia `jauv_pos.db` a carpeta `backups/` diariamente.

---

## 🔍 Consultas Comunes

### Buscar producto por código
```sql
SELECT * FROM productos WHERE codigo = ?
-- Index: UNIQUE(codigo) → O(log n)
```

### Ventas del día actual
```sql
SELECT * FROM ventas
WHERE date(fecha) = date('now', 'localtime')
ORDER BY fecha DESC
-- Index: fecha (no hay explicit index pero SQLite usa rowid scan; para volumen alto, añadir idx)
```

### Stock bajo
```sql
SELECT * FROM productos
WHERE stock_actual <= stock_minimo
-- Full table scan (small table, OK)
```

### Resumen de ventas por día (última semana)
```sql
SELECT date(fecha) as fecha, COUNT(*) as ventas, SUM(total_usd) as ingresos
FROM ventas
WHERE fecha >= date('now', '-7 days', 'localtime')
GROUP BY date(fecha)
ORDER BY fecha DESC
```

---

*Documento mantenido como código - actualizar con cambios en esquema.*
