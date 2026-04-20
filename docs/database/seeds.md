# Semillas Iniciales (Seeds)

Este documento detalla los datos semilla que se cargan automáticamente la primera vez que se ejecuta la aplicación.

## 📦 Propósito de las Semillas

- **Configurar defaults** para que la app sea usable inmediatamente
- **Catálogos básicos** (categorías, insumos, servicios) predefinidos
- **Evitar errores** por falta de datos (ej: buscar insumo "Papel Carta" que no existe)
- **Idempotencia:** `INSERT OR IGNORE` asegura que no se dupliquen si `initDb()` se ejecuta múltiples veces

---

## 📋 Lista Completa de Semillas

### 1. Configuración (`configuracion`)

**Código:** `db.js:152-158`

```sql
INSERT OR IGNORE INTO configuracion (clave, valor) VALUES
  ('tasa_del_dia',        '40.00'),
  ('nombre_tienda',       'JAUV Studio'),
  ('telefono_tienda',     ''),
  ('direccion_tienda',    'Venezuela'),
  ('ticket_pie',          'Gracias por su compra!'),
  ('impresora_ancho',     '80')
```

**Significado:**

| Clave | Valor default | Descripción | ¿Editable? |
|-------|---------------|-------------|-------------|
| `tasa_del_dia` | `40.00` | Tasa de cambio BCV (Bs/USD). Se actualiza diariamente desde UI. | ✅ Sí (barra lateral) |
| `nombre_tienda` | `JAUV Studio` | Nombre que aparece en el ticket. | ✅ Sí (config futuro) |
| `telefono_tienda` | `` (vacío) | Teléfono en pie de ticket. | ✅ Sí |
| `direccion_tienda` | `Venezuela` | Dirección en pie de ticket. | ✅ Sí |
| `ticket_pie` | `Gracias por su compra!` | Mensaje final del ticket. | ✅ Sí |
| `impresora_ancho` | `80` | Ancho de papel: `'58'` o `'80'`. Afecta CSS del ticket. | ✅ Sí (config futuro) |

---

### 2. Categorías (`categorias`)

**Código:** `db.js:161-163`

```sql
INSERT OR IGNORE INTO categorias (nombre) VALUES
  ('Cuadernos'),
  ('Lapiceros'),
  ('Carpetas'),
  ('Papel'),
  ('Tintas'),
  ('Otros')
```

**Lista:**

| ID (auto) | Nombre | Notas |
|-----------|--------|-------|
| 1 | Cuadernos | Cuadernos universitarios, escolares |
| 2 | Lapiceros | Bolígrafos, marcadores, lápices |
| 3 | Carpetas | Archivadores, folders |
| 4 | Papel | Hojas, block, papel Bond |
| 5 | Tintas | Toner, tinta para impresora |
| 6 | Otros | Artículos varios sin categoría específica |

**Uso:** Categorización de productos en Inventario → ayuda a filtrar y organizar.

---

### 3. Insumos (`insumos`)

**Código:** `db.js:166-167`

```sql
INSERT OR IGNORE INTO insumos (
  nombre, tipo, stock_hojas, stock_minimo, costo_por_hoja_usd
) VALUES
  ('Papel Carta',  'carta',  500, 50,  0.003),
  ('Papel Oficio', 'oficio', 200, 30,  0.004)
```

**Tabla detallada:**

| nombre | tipo | stock_hojas | stock_minimo | costo_por_hoja_usd | Descripción |
|--------|------|-------------|--------------|-------------------|-------------|
| Papel Carta | carta | 500 | 50 | $0.003 | Hoja tamaño carta (8.5" x 11") |
| Papel Oficio | oficio | 200 | 30 | $0.004 | Hoja tamaño oficio (8.5" x 13") |

**¿Qué son "tipo" y "stock_hojas"?**

- `tipo`: formato del papel. Determina qué servicios usan qué insumo (asociación en `servicios`).
- `stock_hojas`: número de hojas físicas disponibles.
- `stock_minimo`: si `stock_hojas ≤ stock_minimo`, se muestra alerta roja.
- `costo_por_hoja_usd`: multiplicado por la cantidad gastada → **costo del servicio** (para calcular ganancia).

**Ejemplo:**
- 100 copias B/N carta consumen 100 hojas (o 102 si hay 2 errores).
- Costo del material = 100 × 0.003 = $0.30
- Si el servicio se vende a $0.05/copia → ingreso = $5.00
- Ganancia bruta = $5.00 - $0.30 = $4.70 (sin contar otros costos)

---

### 4. Servicios (`servicios`)

**Código:** `db.js:170-183`

Se crean **8 servicios** vinculados a los 2 insumos anteriores:

```javascript
// Se obtienen IDs de los insumos semilla primero
const insumoCarta = await db.get('SELECT id FROM insumos WHERE nombre = ?', ['Papel Carta'])
const insumoOficio = await db.get('SELECT id FROM insumos WHERE nombre = ?', ['Papel Oficio'])

if (insumoCarta && insumoOficio) {
  const insert = 'INSERT OR IGNORE INTO servicios (nombre, precio_usd, insumo_id) VALUES (?, ?, ?)'

  // Servicios para Papel Carta
  await db.run(insert, ['Copia B/N Carta',      0.05,  insumoCarta.id])
  await db.run(insert, ['Copia Color Carta',    0.15,  insumoCarta.id])
  await db.run(insert, ['Impresión B/N Carta',  0.05,  insumoCarta.id])
  await db.run(insert, ['Impresión Color Carta',0.20,  insumoCarta.id])

  // Servicios para Papel Oficio
  await db.run(insert, ['Copia B/N Oficio',     0.07,  insumoOficio.id])
  await db.run(insert, ['Copia Color Oficio',   0.18,  insumoOficio.id])
  await db.run(insert, ['Impresión B/N Oficio', 0.07,  insumoOficio.id])
  await db.run(insert, ['Impresión Color Oficio',0.25, insumoOficio.id])
}
```

#### Tabla de Servicios Semilla

| ID (auto) | nombre | precio_usd | insumo_id | insumo_nombre | Explicación |
|-----------|--------|------------|-----------|---------------|-------------|
| 1 | Copia B/N Carta | $0.05 | 1 | Papel Carta | Copia monocroma en tamaño carta |
| 2 | Copia Color Carta | $0.15 | 1 | Papel Carta | Copia a color en tamaño carta |
| 3 | Impresión B/N Carta | $0.05 | 1 | Papel Carta | Impresión desde digital (mismo precio que copia) |
| 4 | Impresión Color Carta | $0.20 | 1 | Papel Carta | Impresión color desde archivo |
| 5 | Copia B/N Oficio | $0.07 | 2 | Papel Oficio | Copio en oficio |
| 6 | Copia Color Oficio | $0.18 | 2 | Papel Oficio | Copia color oficio |
| 7 | Impresión B/N Oficio | $0.07 | 2 | Papel Oficio | Impresión B/N oficio |
| 8 | Impresión Color Oficio | $0.25 | 2 | Papel Oficio | Impresión color oficio |

**Notas:**
- `insumo_id` vincula al servicio con el insumo que consume (así al vender, se descuenta stock del papel correcto)
- `precio_usd` es en USD; al insertar no se calcula VES (se deriva en frontend o al cambiar tasa)
- `moneda_precio` default = 'usd' (no se especifica en seed, usa DEFAULT)
- `activo` default = 1 (todos activos)

---

## 🛠️ Extender las Semillas

### Añadir una Nueva Categoría

**Directamente en db.js:**
```javascript
// Dentro del BEGIN TRANSACTION de initDb, después del INSERT categorías:
await db.run('INSERT OR IGNORE INTO categorias (nombre) VALUES (?)', ['Papelería'])
```

**O desde la UI:**
- Ir a Inventario → botón "Categorías" → "Nueva categoría"
- Esto ejecuta `categorias:create` handler → INSERT en DB

---

### Añadir un Nuevo Insumo

**Ejemplo:** Añadir "Tinta Negra Canon"

```sql
INSERT INTO insumos (nombre, tipo, stock_hojas, stock_minimo, costo_por_hoja_usd)
VALUES ('Tinta Negra Canon', 'tinta', 10, 2, 5.00)
```

**Nota:** `stock_hojas` para tinta es # de cartuchos (seguimos la misma unidad "hojas" por simplicidad).

---

### Añadir un Nuevo Servicio

**Ejemplo:** "Fotocopia Dúplex" (doble cara) que usa Papel Carta.

```javascript
// Necesitas el ID del insumo Papel Carta
const carta = await db.get('SELECT id FROM insumos WHERE nombre = ?', ['Papel Carta'])
if (carta) {
  await db.run(
    'INSERT INTO servicios (nombre, precio_usd, insumo_id) VALUES (?, ?, ?)',
    ['Fotocopia Dúplex Carta', 0.08, carta.id]
  )
}
```

**Consideración:**
- `cantidad_hojas_gastadas` en detalle_venta permite que este servicio consuma 2 hojas por copia (una por cara) → el operador ingresaría cantidad=10 copias, hojas_gastadas=20.

---

## 🧹 Limpiar Semillas Problemáticas

Si una semilla tiene valores incorrectos (ej: `tasa_del_dia` mal configurada), se puede actualizar directamente:

```sql
UPDATE configuracion SET valor = '36.50' WHERE clave = 'tasa_del_dia'
```

O eliminar y dejar que `initDb()` la re-inserte (pero hay que cerrar la app y borrar el archivo DB completo → no recomendado).

---

## 📦 Seeds vs. Datos de Producción

**Producción (tienda real):**
- Las semillas solo corren la **primera vez** (gracias a `INSERT OR IGNORE`)
- Después, los usuarios añaden sus propios productos, categorías, insumos
- Las semillas iniciales actúan como "plantilla" pero se pueden borrar/editar

**Desarrollo:**
- Al borrar `jauv_pos.db` y relanzar → vuelven a crearse las semillas
- Útil para testing de funcionalidad nueva con datos limpios

---

## 🔄 Relación Seeds-Handlers

Los handlers **no dependen** de que existan las semillas (excepto servicios que asumen insumos existen). Pero:

- `servicios:list` devuelve servicios sin insumo → `insumo_nombre` será NULL
- `productos:create` no requiere categoría (puede ser NULL)

Por lo tanto, las semillas son **opcionalmente convenientes**, no obligatorias para la funcionalidad.

---

## 📝 Ejemplo: Semilla de un Servicio Completo

```javascript
const insertServicio = `
  INSERT OR IGNORE INTO servicios (
    nombre, precio_usd, precio_ves, moneda_precio, insumo_id, activo
  ) VALUES (?, ?, ?, ?, ?, ?)
`

// Insertar servicio en VES (precio fijo en bolívares)
await db.run(insertServicio, [
  'Copia B/N Carta (VES fixed)', // nombre
  0,                             // precio_usd (0 porque usamos VES)
  1000,                          // precio_ves = Bs. 1000 fijos
  'ves',                         // moneda_precio
  insumoCarta.id,                // insumo_id
  1                             // activo
])
```

**Nota:** En la seed actual, solo se inserta `precio_usd` y se usa DEFAULT para `precio_ves=0` y `moneda_precio='usd'`. El frontend calcula VES en runtime.

---

## 🧪 Verificar Seeds

Para comprobar que las semillas se cargaron correctamente:

```bash
# Abrir DB con sqlite3 CLI (instalar sqlite3)
sqlite3 jauv_pos.db

# Dentro de sqlite>
sqlite> SELECT * FROM configuracion;
sqlite> SELECT * FROM categorias;
sqlite> SELECT * FROM insumos;
sqlite> SELECT * FROM servicios;

# Salir
sqlite> .exit
```

O desde la app, abrir consola del navegador (DevTools) y ejecutar:
```javascript
window.api.invoke('config:getAll').then(console.log)
window.api.invoke('categorias:list').then(console.log)
```

---

*Documento mantenido como código - actualizar si cambian las semillas.*
