# Pruebas (Testing)

> **Nota:** El proyecto actualmente **no tiene suite de tests automatizados**. Todo el testing es manual. Esta guía sugiere estrategias para añadir tests en el futuro.

---

## 🧪 Estado Actual

| Tipo de Test | Cobertura | Herramienta Sugerida |
|--------------|-----------|---------------------|
| Unit tests | 0% | Jest / Vitest |
| Integration tests | 0% | Jest + sqlite in-memory |
| E2E tests | 0% | Playwright / Cypress |
| Manual QA | 100% (humano) | Checklist |

---

## 📋 Estrategia de Testing Recomendada

### 1. Unit Tests (Handlers y Utilidades)

**Objetivo:** Probar lógica de negocio aislada (sin UI).

**Candidatos:**
- Funciones puras en handlers: `generateCode()`, `ensureUniqueCode()`, `todayStr()`
- Helpers: `buildDayData()`, `upsertCierre()`
- Utilidades de formateo en `AppContext`: `fmt()`, `toVes()`, `toUsd()`

**Ejemplo (Jest):**

```javascript
// tests/utils.test.js
describe('fmt() formatter', () => {
  test('formatea USD correctamente', () => {
    expect(fmt(10.5)).toBe('$10.50')
    expect(fmt(0)).toBe('$0.00')
  })

  test('formatea VES usando tasa', () => {
    const tasa = 40
    expect(fmt(10.5, 'VES')).toBe('Bs. 420.00')
  })
})
```

---

### 2. Integration Tests (Handlers + SQLite)

**Objetivo:** Probar que los handlers IPC interactúan correctamente con la base de datos.

**Enfoque:**
- Crear DB en memoria (`:memory:`)
- Ejecutar `initDb()` sobre ella
- Invocar handler directamente (sin IPC)
- Verificar resultados y efectos secundarios

**Ejemplo:**

```javascript
describe('ventas:create handler', () => {
  let db, handler

  beforeEach(async () => {
    // Setup DB en memoria
    const database = await open({ filename: ':memory:', driver: sqlite3.Database })
    db = database
    // Ejecutar schema
    await db.exec(readFileSync('./electron/database/db.js').toString().split('await db.exec(`')[1]) // complicado, mejor importar initDb
  })

  test('crea venta completa y descuenta stock', async () => {
    // Arrange: crear producto con stock 10
    const prod = await db.run('INSERT INTO productos ... RETURNING id')

    // Act: llamar handler ventas:create
    const result = await handler(null, {
      cabecera: { ... },
      detalles: [{ tipo:'producto', ref_id: prod.id, cantidad:2, ... }],
      pagos: [...]
    })

    // Assert
    expect(result.id).toBeDefined()
    const updated = await db.get('SELECT stock_actual FROM productos WHERE id = ?', [prod.id])
    expect(updated.stock_actual).toBe(8) // 10 - 2
  })
})
```

---

### 3. API HTTP Tests

**Objetivo:** Verificar que `/api/invoke` retorna correctamente.

**Herramienta:** Supertest (para Express) o simple `fetch` en Jest.

```javascript
// En archivo separado, importar express app de api-server.js
// (necesita refactor para exportar app)
```

---

### 4. E2E (End-to-End) UI Tests

**Objetivo:** Simular usuario interactuando con la app completa.

**Escenarios:**

1. **Venta completa:**
   - Buscar producto
   - Agregar al carrito
   - Aplicar 10% descuento
   - Pagar con efectivo USD
   - Imprimir ticket
   - Verificar stock actualizado
   - Verificar venta en reportes

2. **Gestión inventario:**
   - Crear producto nuevo
   - Editar precio
   - Registrar merma
   - Verificar alerta stock bajo

3. **Crédito y abono:**
   - Crear venta a crédito
   - Verificar aparece en Cuentas por Cobrar
   - Registrar abono parcial
   - Verificar saldo actualizado
   - Abonar completo → verificar estado cambia a 'pagada'

**Herramienta:** Playwright (recomendado para Electron).

```javascript
// tests/e2e/pos.spec.js
import { test, expect } from '@playwright/test'

test('complete sale flow', async ({ page }) => {
  await page.goto('http://localhost:5173')  // en dev
  // ... pasos
})
```

---

## 🛠️ Configurando Jest (Unit + Integration)

### Instalar

```bash
npm install --save-dev jest supertest sqlite3 better-sqlite3
npm install --save-dev @jest/globals  // para ES modules
```

**Configurar `jest.config.js`:**

```javascript
module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'jsx'],
  testMatch: ['**/tests/**/*.test.js'],
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
}
```

**Babel config (para JSX):** `babel.config.js`
```javascript
module.exports = {
  presets: ['@babel/preset-env', '@babel/preset-react']
}
```

---

## 📁 Estructura de Tests

```
project/
├── tests/
│   ├── unit/
│   │   ├── utils.test.js
│   │   └── formatters.test.js
│   ├── integration/
│   │   ├── handlers/
│   │   │   ├── productos.test.js
│   │   │   ├── ventas.test.js
│   │   │   └── cuentas.test.js
│   │   └── database/
│   │       └── migrations.test.js
│   ├── api/
│   │   └── http-api.test.js
│   ├── e2e/
│   │   ├── pos-flow.spec.js
│   │   └── login.spec.js
│   └── setup.js           # limpieza de DB antes de cada test
```

---

## 🧪 Manual Testing Checklist

Aunque no haya tests automáticos, usar este checklist para releases:

### POS Flow

- [ ] Búsqueda de producto Devuelve resultados
- [ ] Agregar producto al carrito incrementa cantidad
- [ ] Límite de stock respetado (no permite más de stock_actual)
- [ ] Descuento en USD se calcula correctamente
- [ ] Descuento en % no supera subtotal
- [ ] Descuento en VES se aplica (conversión correcta)
- [ ] Pago mixto (USD + VES) suma correctamente
- [ ] Vuelto se calcula si pago > total
- [ ] Venta a crédito requiere nombre de cliente
- [ ] Venta a crédito crea estado 'credito' y saldo_pendiente_usd > 0
- [ ] Confirmar venta crea registros en: ventas, detalle_venta, pagos
- [ ] Stock de productos se descuenta
- [ ] Para servicios: stock de insumo se descuenta según cantidad_hojas_gastadas

### Inventario

- [ ] Crear producto con código autogenerado → PAP-XXXXXX único
- [ ] Editar producto actualiza correctamente
- [ ] Eliminar producto → no aparece en búsqueda
- [ ] Filtro por categoría funciona
- [ ] Filtro "bajo stock" muestra correctos items
- [ ] Registrar merma → stock_actual disminuye
- [ ] Barcode display se renderiza (JsBarcode)

### Centro Copiado

- [ ] Crear insumo → aparece en lista
- [ ] Ajustar stock (sumar/restar) → se actualiza
- [ ] Crear servicio → aparece en POS búsqueda (si activo)
- [ ] Editar servicio → cambios reflejados
- [ ] Eliminar servicio → no disponible para nueva ventas

### Cuentas por Cobrar

- [ ] Venta a crédito aparece en Cuentas
- [ ] Abono parcial → saldo se reduce
- [ ] Abono total → estado cambia a 'pagada', desaparece de lista (o se filtra)
- [ ] Modificar deuda manual → saldo y tasa_cambio actualizados
- [ ] Detalle de venta muestra precios históricos correctos
- [ ] Advertencia de aumento de precio funciona

### Reportes

- [ ] Reporte del día coincide con ventas de hoy
- [ ] Ganancia neta calculada correctamente (venta.unit_price - compra.unit_price)
- [ ] Cerrar día → aparece en Historial
- [ ] Re-abrir y añadir venta tardía → Actualizar Cierre la incluye
- [ ] Reporte inventario: estadísticas coinciden con DB
- [ ] Todas las ventas paginadas funcionan
- [ ] Filtros por fecha funcionan

### Dashboard

- [ ] Gráfico de tendencia muestra 7 días (con ceros donde no hay ventas)
- [ ] Top productos coincide con query de últimos 30 días
- [ ] Top deudores muestra créditos activos
- [ ] Stat cards tienen valores correctos

### Impresión

- [ ] Ticket se abre en ventana nueva
- [ ] Formato en 58mm legible
- [ ] Formato en 80mm legible
- [ ] Contenido incluye: tienda, fecha, nº venta, items, total, pagos, tasa
- [ ] Botón imprimir dispara diálogo del sistema

### Escáner

- [ ] Cámara detectada
- [ ] Escaneo de código → se agrega item
- [ ] Código no encontrado → alerta
- [ ] Cambiar cámara funciona (si hay múltiples)

---

## 🔄 Continuous Integration (Futuro)

**Objetivo:** Ejecutar tests automáticamente en cada PR.

**.github/workflows/ci.yml:**

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npx electron-rebuild -f -w better-sqlite3
      - run: npm test  # correr Jest
```

---

## 📊 Code Coverage (Futuro)

```bash
npm run test -- --coverage
```

**Meta:** 80% coverage en handlers + utils.

---

## 🐛 Bug Reporting

Si encuentras bug durante testing manual:

1. **Repasar pasos exactos** que lo causaron
2. **Capturar consola log** (F12 → Console → copy)
3. **Anotar versión** (2.5.0)
4. **Crear Issue** en GitHub con:
   - Título: "[BUG] descripción corta"
   - Pasos para reproducir
   - Comportamiento esperado
   - Comportamiento actual
   - Screenshots si es UI
   - Logs relevantes

---

## 🚀 Próximos Pasos para Testing

1. **Semana 1:** Configurar Jest + primer test unitario (fmt)
2. **Semana 2:** Tests de integración para 2 handlers
3. **Semana 3:** CI pipeline básico (ejecutar tests en push)
4. **Semana 4:** E2E con Playwright (flujo POS completo)

---

*Documento mantenido como código - actualizar conforme se añaden tests.*
