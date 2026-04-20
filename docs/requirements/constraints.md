# Restricciones y Suposiciones

## Restricciones Técnicas

### Stack Tecnológico Fijo
- **Electron**: Versión 35.0.0 (Node.js 20.x integrado, V8 11.x)
- **React**: 19.0.0 (última versión estable al momento de desarrollo)
- **SQLite**: better-sqlite3 5.1.7 (módulo nativo C++)
- **Node.js mínimo**: v16 (pero Electron trae su propio Node)

**Implicación:** Cualquier actualización mayor de estas tecnologías requiere pruebas exhaustivas, especialmente `better-sqlite3` que necesita recompilarse contra el V8 de Electron.

### Plataformas Soportadas
- **Primaria**: Windows (desarrollado y probado en Windows 10/11)
- **Secundaria**: Linux y macOS (debería funcionar sin cambios, pero sin pruebas formales)
- **Móvil**: No soportado nativamente (solo como cliente de la API HTTP local)

### Base de Datos Local Única
- SQLite es embedded, no server
- Un solo usuario a la vez (lock a nivel archivo)
- No hay replicación ni sync entre dispositivos
- Máximo tamaño recomendado: 500 MB

### Sin Autenticación
- La aplicación corre con los permisos del usuario actual
- No hay login, roles, ni permisos granulares
- Asume un ambiente de confianza (caja registradora en tienda física)

---

## Suposiciones de Negocio

### Entorno Económico Venezolano
1. **Hiperinflación / Devaluación frecuente:**
   - La tasa de cambio BCV fluctúa diariamente (a veces múltiples veces al día)
   - Los precios de reposición (compra) cambian con la inflación
   - Se asume que la tasa guardada en `configuracion` es la tasa del día de trabajo

2. **Double-Pricing:**
   - Los productos pueden tener precios fijos en USD (que se convierten a VES con tasa del día)
   - O precios fijos en VES (que no cambian con la tasa, se "anclan" en bolívares)
   - Campo `moneda_precio` en `productos` y `servicios` indica cuál es la moneda base

3. **Pagos Mixtos:**
   - Los clientes pueden pagar parte en efectivo USD, parte en transferencia VES
   - El sistema calcula automáticamente el equivalente total en VES usando la tasa del día
   - El vuelto se calcula diferenciando monedas

4. **Créditos:**
   - Se asume que el cliente volverá a pagar en el futuro
   - La deuda queda en USD (saldo_pendiente_usd) pero se muestra en VES con tasa actual del día para referencia
   - El vendedor puede modificar manualmente la deuda (ajustar deuda) si negotiations

### Flujo de Copiado
- **Lógica de "Doble Cantidad":**
  - Cobras X copias pero gastas Y hojas (normalmente Y ≥ X)
  - Ejemplo típico: 50 copias, 2 errores → cobras 50, gastas 52 hojas
  - Campo `cantidad_hojas_gastadas` en `detalle_venta` captura este dato

### Inventario
- **Mermas:**
  - Se registran como movimientos negativos de stock
  - No tienen reversa (asume que el producto/insumo se perdió)
  - Motivos predefinidos: daño, robo, uso interno, vencimiento, otro

### Cierres de Día
- **Auto-cierre en startup:**
  - Al abrir la app, el sistema busca días anteriores con ventas no cerradas
  - Los cierra automáticamente usando la tasa actual de `configuracion`
  - Esto garantiza que siempre haya un snapshot, aunque el usuario olvide cerrar
- **Cierre manual:**
  - El usuario puede cerrar el día en cualquier momento
  - Si ya está cerrado, puede "Actualizar Cierre" para incluir últimas ventas
- **Una vez cerrado, el día NO se puede modificar** (los datos están congelados)

---

## Suposiones de Usuario

### Perfil del Usuario
- Operador de caja con formación básica (sabe qué es un código de barras)
- Conoce los precios aproximadamente
- Puede calcular mentalmente vuelto (pero el sistema lo ayuda)
- Habla español (Venezuela) y maneja terminología de papelería/copias

### Entorno de Trabajo
- Tienda física con mostrador
- PC o laptop con Windows/Linux
- Conexión eléctrica estable
- Red local WiFi/Ethernet (opcional, para app móvil de consulta)
- Impresora térmica conectada por USB o red
- Cámara web/DroidCam para escaneo

### Flujo de Trabajo Diario
1. **Apertura:**
   - Encender PC
   - Iniciar la app
   - Verificar/actualizar tasa BCV del día
   - Revisar alertas de inventario (productos bajo stock)

2. **Operación:**
   - Registrar ventas (productos + servicios)
   - Escanear códigos o buscar
   - Aceptar pagos mixtos
   - Emitir tickets
   - Registrar mermas si hay daños
   - Cocinar registros de abonos a créditos

3. **Cierre:**
   - Al final del día, ir a Reportes → Cerrar Día
   - Revisar métricas
   - Imprimir resumen si se desea
   - La app al día siguiente auto-reabre con cierre previo

---

## Limitaciones Conocidas

### Escalabilidad
- No está diseñado para múltiples sucursales (no hay sincronización)
- No hay histórico de precios (solo precios actuales)
- Si se cambia un precio de producto, ventas históricas conservan el precio de venta original (sí), pero ganancia potencial futura usa nuevo precio

### Edge Cases
1. **Tasas de cambio:**


El sistema maneja conversiones extremas con un rango amplio de valores. Esto permite simular escenarios de alta volatilidad económica sin perder precisión en los cálculos.

2. **Precios negativos:**
   - La validación de frontend previene valores negativos, aunque el backend podría estar vulnerable
   - Se asume buena fe del operador

3. **Ventas con stock negativo:**
   - No permitido: stock_actual >= cantidad antes de agregar al carrito
   - En caso de race condition (dos users simultáneos), puede haber false negative, pero el DB constraint NO previene esto (no hay lock)

4. **Códigos de barra duplicados:**
   - Se generan aleatoriamente con 3 bytes hex (16 millones de combinaciones)
   - Verificación por `ensureUniqueCode` en handler
   - Colisión extremadamente improbable pero teóricamente posible

5. **Descuentos mayores al subtotal:**
   - Limitado en UI (max = subtotal)
   - Backend podría recibir valor mayor, pero el frontend no permite

6. **Cierre de día sin tasa:**
   - Usa tasa de config, default 40.00
   - Si no hay config, falla

### Compatibilidad
- **Impresoras térmicas:** drivers ESC/POS genéricos; no probado con todas las marcas
- **Cámaras:** html5-qrcode soporta muchos formatos, pero requiere permisos OS
- **Browser:** Solo funciona en Electron; no es web app standalone

---

## Suposiones de Desarrollo

### Dependencias
- Se asume que `npm install` descarga todas las dependencias de `package.json`
- `better-sqlite3` requiere herramientas de compilación nativa (`npm install --global windows-build-tools` en Windows)

### Versiones
- package.json `version: "2.5.0"` coincide con la app
- Se sigue semver pero manual (no hay CI/CD automatizado)

### Despliegue
- Electron Builder genera instalador Windows (.exe)
- No hay actualizador automático (OTA)
- El usuario debe reinstalar manualmente nuevas versiones

---

## Política de Errores

### Logging
- Console logs en desarrollo (Vite dev server)
- Console logs en producción (Electron main process escribe a stdout)
- No hay archivo de log persistente

### Errores de Usuario
- Validaciones en frontend previenen el 90% de errores
- AlertModal muestra mensajes amigables
- Errores de DB se propagan como excepciones y show en consola

### Crashing
- La app NO debe crashear por errores de usuario
- Los errores de DB durante initDb detienen el startup (crash)
- Los errores silenciosos se registran pero no interrumpen

---

*Documento mantenido como código - actualizar con nuevas restricciones conforme evoluciona el proyecto.*
