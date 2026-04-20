# Migraciones y Seeds

## 📦 Migraciones

### Estrategia de Migraciones

El proyecto utiliza **migraciones embebidas** dentro de `electron/database/db.js`. No hay carpeta `migrations/` con archivos separados. Todas las migraciones se ejecutan en orden durante `initDb()` después de crear las tablas base.

**Ventajas:**
- Todo en un solo lugar (fácil de entender)
- No se necesita framework de migraciones (knex, sequelize)
- Las migraciones son idempotentes (try-catch ignora errores de columna existente)

**Desventajas:**
- Historial no versionado en archivos separados
- Difícil revertir migraciones
- Mezcla de esquema + data seeding

---

## 🔄 Historia de Migraciones

### Migración 0 - Esquema Inicial (db.js:32-146)

**Fecha:** v1.0.0 (desarrollo inicial)
**Crea:** 11 tablas completas desde cero

```sql
-- Secuencia de CREATE TABLE IF NOT EXISTS:
1. configuracion
2. categorias
3. productos
4. insumos
5. servicios
6. ventas
7. detalle_venta
8. pagos
9. abonos
10. mermas
11. cierres_dia
```

**Detalles:**
- Todas las tablas con restricciones NOT NULL, DEFAULT, FOREIGN KEYS
- `detalle_venta`: referencia a ventas con ON DELETE CASCADE
- `ventas`: `created_at` → `fecha` (TEXT con DEFAULT)
- `cierres_dia`: campos JSON para snapshots

---

### Migración 1 - Añadir `ganancia_neta_usd` a `cierres_dia`

**Fecha:** v2.1.0 (añadida métrica de ganancia)

```sql
ALTER TABLE cierres_dia ADD COLUMN ganancia_neta_usd REAL DEFAULT 0
```

**Motivo:** Antes solo se tenía `ingresos_usd` y `descuentos_usd`. Se necesitaba mostrar ganancia neta (ingresos - costo - descuentos) en reportes.

**Implementación:**
```javascript
// db.js:188-192
try {
  await db.run('ALTER TABLE cierres_dia ADD COLUMN ganancia_neta_usd REAL DEFAULT 0')
  console.log('[DB] Migration: added ganancia_neta_usd to cierres_dia')
} catch (_) { /* column already exists */ }
```

**Idempotencia:** ✅ Si ya existe, el ALTER TABLE falla → catch y se ignora.

**Impacto:** Solo añade columna, no afecta datos existentes (valores DEFAULT 0).

---

### Migración 2 - Añadir precios duales (VES) a `productos`

**Fecha:** v2.3.0 (soporte bimoneda)

```sql
ALTER TABLE productos ADD COLUMN precio_compra_ves REAL NOT NULL DEFAULT 0
ALTER TABLE productos ADD COLUMN precio_venta_ves REAL NOT NULL DEFAULT 0
ALTER TABLE productos ADD COLUMN moneda_precio TEXT DEFAULT 'usd'
```

**Motivo:** Inicialmente productos solo tenían precios en USD. Se necesitó soportar precios fijos en bolívares (VES) debido a la hiperinflación.

**Implementación:** db.js:195-200

**Lógica posterior:**
- Frontend calcula el precio en la otra moneda según `moneda_precio` y `tasa`
- Si `moneda_precio='usd'`, el precio en VES es dinámico (cambia con la tasa)
- Si `moneda_precio='ves'`, el precio en USD es derivado (VES/tasa)

---

### Migración 3 - Añadir precios duales (VES) a `servicios`

**Fecha:** v2.3.0 (paralelo a productos)

```sql
ALTER TABLE servicios ADD COLUMN precio_ves REAL NOT NULL DEFAULT 0
ALTER TABLE servicios ADD COLUMN moneda_precio TEXT DEFAULT 'usd'
```

**Nota:** `servicios` originalmente tenía solo `precio_usd`. Se añade `precio_ves` y `moneda_precio` para consistencia con productos.

---

### Migración 4 - Deduplicación de `servicios`

**Fecha:** v2.4.0 ( fixing seed duplicates )

```sql
DELETE FROM servicios
WHERE id NOT IN (
  SELECT MAX(id) FROM servicios GROUP BY nombre
)
```

**Problema:** Cada vez que se ejecutaba `initDb()`, los seeds `INSERT OR IGNORE` no borraban duplicados previos (si el usuario borraba y volvía a insertar manualmente). Con el tiempo podía haber múltiples servicios con el mismo nombre pero IDs diferentes.

**Solución:** Al iniciar, dejar solo la fila con `MAX(id)` por nombre (la más reciente).

**Implementación:** db.js:210-222 (dentro de try-catch, se loguea cuántas filas se eliminaron).

---

### Migración 5 - Deduplicación de `insumos`

**Igual que Migración 4** pero para tabla `insumos` (db.js:225-237).

---

## 🌱 Seeding (Semillas Iniciales)

Las semillas se ejecutan **después** de crear las tablas y **dentro de la misma transacción** que la creación de tablas (db.js:150-185).

### Flujo de Inicialización

```javascript
await initDb() {
  await db.exec('BEGIN TRANSACTION;') // ← Inicia tx

  // 1. CREATE TABLES (ejecutado antes de seeds, db.exec)
  // (tablas ya creadas)

  // 2. SEED CONFIG
  await db.run(insertConfig, ['clave', 'valor']) // INSERT OR IGNORE

  // 3. SEED CATEGORIAS
  for c in ['Cuadernos', ...]: await db.run(insertCat, [c])

  // 4. SEED INSUMOS
  await db.run(insertInsumo, ['Papel Carta', 'carta', 500, 50, 0.003])
  await db.run(insertInsumo, ['Papel Oficio', 'oficio', 200, 30, 0.004])

  // 5. Obtener IDs de insumos recién creados
  const insumoCarta = await db.get('SELECT id FROM insumos WHERE nombre = ?', ['Papel Carta'])
  const insumoOficio = await db.get('SELECT id FROM insumos WHERE nombre = ?', ['Papel Oficio'])

  // 6. SEED SERVICIOS (8 servicios, vinculados a insumos)
  if (insumoCarta && insumoOficio) {
    await db.run(insertServicio, ['Copia B/N Carta', 0.05, insumoCarta.id])
    // ... 7 más
  }

  await db.exec('COMMIT;') // ← Confirma todo
}
```

### Detalle de Seeds

#### Configuración (6 filas)

| clave | valor | Uso |
|-------|-------|-----|
| `tasa_del_dia` | `40.00` | Tasa BCV predeterminada |
| `nombre_tienda` | `JAUV Studio` | Header de ticket |
| `telefono_tienda` | `` | Pie de ticket (vacío) |
| `direccion_tienda` | `Venezuela` | Pie de ticket |
| `ticket_pie` | `Gracias por su compra!` | Mensaje final ticket |
| `impresora_ancho` | `80` | Ancho de ticket en mm ('58' o '80') |

#### Categorías (6 filas)

| nombre |
|--------|
| Cuadernos |
| Lapiceros |
| Carpetas |
| Papel |
| Tintas |
| Otros |

#### Insumos (2 filas)

| nombre | tipo | stock_hojas | stock_minimo | costo_por_hoja_usd |
|--------|------|-------------|--------------|--------------------|
| Papel Carta | carta | 500 | 50 | 0.003 |
| Papel Oficio | oficio | 200 | 30 | 0.004 |

#### Servicios (8 filas)

Vinculados a los 2 insumos anteriores:

| nombre | precio_usd | insumo_nombre |
|--------|------------|---------------|
| Copia B/N Carta | 0.05 | Papel Carta |
| Copia Color Carta | 0.15 | Papel Carta |
| Impresión B/N Carta | 0.05 | Papel Carta |
| Impresión Color Carta | 0.20 | Papel Carta |
| Copia B/N Oficio | 0.07 | Papel Oficio |
| Copia Color Oficio | 0.18 | Papel Oficio |
| Impresión B/N Oficio | 0.07 | Papel Oficio |
| Impresión Color Oficio | 0.25 | Papel Oficio |

**Lógica de doble cantidad:**
- Para `Copia B/N Carta`: se cobran X copias a $0.05 cada una, pero se consumen (X + errores) hojas de Papel Carta

---

## 🧪 Reseteo de Base de Datos

Para **borrar y reinicializar** la DB (útil en desarrollo):

### Opción A - Borrar archivo físico
```bash
# Cerrar la app primero
# Windows:
del "%APPDATA%\jauv-studio-pos\jauv_pos.db"

# Linux:
rm ~/.config/jauv-studio-pos/jauv_pos.db

# Luego relanzar app → initDb() se ejecuta desde cero
```

### Opción B - Botón de reset (no implementado)

Se podría añadir en Admin settings:
```javascript
await window.api.invoke('config:reset-db') // NO EXISTE
```

---

## 📊 Versionado de Base de Datos

**No hay versionado formal**, pero se puede inferir:

| Versión App | Migraciones aplicadas |
|-------------|----------------------|
| 2.4.0 | Migraciones 1-5 (todo) |
| 2.3.0 | Migraciones 1-3 |
| 2.2.0 | Migraciones 1-2 |
| 2.1.0 | Migración 1 |
| 2.0.0 | Solo esquema inicial |

**Para detectar versión DB:**
```sql
-- Buscar columnas que existan en versiones recientes:
PRAGMA table_info(cierres_dia); -- ver si tiene ganancia_neta_usd
PRAGMA table_info(productos); -- ver si tiene precio_compra_ves, precio_venta_ves, moneda_precio
```

---

## ⚠️ Datos Sensibles

**La DB contiene:**
- Nombres de clientes (opcional, pero puede haber datos personales)
- Historial de ventas (fechas, montos, métodos de pago)

**NO contiene:**
- Datos bancarios (solo referencias a "pago móvil", "transferencia", pero no números de cuenta)
- Contraseñas (no hay auth)
- Información crítica (solo datos de negocio)

**Backup considerations:**
- La DB debe tratarse como confidencial
- No subir a repositorios públicos (`.gitignore` ya lo excluye)

---

## 🔧 Mantenimiento Manual

### Compactar DB (VACUUM)

Con el tiempo, SQLite puede fragmentarse. Para compactar:

```javascript
// En consola de desarrollador o script temporal:
await window.api.invoke('db:vacuum') // NO IMPLEMENTADO
// O manual:
const db = require('better-sqlite3')('path/to/jauv_pos.db')
db.exec('VACUUM')
```

**Frecuencia recomendada:** Cada 6 meses o cuando la DB crezca > 200 MB.

### Analizar Query Performance

```sql
EXPLAIN QUERY PLAN
SELECT * FROM ventas WHERE date(fecha) = '2025-04-19'
```

Si hay full table scan en `ventas` (creciendo), añadir índice:

```sql
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(date(fecha))
```

---

*Documento mantenido como código - actualizar con nuevas migraciones.*
