# Decisiones Arquitectónicas (ADR)

## ADR-001: Elección de Electron sobre Aplicación Web Pura

**Estado:** ✅ Aceptada

**Contexto:**
Se necesitaba una aplicación de escritorio para una papelería que funcione 100% offline, con acceso a impresoras térmicas, cámara para escaneo, y base de datos local.

**Opción A - Aplicación Web Pura (PWA):**
- Pros: Más ligera, fácil deploy, actualización automática
- Contras:Limitado acceso a hardware (impresoras, cámara sin HTTPS), storage limitado (IndexedDB), no 100% offline sin service worker complejo

**Opción B - Aplicación Nativa (C++/Qt, C#, etc.):**
- Pros: Máximo performance, acceso total a HW
- Contras: Desarrollo más lento, curva de aprendizaje, portabilidad limitada

**Opción C - Electron:**
- Pros: Usa web tech (React), acceso completo a Node.js (filesystem, hardware), empaquetado cross-platform, amplia comunidad
- Contras: Más pesado (bundles Chromium + Node), consumo de RAM

**Decisión:** Electron.

**Razón:** Combina facilidad de desarrollo web con capacidades nativas. El equipo domina JavaScript/React, y se necesita acceso a impresora USB y base de datos SQLite local, que son triviales en Electron.

**Consecuencias:**
- Aprendizaje de IPC patterns (preload, contextBridge)
- Recompilación de módulos nativos (`better-sqlite3`) para cada versión de Electron
- Tamaño de distributable ~100 MB (incluye Chromium)

---

## ADR-002: SQLite como Base de Datos Local

**Estado:** ✅ Aceptada

**Contexto:**
La aplicación debe funcionar completamente offline, con datos persistidos localmente. Se esperan hasta 50,000 productos y 500,000 ventas/año.

**Opción A - SQLite (better-sqlite3):**
- Pros: Embedded, 0-config, single file, ACID, maduro, rápido, ampliamente soportado
- Cons: Single-writer limit, no hay servidor central, tamaño máximo DB ~140 TB (pero práctico ~500 MB)

**Opción B - IndexedDB (via Dexie.js):**
- Pros: Nativo en navegador, async, indexado
- Cons: API compleja, rendimiento inconsistente, taille limit ~50% disk, no accesible desde Node.js directamente

**Opción C - LokiJS (in-memory + file persistance):**
- Pros: Muy rápido, API simple
- Cons: No ACID, no suitable para transacciones financieras

**Decisión:** SQLite con better-sqlite3.

**Razón:** Es el estándar de facto para bases de datos locales en aplicaciones desktop. better-sqlite3 es synchronous (más fácil de razonar) y tiene excelente rendimiento. Permite transacciones complejas (ventas + inventario + pagos) de forma atómica.

**Consecuencias:**
- queries síncronas en main process (bloqueante si hay muchas)
- Necesidad de recompilar el módulo nativo al actualizar Electron
- WAL mode habilitado para mejor concurrencia

---

## ADR-003: React 19 + Vite sobre Create React App

**Estado:** ✅ Aceptada

**Contexto:**
Se necesita framework frontend moderno, rápido en desarrollo y build, con buena DX.

**Opción A - Create React App (CRA):**
- Pros: Zero-config, estable, ampliamente adoptado
- Cons: Webpack lento, config limitada, EOL announced

**Opción B - Vite + React:**
- Pros: Build ultrarrápido (esbuild), HMR instantáneo, config flexible, moderno
- Cons: Menor madurez (pero ya estable)

**Opción C - Next.js:**
- Pros: SSR, routing integrado, optimizaciones
- Cons: Overkill para app desktop-only, más complejo

**Decisión:** Vite + React 19.

**Razón:** Velocidad de desarrollo y build. React 19 trae mejoras de rendimiento y nuevas APIs (use, etc.). Vite es ahora el estándar de la industria para dev frontend rápido. No necesitamos SSR.

**Consecuencias:**
- Configuración manual de alias (@) y path
- Tailwind需配置 (se hizo)
- Plugins de Vite para React

---

## ADR-004: IPC Asíncrono con `ipcRenderer.invoke` / `ipcMain.handle`

**Estado:** ✅ Aceptada

**Contexto:**
Electron expone dos patrones de IPC:
- `ipcRenderer.send` / `ipcRenderer.on` (event-based, async sin retorno directo)
- `ipcRenderer.invoke` / `ipcMain.handle` (-promise-based, request-response)

**Opción A - Patrón antiguo (send/on):**
- Pros: Más flexible (broadcast), soporta streams
- Cons: Callback hell, más boilerplate, no garantiza respuesta única

**Opción B - Patrón nuevo (invoke/handle):**
- Pros: Retorna Promise, try/catch natural, código más limpio, one-shot
- Cons: Solo para request-response (que es el 95% de los casos)

**Decisión:** `invoke`/`handle`.

**Razón:** La comunicación es principalmente frontend pidiendo datos o ejecutando acciones (CRUD). El patrón request-response es más simple y menos propenso a errores. Además, `invoke` soporta valores de retorno serializables automáticamente.

**Implementación:**
- Preload expone `window.api.invoke`
- Cada handler registrado con `ipcMain.handle('canal', async (event, args) => ...)`

**Consecuencias:**
- No se soporta streaming de datos (no necesario)
- Cada llamada es independiente (no hay contexto de sesión)

---

## ADR-005: Tailwind CSS con Estilos Globales Personalizados

**Estado:** ✅ Aceptada

**Contexto:**
Se necesita un sistema de diseño consistente y rápido de desarrollar. Alternativas: CSS Modules, Styled Components, plain CSS.

**Opción A - Tailwind CSS:**
- Pros: Utility-first, diseño rápido, pequeño CSS final (purge), personalizable
- Cons: Curva de aprendizaje de clases, HTML más verboso

**Opción B - CSS Modules:**
- Pros: Scoped, CSS tradicional
- Cons: Más archivos, menos reusable, más overhead

**Opción C - Styled Components / Emotion:**
- Pros: CSS-in-JS, dynamic styling
- Cons: Runtime cost, bundle size, no needed para este proyecto

**Decisión:** Tailwind CSS + custom classes en `index.css`.

**Razón:** Velocidad de prototipado, consistencia visual sin escribir CSS manual. Tailwind permite construir UI compleja solo con clases utilitarias y `@apply` para components reutilizables (`.btn`, `.card`, `.input`). El team está familiarizado.

**Consecuencias:**
- Configuración de `tailwind.config.js` para colores brand (JAUV)
- PostCSS y autoprefixer configurados
- Purge automático en producción gracias a Vite

---

## ADR-006: Moneda Dual (USD Base + VES Convertible)

**Estado:** ❌ Supercedida por [ADR-013](#adr-013-migración-a-sistema-de-moneda-única-bolívares)

**Contexto:**
En Venezuela los precios se manejan en dólares (USD) por la inflación, pero los clientes pagan en bolívares (VES) al tipo de cambio del día. Se necesita:

1. Precios de productos fijos (ya sea en USD o VES "anclados")
2. Conversión automática según tasa BCV
3. Histórico de ventas con tasa de la transacción

**Opción A - Solo USD con conversión en tiempo real:**
- Pros: Simple, solo un precio
- Contras: No se puede "anclar" un precio en VES si hay devaluación (el producto subiría automáticamente, lo cual no es deseable)

**Opción B - Dual Pricing (USD + VES) + moneda_precio:**
- Pros: Flexibilidad total: precio fijo en USD (se convierte) o fijo en VES (no cambia con tasa)
- Contras: 4 campos de precio por producto, más complejidad

**Opción C - Moneda base + factor de ajuste:**
- Pros: Menos campos
- Contras: No modela correctamente precios "fijos" en VES

**Decisión:** Opción B - Dual Pricing.

**Razón:** En un entorno de hiperinflación, algunos proveedores fijan precios en VES por períodos. El sistema debe soportar ambos casos. Además, los productos importados suelen cotizarse en USD, mientras que servicios locales pueden estar en VES.

**Implementación:**
- Tabla `productos`: `precio_compra_usd/ves`, `precio_venta_usd/ves`, `moneda_precio`
- Tabla `servicios`: `precio_usd`, `precio_ves`, `moneda_precio`
- Campo `tasa_cambio` en `ventas` guarda la tasa del día de esa venta (para histórico)

**Consecuencias:**
- Frontend debe calcular precio mostrado según `moneda_precio` y tasa actual
- Al crear/editar producto, se calculan ambos precios (si moneda es USD, se deriva VES multiplicando por tasa; si es VES, se deriva USD dividiendo)
- Al listar productos, se muestra el "precio de venta" en la moneda correspondiente + equivalente opcional

---

## ADR-007: API HTTP Express Local para Dispositivos Móviles

**Estado:** ✅ Aceptada

**Contexto:**
Se desea que dispositivos móviles en la misma red local (tablet, teléfono) puedan consultar datos o registrar ventas usando la misma base de datos.

**Problema:** Los móviles no pueden usar IPC de Electron directamente.

**Opción A - WebSocket server:**
- Pros: bidireccional, tiempo real
- Cons: Más complejo, no needed

**Opción B - REST API con Express:**
- Pros: Simple, ampliamente soportado, puede reutilizar handlers IPC existentes
- Cons: Puerto adicional, CORS config

**Opción C - No soportar móviles:**
- Pros: No会增加复杂性
- Cons: Limita usabilidad futura

**Decisión:** Express HTTP server en puerto 3001.

**Razón:** Rápido de implementar, usa los mismos handlers (vía `ipcMain._customHandlers`), y permite que cualquier dispositivo con navegador haga POST a `/api/invoke`. CORS habilitado para accesode cualquier IP local.

**Implementación:**
```javascript
// api-server.js
app.post('/api/invoke', async (req, res) => {
  const { channel, args } = req.body
  const handler = ipcMain._customHandlers.get(channel)
  const result = await handler(mockEvent, ...args)
  res.json({ result })
})
```

**Consecuencias:**
- Si el servidor falla al iniciar, se loguea pero no bloquea la app
- Frontend tiene polyfill que usa fetch cuando `window.api` no existe (dev browser)
- Puerto 3001 debe estar libre

---

## ADR-008: Auto-Cierre de Días en Startup

**Estado:** ❌ Obsoleta (V2.6.0) - Supercedida por [ADR-014](#adr-014-eliminación-de-cierres-de-día-en-favor-de-reportes-dinámicos)

**Contexto:**
El usuario puede olvidar cerrar el día en la app. Sin cierre, los reportes diarios pueden estar incompletos.

---

## ADR-014: Eliminación de Cierres de Día en favor de Reportes Dinámicos

**Estado:** ✅ Aceptada (V2.6.0)

**Contexto:**
El sistema de "Cierre de Día" (ADR-008) obligaba a los usuarios a realizar una acción manual de cierre fiscal para poder ver reportes históricos fidedignos. Esto generaba fricción y posibles inconsistencias si el cierre se hacía con datos incompletos o tasas erróneas.

**Decisión:**
Eliminar por completo el concepto de snapshots inmutables (`cierres_dia`) y calcular todos los reportes, estadísticas y métricas agregadas directamente de las transacciones de ventas en tiempo real.

**Razones:**
1. **Transparencia Total**: Los números en los reportes siempre coincidirán con la suma real de las ventas filtradas.
2. **Menor Fricción para el Usuario**: Se elimina la tarea diaria de "Cierre" y la necesidad de auto-cierres en el startup.
3. **Flexibilidad**: Permite generar reportes de cualquier rango de fechas y clientes de forma instantánea sin depender de cierres diarios pre-calculados.

**Implementación:**
- Se eliminó el controlador de auto-cierre en `main.ts`.
- Se refactorizó el endpoint `ventas:paginated` para devolver un objeto `resumen` con métricas agregadas dinámicas.
- Se simplificó la UI de `Reportes.jsx` a una única vista de historial inteligente.

**Consecuencias:**
- Mayor carga de cómputo en la base de datos para generar reportes extensos (mitigado por la eficiencia de SQLite).
- Los reportes ya no son "fotos fijas", sino que reflejan el estado actual de la base de datos (incluyendo facturas editadas o anuladas posteriormente).

---

## ADR-009: Tema Oscuro (Dark Mode) como Único Tema

**Estado:** ✅ Aceptada

**Contexto:**
La app es para uso en entorno de tienda (poca luz natural, pantallas encendidas todo el día). Se considera theme.

**Opción A - Tema claro + oscuro (toggle):**
- Pros: Elección del usuario
- Cons: Doble trabajo de CSS, más código

**Opción B - Solo tema oscuro:**
- Pros: Menos código, ahorro de energía en pantallas OLED, reduce fatiga visual en ambientes oscuros
- Cons: No apto para daylight

**Decisión:** Solo tema oscuro.

**Razón:** La tienda es un espacio controlado (luces tenues), y los monitores suelen ser para POS con teclado oscuro. Además, ahorra desarrollo y mantenimiento de dos temas.

**Paleta:** `surface-900` como fondo, `surface-800` para cards, `brand-500` como primary accent.

---

## ADR-010: No Hay Autenticación de Usuarios

**Estado:** ✅ Aceptada (por contexto)

**Contexto:**
Es una aplicación de escritorio para un único negocio, usada por múltiples empleados en una misma caja.

**Opción A - Sistema de usuarios y roles:**
- Pros: Auditar quién hizo cada venta, permisos granulares
- Contras: Complejidad added, gestión de passwords, login screen

**Opción B - Sin autenticación:**
- Pros: Simplicidad, zero friction
- Contras: No hay trazabilidad de usuario, cualquiera puede usar

**Decisión:** Sin autenticación.

**Razón:** El entorno es de confianza (solo empleados en tienda). No se requieren permisos diferentes (todos hacen lo mismo). La trazabilidad de quién hizo cada venta no es crítica para el negocio actual.

**Nota:** Si en el futuro se necesita, se puede añadir una tabla `usuarios` y login screen, pero es out of scope v2.5.0.

---

## ADR-011: Impresión de Tickets vía window.print() en Ventana Popup

**Estado:** ✅ Aceptada

**Contexto:**
Se necesita imprimir tickets térmicos después de cada venta.

**Opción A - Librería de impresión nativa (printer, electron-pos-printer):**
- Pros: Control total, sin popup
- Cons: Dependencia nativa extra, complejidad de driver, compatibilidad limitada

**Opción B - window.print() en ventana.html generada:**
- Pros: Usa el sistema de impresión del OS, no necesita drivers extra, cualquier impresora que soporte imprimir desde browser
- Cons: Muestra diálogo de impresión (posiblemente molesto), menos control sobre formato

**Decisión:** window.print() en popup HTML.

**Razón:** Simplicidad. Las impresoras térmicas modernas son compatibles con drivers genéricos ESC/POS que Windows/Linux soportan. El popup permite estilos CSS específicos para ticket (media print). El usuario puede seleccionar la impresora configurada como default.

**Implementación:** `printTicket` en POS.jsx genera HTML, abre ventana, setTimeout → print → close.

---

## ADR-012: Búsqueda con Debounce de 200ms

**Estado:** ✅ Aceptada

**Contexto:**
El input de búsqueda en POS debe ser responsivo pero no disparar queries en cada keystroke.

**Opción A - Búsqueda en cada input (sin debounce):**
- Pros: Instantáneo
- Cons: Muchas queries, carga innecesaria en DB

**Opción B - Debounce de 300ms-500ms:**
- Pros: Balance
- Cons: Poca sensación de inmediatez

**Opción C - Debounce de 100-200ms:**
- Pros: Casi instantáneo, limita queries
- Cons: Todavía puede disparar queries muy seguidas en slow typing

**Decisión:** 200ms.

**Razón:** Experiencia de usuario fluida sin saturar la DB. Los usuarios tipan a ~5-10 caracteres/segundo; 200ms de delay es imperceptible pero reduce queries en ~80%.

**Implementación:** `useEffect` con `setTimeout` en POS.jsx:224-239.

---

---

## ADR-013: Migración a Sistema de Moneda Única (Bolívares)

**Estado:** ✅ Aceptada (V2.5.0)

**Contexto:**
El sistema de moneda dual (ADR-006) introducía una complejidad significativa en el mantenimiento de precios, reportes y conciliación de pagos debido a la volatilidad de la tasa de cambio. Se decidió simplificar el sistema para operar exclusivamente en la moneda local (VES).

**Decisión:**
Eliminar todo rastro de conversión automática de moneda y establecer el Bolívar (VES) como la moneda base única para inventario, ventas y reportes.

**Razones:**
1. **Simplicidad**: Elimina la necesidad de actualizar tasas diariamente y reduce errores de redondeo en conversiones.
2. **Estabilidad del Código**: Simplifica drásticamente el frontend (AppContext, POS) y los esquemas de validación del backend.
3. **Mantenibilidad**: Prepara el sistema para una futura implementación de multi-moneda más modular y desacoplada en lugar de tenerla integrada en el núcleo del sistema.

**Implementación:**
- Se eliminaron las columnas de `_usd` de la lógica de negocio (aunque se preservan físicamente por compatibilidad de DB).
- Se eliminó el widget de tasa de cambio y todas las funciones `toVes`/`toUsd`.
- Se migraron los datos de prueba y semillas a valores realistas en Bolívares.

**Consecuencias:**
- El sistema ya no permite fijar precios en Dólares y verlos en Bolívares automáticamente.
- El histórico de ventas se simplifica a montos totales en VES.
- Se requiere una carga inicial de precios en la moneda local.

