# Guía de Administrador

Esta guía está dirigida al administrador o dueño del negocio que gestiona el sistema JAUV Studio POS.

---

## 📊 Dashboard y Métricas

### Vista General

Al iniciar la app, la pantalla **Dashboard** muestra:

- **Ingresos Hoy:** total facturado el día actual (USD)
- **Ganancia Neta:** margen bruto menos descuentos
- **Por Cobrar:** suma de créditos pendientes
- **Descuentos:** total de descuentos otorgados hoy

**Gráfico de Tendencia Semanal:**
- Muestra ingresos diarios de los últimos 7 días
- Si falta un día (sin ventas), se muestra como 0

**Top Productos (30 días):**
- Los 5 productos más vendidos (por cantidad)
- Muestra ingresos generados por cada uno

**Top Deudores:**
- Clientes con mayor saldo pendiente en créditos
- Útil para seguimiento de cobranza

**Transacciones Recientes:**
- Últimas 6 ventas (hoy) con icono de estado

---

## 🔧 Gestión de Inventario Avanzada

### Revisión de Stock Bajo

En **Inventario**, el botón **"⚠️ X bajo stock"** (si hay alertas) filtra productos con `stock_actual ≤ stock_minimo`.

**Acciones recomendadas:**
- Revisar físicamente el inventario
- Realizar compras para reponer
- Ajustar `stock_minimo` si el nivel está obsoleto

---

### Categorización Inteligente

El gestor de categorías permite:

1. **Ver productos por categoría:** Al seleccionar una categoría a la izquierda, la derecha muestra todos los productos asignados a ella
2. **Asignación masiva:** Marca múltiples productos y haz clic en "Guardar Asignación" para asignarlos a la categoría seleccionada
3. **Desasignación automática:** Los productos no marcados se desvinculan de esa categoría

**Buena práctica:**
- Mantén un máximo de 10-15 categorías (demasiadas dificultan la navegación)
- Usa nombres claros y específicos

---

### Precios Fijos en VES

**Cuándo usar precios en VES:**
- Productos importados que ya vienen con precio en dólares → usar USD
- Servicios locales con tarifa fija en bolívares → usar VES
- Productos que no quieres que varíen con la tasa (ej: promociones a precio fijo por una semana)

**Configuración:**
- Al crear/editar producto, selecciona la moneda
- Si eliges VES, el campo USD se calcula automáticamente (pero puedes sobreescribirlo si es necesario)
- El precio VES es "fijo" hasta que lo modifiques manualmente

**Atención:**
- Si subes la tasa del día, los productos en USD suben de precio en Bs., pero los VES permanecen igual
- Revisa márgenes de ganancia cuando uses VES (pueden quedar muy bajos si la tas sube)

---

## 💸 Flujo de Créditos

### Concesión de Crédito

1. En POS, al procesar venta:
   - No completes todos los pagos (deja un saldo pendiente)
   - Marca el campo **Nombre del Cliente** (obligatorio si hay saldo)
   - Sistema automáticamente cambia estado a `credito`

2. La venta aparece en **Cuentas por Cobrar** con saldo pendiente

### Seguimiento

**En Cuentas por Cobrar:**
- Barra de progreso verde indica porcentaje pagado
- Saldo pendiente en rojo (fijo en Bs. con tasa original de la venta)

**Al hacer clic en 👁️ Ver detalle:**
- Se muestra "Deuda Fija" (Bs.) basada en la tasa de la venta
- Debajo, "Estimado hoy" (≈ Bs. actuales / tasa actual) → referencia útil si el cliente paga hoy
- Historial de pagos con fechas
- Advertencia si el precio actual en inventario subió (puede afectar margen si el cliente devuelve)

---

### Registro de Abono

1. Click **"+ Abono"** en la fila del cliente
2. Selecciona método de pago
3. Ingresa monto en USD (se convierte a Bs.) o en Bs. directo
4. Guardar

**El sistema:**
- Crea registro en `abonos`
- Disminuye `saldo_pendiente_usd`
- Si saldo ≤ 0.001 → estado cambia a `pagada`

---

### Ajuste Manual de Deuda

**Solo admin:** Si se renegocia la deuda (ej: se perdona parte):

1. En detalle de venta, click **"✏️ Modificar Deuda"**
2. Ingresa nuevo monto pendiente en **Bs.**
3. Se recalcula el saldo USD usando la tasa actual
4. Se actualiza `tasa_cambio` de la venta (para trazabilidad)
5. Estado se actualiza (pagada si nuevo saldo ≈ 0)

**Use con cuidado:** Esto modifica el historical data de la venta.

---

## 📈 Cierres de Caja

### Proceso Diario Recomendado

1. **Al finalizar la jornada** (después de última venta):
   - Ir a **Reportes → Reporte del Día**
   - Revisar métricas: total ventas, ganancia, pendientes
   - Click **"🔒 Cerrar Día"**
   - Confirmar con tasa del día

2. **Verificar:**
   - El mensaje de confirmación muestra el snapshot completo
   - La tarjeta "Último cierre guardado el..." aparece en verde
   - El botón cambia a "🔄 Actualizar Cierre" (por si hay ventas tardías)

3. **Si olvidaste cerrar:**
   - Al día siguiente, al abrir la app, se cerrará automáticamente el día anterior
   - Los datos se calcularán con la tasa actual (no la tasa del día original)
   - Puedes "Actualizar Cierre" si necesitas reabrir y agregar ventas faltantes

---

### Interpretación del Reporte del Día

| Métrica | Cómo se calcula | Qué significa |
|---------|----------------|---------------|
| **Total Ventas** | COUNT(ventas) | Número de transacciones (no items) |
| **Ingresos USD** | SUM(total_usd) | Dinero recibido (en USD equivalentes) |
| **Ganancia Neta** | Σ((p.venta_usd - p.compra_usd) × cantidad) - descuentos | Utilidad real del día |
| **Descuentos** | SUM(descuento_otorgado_usd) | Dinero descontado (promociones) |
| **Pendiente Cobrar** | SUM(saldo_pendiente_usd) | Créditos emitidos hoy sin pagar |
| **Ingresos VES** | SUM(pagos.monto_ves) + SUM(abonos.monto_ves) | Efectivo VES total recibido |

---

## 🔍 Reportes Históricos

### Historial Cerrado

Lista todos los días que se han cerrado (incluyendo auto-cerrados). Permite:
- Consultar ventas de días pasados
- Comparar métricas entre días
- Auditoría

**Selecciona una fecha:** Muestra el snapshot completo tal como se guardó.

---

### Reporte de Inventario (Métricas)

**Estadísticas globales:**
- **Total productos:** referencias únicas en catálogo
- **Total artículos:** sumatoria de stock_actual (unidades físicas)
- **Inversión:** `Σ(precio_compra × stock)` en USD → cuánto dinero tienes atado en inventario
- **Ganancia Potencial:** `Σ((precio_venta - precio_compra) × stock)` → margen si vendieras todo al precio actual

**Alertas de bajo stock:**
- Lista de productos donde `stock_actual ≤ stock_minimo`
- Priorizados por stock más crítico
- Acción sugerida: reponer inmediatamente

---

### Todas las Ventas (Historial Paginado)

**Filtros útiles:**
- **Día específico:** Ver ventas de una fecha particular
- **Mes completo:** Análisis mensual
- **Rango personalizado:** Para conciliar con banco (ej: 1 Abr - 30 Abr)
- **Estado:** Filtrar solo pagadas o solo créditos

**Columnas:**
- # (ID venta)
- Fecha y hora
- Cliente
- Estado (color verde/amarillo)
- Total
- Cobrado (progreso)
- Pendiente (si crédito)

**Expandir fila:** Ver detalle de items, pagos, abonos.

---

## 🛠️ Mantenimiento

### Backup de Base de Datos

**Ubicación:**
```
Windows: C:\Users\[Usuario]\AppData\Roaming\jauv-studio-pos\jauv_pos.db
Linux: ~/.config/jauv-studio-pos/jauv_pos.db
```

**Para backup:**
1. Cierra la aplicación completamente
2. Copia el archivo `jauv_pos.db` a una carpeta de respaldo (ej: `backups/` con fecha)
3. Para restore, reemplaza el archivo y abre la app

**Automatización (opcional):**
Puedes crear un script que copie el archivo diariamente (usando Task Scheduler en Windows o cron en Linux).

---

### Compactar Base de Datos

Si el archivo crece mucho (>200 MB), puedes compactarlo:

```bash
# Detener la app
# Abrir terminal en carpeta de la DB (ver arriba)
sqlite3 jauv_pos.db "VACUUM;"
```

Esto reorganiza los datos y reduce tamaño.

---

### Reset Total (Borrar Todo)

**¡CUIDADO!** Esto elimina toda la información (ventas, productos, etc.).

```bash
# Cerrar app
del "%APPDATA%\jauv-studio-pos\jauv_pos.db"  # Windows
# o rm ~/.config/jauv-studio-pos/jauv_pos.db  # Linux
# Reabrir app → Se crea DB vacía con seeds
```

---

## 🧾 Imprimir Tickets de Ventas Antiguas

No hay función directa, pero puedes:
1. Abrir la venta en **Reportes → Todas las Ventas** (expandir fila)
2. Ver los datos en pantalla
3. Imprimir manualmente (no hay botón de reimpresión)

Solicitar como feature para próxima versión.

---

## 🔐 Permisos y Seguridad

**La app no tiene usuarios:**
- Cualquier persona con acceso al PC puede usar todas las funciones
- No hay roles (admin/operador)
- No hay auditoría de "quién hizo qué"

**Recomendaciones:**
- Restringir acceso físico a la computadora de caja
- Si se requiere multi-usuario, se puede añadir login en futuras versiones

---

## 📋 Checklist Diario de Admin

Al final de cada día:

- [ ] Verificar que la tasa del día esté actualizada
- [ ] Revisar inventario de bajo stock (productos e insumos)
- [ ] Registrar mermas si hubo daños
- [ ] Cerrar el día en Reportes
- [ ] Imprimir resumen de cierre (opcional)
- [ ] Hacer backup de la base de datos (copiar archivo .db a USB/nube)

**Semanal:**
- Revisar cuentas por cobrar, contactar deudores morosos
- Ajustar precios si es necesario (inflación)
- Verificar que la impresora térmica tenga papel y tinta

**Mensual:**
- Comparar reportes mensuales (ventas, ganancias)
- Identificar productos más vendidos (para promociones)
- Limpiar/archivar backups antiguos (conservar últimos 3 meses)

---

## 🆘 Solución de Problemas de Admin

### Los totales no cuadran con el efectivo

**Causa posible:** Los pagos en efectivo están registrados correctamente, pero el efectivo físico puede haber errores humanos (vuelto mal calculado, billetes mezclados).

**Solución:**
- Revisar en **Reportes → Historial** del día el desglose por método de pago
- Comparar con la caja física:
  - `efectivo_usd` → contar dólares en efectivo
  - `efectivo_ves` + `pago_movil` + `transferencia` → sumar Bolívares

**Diferencia:** registrar como "merma" o "ajuste" (no hay ajuste contable directo, se puede crear una merma de "diferencia de caja").

---

### Ganancia neta parece baja

**Verificar:**
1. Los precios de compra (`precio_compra_usd`) están actualizados? SI son altos, la ganancia se reduce
2. Los descuentos otorgados están altos? Revisar política de descuentos
3. ¿Hay muchas mermas (pérdidas)? → recapacitar en control de inventario

**Acciones:**
- Subir precios de venta (considerando tasa actual)
- Negociar precios de compra con proveedores
- Reducir mermas (mejor manejo de productos frágiles)

---

### Sistema lento con muchos productos

Si agregas +50,000 productos:
- La búsqueda puede volverse más lenta (LIKE sin índice full-text)
- Solución: añadir índice full-text (FTS5) a SQLite (requiere migración)

---

## 📞 Contacto y Soporte

Para consultas técnicas o solicitudes de features:
- Email: [correo de soporte]
- GitHub Issues: [enlace]

---

*Documento mantenido como código - actualizar con nuevas guías de admin.*
