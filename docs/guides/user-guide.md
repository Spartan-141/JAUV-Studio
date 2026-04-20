# Guía de Usuario

## 📖 Introducción

Bienvenido a **JAUV Studio POS**, el sistema de punto de venta designed para tu papelería y centro de copiado. Esta guía cubre las operaciones diarias típicas.

---

## 🚀 Primeros Pasos

### 1. Iniciar la Aplicación

- Double-click en el acceso directo `JAUV Studio POS.exe` (Windows)
- O ejecutar desde terminal: `npm run dev` (modo desarrollo) o `npm start` (si está empaquetado)

**Primera ejecución:**
Se crea automáticamente la base de datos en:
```
C:\Users\[TuUsuario]\AppData\Roaming\jauv-studio-pos\jauv_pos.db
```

---

### 2. Configurar la Tasa del Día

**Importante:** La tasa de cambio es crítica para los cálculos de VES.

1. En la barra lateral (PC) o tocar el botón **"Tasa"** en la barra inferior (móvil/tablet)
2. Ingresar la tasa BCV del día (ej: `36.50` para 36.50 bolívares por dólar)
3. Presionar **Guardar**

> **Tip:** La tasa se guarda automáticamente y persiste entre reinicios. ¡No olvides actualizarla diariamente!

---

## 🛒 Realizar una Venta (POS)

### Paso 1: Buscar Producto o Servicio

En la pantalla principal **Ventas**:

1. Haz clic en el campo de búsqueda (o usa el icono de cámara para escanear código de barras)
2. Escribe el nombre del producto (ej: `"cuaderno"`) o escanea el código
3. La lista muestra resultados en tiempo real
4. Haz clic en el item para agregarlo al carrito

**Para servicios de copiado:**
- Al seleccionar un servicio (ej: "Copia B/N Carta") aparece un modal
- Ingresa:
  - **Cantidad a cobrar:** número de copias (ej: 50)
  - **Hojas gastadas:** número de hojas consumidas (ej: 52 si 2 salieron mal)
- Haz clic en **"➕ Agregar al carrito"**

**Escaneo con cámara:**
- Conecta una cámara web o DroidCam
- Haz clic en el icono de cámara a la derecha del buscador
- Apunta al código de barras
- Cuando se detecte, se agregará automáticamente

---

### Paso 2: Ajustar el Carrito

El carrito muestra:
- Nombre del item
- Cantidad (puedes usar `+` / `-` o escribir número directamente)
- Precio unitario en Bs. y USD
- Subtotal Bs. / USD

**Para eliminar un item:** Haz clic en el icono `✕` a la derecha.

**Para modificar cantidad:** Usa los botones `+`/`-` o escribe el número.

**Límites de stock:**
- No puedes agregar más unidades de las disponibles en inventario
- Si intentas, aparecerá una alerta indicando el stock máximo

---

### Paso 3: Aplicar Descuento (Opcional)

En el panel derecho (Resumen del pedido):

1. Selecciona el tipo de descuento:
   - `$` - descuento fijo en **dólares**
   - `Bs` - descuento fijo en **bolívares**
   - `%` - porcentaje (ej: 10 para 10%)

2. Ingresa el valor
   - Si es porcentual, escribe el número (ej: `10` para 10%)
   - El subtotal se actualiza automáticamente

**Nota:** El descuento no puede superar el subtotal.

---

### Paso 4: Registrar Pago

Haz clic en el botón grande **"💳 COBRAR"**.

**Ventana de Pago:**

Aparece un modal con:
- Total a cobrar en Bs. y USD
- Cuatro métodos de pago (puedes combinar):
  - `$ Efectivo USD`
  - `Bs. Efectivo`
  - `Bs. Pago Móvil`
  - `Bs. Transferencia`

**Opciones:**

1. **Pago completo:**
   - Completa uno o varios campos hasta que "Total pagado" = "Total a cobrar"
   - Si pagas de más, aparece **"Vuelto"** automáticamente

2. **Pago a crédito:**
   - Deja todos los campos vacíos o con valor inferior al total
   - El sistema detecta "Falta por pagar" y transforma la venta en **crédito**
   - **Requiere nombre del cliente** (campo obligatorio aparece)

3. **Pago mixto:**
   - Ejemplo: `$10 USD` en efectivo + `Bs. 200` por pago móvil = total pagado

**Confirmar:**
- Haz clic en **"✅ Confirmar Venta"** (pago completo) o **"📋 Guardar como Crédito"**
- La venta se registra y aparece ticket de confirmación

---

### Paso 5: Imprimir Ticket

Tras confirmar la venta:

1. Aparece modal **"¡Venta Registrada!"**
2. Información:
   - Número de venta
   - Estado (Pagada / A crédito)
3. Opciones:
   - **🖨️ Imprimir Ticket** → abre ventana y dispara impresión
   - **Cerrar** → vuelve al POS con carrito limpio

**La impresora debe estar:**
- Conectada por USB o red
- Configurada como impresora predeterminada del sistema
- Con papel térmico (58mm u 80mm según configuración)

> **Nota:** El ticket se genera en HTML y se imprime usando `window.print()`. El diálogo de impresión puede aparecer; selecciona la impresora térmica y imprime.

---

## 📦 Gestionar Inventario

Accede desde la barra lateral: **📦 Inventario**.

### Ver Productos

La tabla muestra todos los productos con:
- Código
- Nombre
- Categoría
- Precios (compra/venta en USD y VES)
- Stock actual
- Indicador de stock bajo (⚠️ rojo si `stock ≤ stock_minimo`)

**Filtros:**
- Buscador por nombre, código o marca
- Select de categoría
- Checkbox "Solo bajo stock" para ver alertas

---

### Agregar Nuevo Producto

1. Haz clic en **"+ Nuevo Producto"**
2. Completa el formulario:

   **Datos básicos:**
   - Código: (opcional, si lo dejas vacío se autogenera PAP-XXXXXX)
   - Nombre: * (obligatorio)
   - Marca: (opcional)
   - Categoría: (selecciona o deja en blanco)

   **Precios:**
   - Elige moneda del precio fijo:
     - **$ USD** → el precio en Bs. se calcula con la tasa actual (varía diariamente)
     - **Bs. VES** → precio fijo en bolívares (no cambia con tasa)
   - Precio de compra (costo)
   - Precio de venta (con margen automático mostrado)

   **Inventario:**
   - Stock Actual: unidades disponibles
   - Stock Mínimo: umbral de alerta (cuando stock ≤ este valor, aparece en rojo)

   **Descripción:** notas internas (opcional)

3. Haz clic en **"💾 Guardar"**

---

### Editar Producto

1. En la tabla, haz clic en el icono **✏️** (Editar)
2. Modifica los campos necesarios
3. Guarda cambios

---

### Registrar Merma (Pérdida)

Si un producto se daña, roba o vence:

1. Haz clic en el icono **📉** (Merma)
2. Selecciona el producto (ya está preseleccionado si viniste desde editar)
3. Completa:
   - **Cantidad a descontar:** cuántas unidades se pierden
   - **Motivo:** daño, robo, uso_interno, vencimiento, otro
   - **Notas:** descripción (opcional)
4. Haz clic en **"📉 Registrar Merma"**

El stock se ajusta automáticamente.

---

### Gestionar Categorías

Haz clic en **"📂 Categorías"** para abrir el gestor.

**Crear categoría:**
- Escribe el nombre en el campo superior
- Haz clic en `+`

**Asignar productos a categoría:**
- Selecciona una categoría en la lista izquierda
- En la derecha, marca/desmarca productos con checkboxes
- Haz clic en **"💾 Guardar Asignación"**

**Editar/eliminar categoría:**
- Pasa el cursor sobre la categoría
- ✏️ para editar nombre
- 🗑️ para eliminar (los productos dejan de tener categoría, no se borran)

---

## 🖨️ Centro de Copiado

Accede desde **🖨️ Centro de Copiado**.

### Gestionar Insumos (Papel)

**Ver stock:**
- La tabla muestra cada tipo de papel (carta, oficio, etc.)
- Stock actual y mínimo
- Si está bajo stock, se marca en rojo

**Ajustar stock:**
1. Haz clic en el icono **📊** (Ajustar)
2. Selecciona operación:
   - `➕ Agregar hojas` → para cuando recibes nuevo papel
   - `➖ Quitar hojas` → para correcciones manuales
3. Ingresa la cantidad
4. **Aplicar**

**Editar insumo:**
- Icono **✏️** → modifica nombre, tipo, stock mínimo, costo por hoja

---

### Gestionar Servicios

**Lista de servicios:**
- Nombre del servicio
- Insumo que consume (ej: "Papel Carta")
- Precio en USD
- Precio en Bs. (calculado con tasa actual)
- Estado (Activo/Inactivo)

**Agregar/editar servicio:**
1. "+ Nuevo Servicio"
2. Datos:
   - Nombre (ej: "Copia B/N Oficio")
   - Precio (elige moneda USD o VES)
   - Insumo asociado (qué papel consume)
3. Guardar

**Desactivar servicio:**
- Edita el servicio y marca `activo = 0` (o elimínalo si no se usará más)
- Los servicios inactivos no aparecen en búsquedas del POS

---

## 💸 Cuentas por Cobrar (Créditos)

Accede desde **📋 Cuentas por Cobrar**.

### Ver Créditos Pendientes

La tabla muestra ventas con `estado = 'credito'`:
- Número de venta
- Cliente
- Fecha y hora
- Total original (en Bs. y USD)
- Pagado (con barra de progreso verde)
- Saldo pendiente (en rojo)

**Buscar:** por nombre de cliente o folio (número de venta)

---

### Registrar Abono (Pago Parcial)

1. En la fila del cliente, haz clic en **"+ Abono"**
2. Modal de abono:
   - Cliente y deuda original (en Bs. fijos con tasa de esa venta)
   - Método de pago (efectivo USD, pago móvil, transferencia, etc.)
   - Monto en USD (se convierte automáticamente a Bs. usando tasa ACTUAL)
   - También puedes ingresar monto en Bs. directamente
3. Haz clic en **"✅ Registrar Abono"**

El saldo se actualiza automáticamente. Si el abono cubre el 100%, el estado cambia a **pagada**.

---

### Ver Detalle de Venta a Crédito

1. En la fila, haz clic en el icono **👁️** (Ver detalle)
2. Muestra:
   - Artículos originales con precios de la época
   - Historial de pagos (pagos iniciales + abonos)
   - Saldo pendiente actualizado
   - Si algún producto subió de precio (⚠️ advertencia)
3. Botón **"✏️ Modificar Deuda"** (admin) para ajustar manualmente el monto pendiente

---

## 📊 Reportes

Accede desde **📈 Reportes**.

### Reporte del Día (Hoy)

Vista por defecto al entrar a Reportes.

**Muestra:**
- **N° Ventas:** cantidad de transacciones hoy
- **Ingresos USD:** total facturado hoy en dólares
- **Ganancia Neta:** (precio venta - precio compra) - descuentos
- **Descuentos:** total otorgado hoy
- **Pendiente Cobrar:** suma de saldos de créditos abiertos

**Desglose por métodos de pago:**
- Tabla con columnas para cada método (Efectivo USD, Efectivo VES, Pago Móvil, Transferencia)
- Muestra totales en USD y VES

**Lista de ventas del día:**
- Tabla expandible
- Haz clic en una fila para ver:
  - Número de venta
  - Cliente
  - Estado (pagada/credito)
  - Items vendidos (con cantidad y subtotal)
  - Pagos asociados

---

### Cerrar el Día

**¿Qué hace?**
Guarda un snapshot de toda la operación del día en la tabla `cierres_dia`. Una vez cerrado, el reporte histórico queda inalterable.

**Cuándo cerrar:**
- Al final de la jornada, después de la última venta
- **Antes de apagar la computadora**

**Proceso:**
1. En Reportes → Hoy, haz clic en **"🔒 Cerrar Día"**
2. Confirma con la tasa mostrada
3. El sistema calcula y guarda el cierre
4. Aparece confirmación

**Si ya cerraste y hay nuevas ventas:**
- El botón cambia a **"🔄 Actualizar Cierre"**
- Al hacerlo, se agregan las ventas tardías al snapshot del mismo día

**Nota:** El día se cierra automáticamente al iniciar la app si olvidaste hacerlo.

---

### Historial Cerrado

Haz clic en la pestaña **"🕐 Historial Cerrado"**.

- Lista todos los días cerrados (fecha, ingresos, # ventas)
- Selecciona una fecha en el dropdown para ver el detalle completo de ese día
- Incluye tasa de cierre, pagos, ventas detalladas

---

### Reporte de Inventario

Pestaña **"📦 Inventario"**:

- **Total productos:** referencias únicas
- **Total artículos:** suma de stock_actual
- **Inversión (Costo):** valor de todo el inventario en USD (precio_compra × cantidad)
- **Ganancia Potencial:** diferencia entre precio venta y compra × stock

**Alertas de bajo stock:**
- Lista productos que están por debajo o igual a stock_mínimo
- Prioriza los más críticos (menor stock primero)

---

### Todas las Ventas

Pestaña **"📋 Todas las Ventas"**:

- Lista paginada de todas las transacciones (no solo hoy)
- Filtros:
  - **Día específico:** selecciona fecha
  - **Mes:** selecciona mes/año
  - **Rango personalizado:** desde - hasta
  - **Estado:** pagada o crédito
- Haz clic en una fila para expandir y ver items, pagos, abonos
- Navegación por páginas (25 registros por página)

---

## ⚙️ Configuración (Opcional)

**Nota:** No hay pantalla central de configuración (por ahora). Los valores se modifican inline donde aparecen.

- **Tasa del día:** barra lateral / bottom nav
- **Nombre de tienda, teléfono, dirección, mensaje de ticket:** pendiente de UI (se modifican desde db o futuro panel admin)

---

## ❓ Problemas Comunes

### No puedo imprimir el ticket

1. Verifica que la impresora térmica esté conectada y configurada como predeterminada
2. Asegúrate de que el ancho configurado (`impresora_ancho`) coincida con el papel (58 u 80mm)
3. Al hacer clic en "Imprimir", el diálogo de impresión del sistema debe aparecer
4. Selecciona la impresora correcta y haz clic en **Imprimir**

### Código de barras no detectado

- Asegúrate de que la cámara esté encendida y apuntando al código
- Iluminación adecuada, sin reflejos
- Si usas DroidCam, verifica que el servidor móvil esté corriendo
- Prueba con otro código o aumenta el contraste

### Stock no se actualiza después de venta

- La venta **sí** descuenta stock al confirmarse
- Si el stock no cambió, verifica que el producto tenga `stock_actual` correcto previo a la venta
- Revisa la consola de la app (F12) para errores

### No puedo editar/eliminar un producto

- Verifica que no haya ventas que lo referencien (las ventas conservan el snapshot, pero la FK no restringe)
- Si hay error de constraint, significa que hay dependencias en `detalle_venta` (raro, porque no hay FK directa)

---

## 📞 Soporte

Para reportar bugs o solicitar features:
- Repositorio: [enlace a GitHub]
- O contacta al desarrollador: [info de contacto]

---

*Documento mantenido como código - actualizar junto con cambios en UI.*
