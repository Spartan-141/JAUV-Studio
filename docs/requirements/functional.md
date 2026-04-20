# Requisitos Funcionales

Este documento detalla todas las funcionalidades que debe proporcionar el sistema JAUV Studio POS.

## RF-01: Gestión de Tasa de Cambio

**Descripción:** El sistema debe permitir a los usuarios consultar y modificar la tasa de cambio Bolívar/Dólar (BCV) en tiempo real.

**Criticidad:** Alta - Afecta todos los cálculos de conversión monetaria.

**Detalles:**
- Visualización de la tasa del día en la barra lateral (desktop) y barra inferior (mobile)
- Edición inline de la tasa con validación numérica
- Persistencia en la tabla `configuracion` con clave `tasa_del_dia`
- Conversión automática en todas las vistas (precios, totales, descuentos)
- Precisión de 2 decimales

**Implementación:**
- Frontend: `src/context/AppContext.jsx:48` (updateTasa)
- Backend: `electron/database/handlers/config.js:15` (config:set)
- UI: `src/App.jsx:24-58` (ExchangeRateBar)

---

## RF-02: Punto de Venta (POS)

**Descripción:** Módulo principal para procesar ventas de productos y servicios con múltiples métodos de pago.

**Criticidad:** Alta - Funcionalidad central.

**Detalles:**
- Búsqueda en tiempo real de productos y servicios por nombre o código
- Escaneo de códigos de barras con cámara (DroidCam/Webcam)
- Carrito de compras con modificación de cantidades y eliminación
- Cálculo automático de descuentos (monto fijo USD, monto fijo VES, porcentual)
- Aplicación de descuentos con validación (no exceder subtotal)
- Registro de cliente opcional para ventas normales; obligatorio para créditos
- Procesamiento de pagos mixtos: se pueden combinar múltiples métodos en una transacción
- Cálculo automático de vuelto si el pago excede el total
- Determinación automática de venta a crédito si falta por pagar
- Stock deduction automático al confirmar venta
- Generación de número de venta secuencial (autoincremental)

**Métodos de Pago Soportados:**
1. Efectivo USD
2. Efectivo VES
3. Pago Móvil (VES)
4. Transferencia (VES)

**Implementación:**
- Frontend principal: `src/pages/POS.jsx`
- Backend transaccional: `electron/database/handlers/ventas.js:6` (ventas:create)
- Imresión de ticket: `src/pages/POS.jsx:16` (printTicket)

---

## RF-03: Centro de Copiado

**Descripción:** Módulo para gestionar servicios de impresión/copiado con lógica especial de consumo de insumos.

**Criticidad:** Alta - Servicio core del negocio.

**Detalles:**
- Doble cantidad: "Cantidad a cobrar" vs "Cantidad de hojas gastadas"
  - Ejemplo: Se cobran 5 copias pero se gastan 6 hojas (1 error de impresión)
- Los servicios consumen insumos (papel) que se descuentan del inventario
- Precios en USD o VES por servicio
- Cada servicio se asocia a un tipo de insumo (carta, oficio, etc.)
- Control de stock de insumos con alertas de bajo stock

**Implementación:**
- Frontend: `src/pages/CentroCopiado.jsx`
- Backend: `electron/database/handlers/ventas.js:34-39` (lógica de descuento de insumos)
- Modelo: `electron/database/handlers/servicios.js`

---

## RF-04: Gestión de Inventario

**Descripción:** Módulo para administrar productos, categorías, y movimientos de stock.

**Criticidad:** Alta - Control de activos.

**Detalles:**
- CRUD completo de productos con:
  - Código de barras autogenerado (formato PAP-XXXXXX) o manual
  - Precios de compra y venta en dual moneda (USD + VES)
  - Indicador de moneda base del producto (USD o VES fijo)
  - Stock actual y stock mínimo
  - Categorización
  - Visualización de código de barras (JsBarcode)
- Búsqueda y filtrado por categoría y stock bajo
- Alertas visuales cuando `stock_actual <= stock_minimo`
- Categorías con asignación masiva de productos
- Mermas: registro de pérdidas/daños con:
  - Motivo (daño, robo, uso_interno, vencimiento, otro)
  - Descuento automático de stock
  - Trazabilidad con fecha
- Ajuste manual de stock de insumos (sumar/restar)

**Implementación:**
- Frontend productos: `src/pages/Inventario.jsx`
- Frontend categorías: integrado en Inventario (CategoryManagerModal)
- Backend productos: `electron/database/handlers/productos.js`
- Backend insumos: `electron/database/handlers/insumos.js`
- Backend mermas: `electron/database/handlers/mermas.js`
- Backend categorías: `electron/database/handlers/categorias.js`

---

## RF-05: Cuentas por Cobrar

**Descripción:** Módulo para gestionar ventas a crédito y seguimiento de pagos parciales (abonos).

**Criticidad:** Media - Flujo de crédito.

**Detalles:**
- Visualización de todas las ventas con estado `credito`
- Filtrado por cliente o número de venta
- Panel de detalle por venta que muestra:
  - Artículos originales con precios de la época
  - Pagos y abonos realizados
  - Saldo pendiente calculado
  - Advertencia si precios de productos han aumentado desde la venta
- Registro de abonos:
  - Método de pago (efectivo USD, efectivo VES, pago móvil, transferencia)
  - Montos en USD y/o VES (conversión automática usando tasa actual)
  - Actualización automática del saldo pendiente
  - Cambio de estado a "pagada" cuando saldo ≤ 0.001
- Modificación manual de deuda (administrador) con ajuste de tasa

**Implementación:**
- Frontend: `src/pages/CuentasPorCobrar.jsx`
- Backend: `electron/database/handlers/cuentas.js`
- Transacciones `cuentas:abonar` y `cuentas:ajustar_deuda`

---

## RF-06: Reportes y Cierres de Caja

**Descripción:** Módulo de informes con cierre automático/manual de día y métricas de negocio.

**Criticidad:** Alta - Control financiero.

**Detalles:**
- **Reporte del Día (hoy):**
  - Live data: siempre muestra datos actualizados
  - Snapshot guardado cuando se cierra el día
  - Indicador de si el día está cerrado o no
  - Métricas:
    - Total de ventas (count)
    - Ingresos totales (USD + VES)
    - Ganancia neta = (precio_venta - precio_compra) * cantidad - descuentos
    - Descuentos otorgados
    - Pendiente por cobrar (créditos)
  - Breakdown por método de pago (pagos + abonos separadamente)
  - Lista detallada de ventas del día (expandible)

- **Cierre de Día:**
  - Manual: botón "Cerrar Día" en Reportes
  - Auto: al iniciar la app se cierran automáticamente todos los días anteriores
  - Guarda un snapshot en tabla `cierres_dia` con JSON de pagos, abonos y ventas
  - Incluye tasa de cierre y timestamp

- **Historial:**
  - Lista de todos los días cerrados
  - Selección de fecha para ver detalle completo (reescalado a tasa de cierre)

- **Inventario (reporte):**
  - Total productos únicos
  - Total unidades en stock
  - Inversión (costo total en USD)
  - Ganancia potencial (venta - costo)
  - Lista de productos bajo stock

- **Todas las Ventas:**
  - Lista paginada (25/página)
  - Filtros por fecha (día, mes, rango personalizado)
  - Filtro por estado (pagada/crédito/todas)
  - Totales por página
  - Expandible para ver detalle de líneas y pagos

**Implementación:**
- Frontend: `src/pages/Reportes.jsx`
- Backend: `electron/database/handlers/reportes.js`
- Auto-cierre: `reportes:autoClosePreviousDays()` en `main.js:60`

---

## RF-07: Dashboard

**Descripción:** Página principal con resumen ejecutivo del día actual y métricas clave.

**Criticidad:** Alta - Visibilidad inmediata.

**Detalles:**
- 4 stat cards:
  1. Ingresos Hoy (con subtotal en Bs.)
  2. Ganancia Neta (con número de ventas)
  3. Por Cobrar (créditos activos)
  4. Descuentos Otorgados
- Gráfico de tendencia semanal (7 días) con Recharts (AreaChart)
- Top 5 productos más vendidos (últimos 30 días)
- Top 5 deudores (créditos pendientes)
- 6 transacciones más recientes con estado
- Tasa BCV destacada en header

**Implementación:**
- Frontend: `src/pages/Dashboard.jsx`
- Backend: `electron/database/handlers/reportes.js:207` (dashboard:metrics)

---

## RF-08: Configuración del Sistema

**Descripción:** Almacenamiento y recuperación de settings globales de la tienda.

**Criticidad:** Media - Personalización.

**Detalles:**
Claves soportadas en tabla `configuracion`:
- `tasa_del_dia` (float string)
- `nombre_tienda` (string)
- `telefono_tienda` (string)
- `direccion_tienda` (string)
- `ticket_pie` (string - mensaje final del ticket)
- `impresora_ancho` (string: '58' o '80' mm)

**Implementación:**
- CRUD: `config:get`, `config:getAll`, `config:set` en `handlers/config.js`
- Cargados en `AppContext` al iniciar

---

## RF-09: Impresión de Tickets

**Descripción:** Generación e impresión de tickets térmicos para cada venta.

**Criticidad:** Media - Operativa.

**Detalles:**
- Plantilla HTML generada dinámicamente en nueva ventana
- Formato optimizado para impresoras térmicas 58mm u 80mm
- Contenido:
  - Nombre y dirección de tienda
  - Fecha, hora, número de venta
  - Cliente (si se registró)
  - Líneas de item (nombre, cantidad, precio unit, subtotal)
  - Descuento aplicado (si hubo)
  - Total en USD y VES
  - Desglose de pagos por método
  - Tasa de cambio utilizada
  - Mensaje de agradecimiento configurable
- Botón "Imprimir" que dispara `window.print()` y cierra la ventana

**Implementación:**
- Función `printTicket` en `src/pages/POS.jsx:16`

---

## RF-10: Escaneo de Códigos de Barras

**Descripción:** Captura de productos mediante cámara para agilizar el punto de venta.

**Criticidad:** Media - UX improvement.

**Detalles:**
- Modal con vista de cámara en tiempo real
- Soporte para múltiples cámaras (selector dropdown)
- Usa librería `html5-qrcode`
- Decodificación automática al detectar código
- Flash visual al detectar código
- Integración con búsqueda de productos exacta por `codigo`
- Compatible con DroidCam (cámara USB Android) y webcams nativas

**Implementación:**
- Componente: `src/components/ScannerModal.jsx`
- Lógica de búsqueda: `src/pages/POS.jsx:278` (handleScan)

---

## RF-11: API HTTP para Red Local

**Descripción:** Servidor Express que expone endpoints IPC a clientes HTTP en la misma red (dispositivos móviles).

**Criticidad:** Baja - Feature futura/extra.

**Detalles:**
- Servidor en puerto 3001, bind a `0.0.0.0`
- Endpoint único: `POST /api/invoke`
- Payload: `{ channel: string, args: array }`
- Retorna: `{ result: any }` o `{ error: string }`
- Usa interceptación de `ipcMain._customHandlers` para reutilizar lógica
- CORS habilitado para acceso desde móviles

**Implementación:**
- Servidor: `electron/api-server.js`
- Registro en `main.js:68`
- Polyfill frontend: `src/context/AppContext.jsx:4-25` (fallback HTTP cuando no hay window.api)

---

## 📋 Resumen de Módulos

| Módulo | Página Principal | Handler IPC | Estado |
|--------|-----------------|-------------|--------|
| Configuración | - | `config:*` | ✅ Completo |
| Categorías | Inventario | `categorias:*` | ✅ Completo |
| Productos | Inventario | `productos:*` | ✅ Completo |
| Insumos | Centro Copiado | `insumos:*` | ✅ Completo |
| Servicios | Centro Copiado | `servicios:*` | ✅ Completo |
| Ventas | POS | `ventas:*` | ✅ Completo |
| Cuentas | Cuentas por Cobrar | `cuentas:*` | ✅ Completo |
| Mermas | Inventario | `mermas:create` | ✅ Completo |
| Reportes | Reportes | `reportes:*` | ✅ Completo |
| Dashboard | Dashboard | `dashboard:metrics` | ✅ Completo |

---

*Documento mantenido como código - actualizar junto con cambios en funcionalidades.*
