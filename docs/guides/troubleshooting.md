# Solución de Problemas

## 🚨 Problemas Comunes y Soluciones

### La app no inicia / se cierra inmediatamente

**Síntoma:** Al hacer doble-click en el .exe, no aparece ventana o aparece y se cierra.

**Posibles causas:**

1. **Base de datos corrupta**
   - Solución: Borrar `jauv_pos.db` (ver sección "Reset DB")
   - Se recreará desde cero al iniciar

2. **Falta recompilar better-sqlite3 para esta versión de Electron**
   - Error típico: `Error: The module '...\better_sqlite3.node' was compiled against a different Node.js version`
   - Solución: Ejecutar `npx @electron/rebuild -f -w better-sqlite3`
   - O reinstalar: `npm install --save-dev @electron/rebuild && npx electron-rebuild`

3. **Puerto 5173 ocupado** (dev mode)
   - Si ejecutas `npm run dev` y Vite no puede iniciar el dev server
   - Solución: Cambiar puerto en `vite.config.js` o matar el proceso que usa el puerto 5173

---

### Error "Database not initialized"

**Causa:** `initDb()` no ha terminado o falló.

**Solución:**
- Abre consola (F12 en la app) y revisa logs
- Si ves `[DB] CRITICAL ERROR`, la DB no se creó
- Verifica permisos de escritura en `AppData/Roaming/jauv-studio-pos/`

---

### No puedo conectar la cámara / escáner

**Síntoma:** Modal Scanner muestra error "No se encontraron cámaras" o "No se puede acceder a la cámara".

**Soluciones:**

1. **Permisos de sistema:**
   - Windows: Ve a Configuración → Privacidad → Cámara → permite acceso a apps de escritorio
   - Linux: Verifica que el usuario tenga permiso de lectura en `/dev/video*`

2. **DroidCam no detectado:**
   - Asegúrate que la app DroidCam esté corriendo en el teléfono
   - Que PC y teléfono estén en la misma red
   - Que DroidCam esté configurado como fuente de video (no audio)
   - En el modal, selecciona la cámara que dice "DroidCam" (no la webcam integrada)

3. **Cámara ocupada por otra app:**
   - Cierra Zoom, Teams, Chrome (pueden retain la cámara)
   - Reinicia la app

4. **HTML5-QRCode no soporta tu cámara:**
   - Prueba con otra cámara
   - Actualizar `html5-qrcode` en `package.json` (npm update)

---

### Impresora no imprime / imprime mal

**Síntomas:**
- Al hacer clic en "Imprimir", no sale nada
- Sale código HTML en lugar de ticket formateado
- El ticket se corta a mitad
- Caracteres extraños (no ASCII)

**Diagnóstico:**

1. **Verificar driver:**
   - ¿La impresora térmica está instalada como "Impresora" en Windows?
   - Prueba imprimir un documento de texto (Bloc de notas) → ¿funciona?

2. **Ajustar ancho de papel:**
   - En `configuracion`, `impresora_ancho` debe coincidir con el papel físico
   - Valores: `'58'` o `'80'`
   - Cambiar desde consola: `UPDATE configuracion SET valor='58' WHERE clave='impresora_ancho'`

3. **Problema de encoding:**
   - El ticket usa HTML con charset UTF-8
   - Algunas impresoras antiguas solo soportan ASCII
   - Cambiar el encoding del driver a UTF-8 o usar impresora moderna

4. **Saltos de línea incorrectos:**
   - El CSS del ticket usa `width: 58mm` o `80mm`
   - Si la impresora tiene márgenes distintos, ajustar CSS en `printTicket` función

**Workaround:**
- Imprimir a PDF primero → verificar formato
- L imprimir PDF a la impresora física

---

### Precios no se actualizan al cambiar tasa

**Síntoma:** Cambio tasa en barra lateral, pero los precios en POS/Inventario siguen igual.

**Causa:** La tasa se actualiza en estado global, pero los componentes pueden no re-renderizar.

**Solución:**
- Forzar re-render: recargar la página (F5) o reiniciar la app
- Verificar que `updateTasa` se ejecutó (consola log `[API] config:set`)

**Nota:** Productos con `moneda_precio='ves'` NO cambian con la tasa (son fijos en VES). Solo productos en USD se reconvierten.

---

### La búsqueda no encuentra productos

**Síntoma:** Escribo "cuaderno", no aparece nada, aunque sé que existe.

**Causas:**

1. **Filtro de categoría activo:**
   - En Inventario, el filtro "Todas las categorías" está bien, pero en POS no hay filtro de categoría
   - En POS, la búsqueda incluye nombre, código y marca → asegúrate que el texto coincida

2. **Indexación:**
   - Búsqueda es case-insensitive pero necesita al menos 3 caracteres para resultados significativos
   - Prueba con código exacto

3. **Producto inactivo/eliminado:**
   - Si el producto fue borrado, ya no está
   - Si `activo=0` (servicios) no aparecen en búsqueda

**Solución temporal:**
- Usar el botón de escáner para código exacto (más confiable)

---

### Las ventas no descuentan stock

**Síntoma:** Vendo un producto, pero en Inventario el stock sigue igual.

**Posibles causas:**

1. **Venta guardada en estado 'credito'** → igual descuenta stock (sí lo hace)
   - Las ventas a crédito también descuentan stock al confirmarse

2. **Error en transacción:**
   - Si hubo error durante `ventas:create`, hubo rollback
   - Revisar consola (F12) para mensajes SQL error

3. **El producto no existe o ID incorrecto:**
   - Si `ref_id` apunta a un producto borrado, UPDATE falla silenciosamente (0 rows affected)
   - No hay FK constraint, pero el stock no cambia

**Verificar:**
- Ejecutar en DB: `SELECT stock_actual FROM productos WHERE id = ?`

---

### El total no coincide con la suma de items

**Síntoma:** En el carrito, suma de subtotales ≠ total final.

**Causas comunes:**

1. **Descuento aplicado** → es normal (total = subtotal - descuento)
2. **Redondeos:**
   - Los precios en VES se redondean a 2 decimales en la UI, pero internamente se guardan con más precisión
   - Los totales en Bs. usan `toLocaleString('es-VE', { maximumFractionDigits: 2 })`
   - Pequeñas diferencias (< 0.01) por flotante son esperadas

**Ejemplo:**
- Item 1: $1.00 → Bs. 40.00
- Item 2: $0.05 → Bs. 2.00 (1×0.05×40=2)
- Subtotal Bs.: 42.00
- Total Bs. mostrado: 42.00 ✅

---

### No puedo eliminar una categoría

**Error:** "Cannot delete or update a parent row: a foreign key constraint fails"

**Causa:** Hay productos asignados a esa categoría.

**Solución:**
1. En el gestor de categorías, selecciona la categoría
2. Desmarca todos los productos (o muévelos a otra categoría)
3. Guardar asignación
4. Ahora podrás eliminar la categoría

---

### La app está muy lenta

**Diagnóstico:**

1. **Muchos productos (>10,000):**
   - La búsqueda `LIKE %term%` es full scan → lento
   - Solución: Añadir índice FTS5 (full-text search) o limitar búsqueda a 20 resultados

2. **DB muy grande (>500 MB):**
   - VACUUM para compactar
   - Moverse a HDD/SSD más rápido

3. **Memoria RAM baja:**
   - Electron consume ~200 MB base
   - Cerrar otras apps

4. **Antivirus escaneando archivos:**
   - Exclusiones para carpeta de la app y DB

---

### Error al instalar dependencias (npm install)

**Errores comunes:**

1. **Python / Build tools faltantes** (better-sqlite3):
   - Error: `gyp: No Xcode or CLT version detected!`
   - Solución Windows: `npm install --global windows-build-tools`
   - Solución Linux: `sudo apt-get install build-essential python3`

2. **node-gyp falla:**
   - `npm config set python python3`
   - `npm config set msvs_version 2017`

3. **Conflictos de versión:**
   - Borrar `node_modules` y `package-lock.json`, luego `npm install`

---

### Cámara / micrófono denegado

**Electron pide permisos automáticamente** (main.js:77-84).

Si se bloqueó:
- En Windows: Configuración → Privacidad → Cámara → Permitir apps de escritorio
- En Linux: Ejecutar con `--enable-features=WebRTCPipeWireCapturer` (para Wayland)

---

### La app no aparece en pantalla

**Síntoma:** El proceso corre, pero no ves ventana.

**Causa:** La ventana se abrió fuera de pantalla (útil en multi-monitor).

**Solución:**
- Abrir DevTools: `F12` si está visible, si no `Ctrl+Shift+I`
- Ejecutar en consola: `mainWindow.setBounds({ x: 100, y: 100, width: 1400, height: 900 })`
- O matar proceso y reiniciar (recuerda posición default)

---

### Impresora térmica imprime caracteres extraños

**Problema:** El ticket sale con símbolos raros, símbolos de euros, acentos mal.

**Causa:** Encoding. La impresora espera CP437 o similar, pero envías UTF-8.

**Solución:**
1. En drivers de la impresora, seleccionar código de página 437 (USA) o 850 (Europa Occidental)
2. O cambiar plantilla HTML para usar solo ASCII (reemplazar acentos):
   - `á` → `a`, `é` → `e`, `ñ` → `n`
3. Reiniciar spooler de impresión

---

### No hay sonido en notificaciones

**Electron no soporta sonidos nativos.**

**Solución:** El sistema operativo puede emitir sonido de notificación si:
- Windows: Asegúrate que los sonidos de "Notificación" estén habilitados
- O instalar librería personalizada (fuera de scope)

---

## 🗄️ Problemas de Base de Datos

### Tabla llena / "database or disk is full"

**Causa:** Disco C: casi lleno (DB necesita espacio para WAL).

**Solución:**
- Liberar espacio en disco
- Mover la DB a otro drive (editar `db.js:18` )
- Limpiar backups antiguos

---

### "no such table: configuracion"

**Causa:** DB nueva sin inicializar (initDb nunca corrió).

**Solución:**
- Cerrar app, borrar DB, reiniciar (trigger recrea tablas)

---

### Foreign key constraint failed

**Ejemplo:** Borrar una categoría que tiene productos → error.

**Solución:**
El sistema debería manejar esto con `ON DELETE SET NULL`, pero si hay un bug:
- Reasignar productos a otra categoría
- Luego borrar

---

### Corrupción de DB

**Síntomas:**
- `database disk image is malformed`
- `file is encrypted or is not a database`

**Causa:** Apagado brusco durante write, disco defectuoso.

**Solución:**
1. **Exportar datos** (si se puede abrir en modo solo lectura)
   ```bash
   sqlite3 jauv_pos.db .dump > backup.sql
   ```
2. Borrar DB corrupta
3. Crear nueva DB vacía y re-importar desde SQL dump
   ```bash
   sqlite3 new.db < backup.sql
   ```

---

## 🧹 Reset y Restauración

### Borrar la base de datos (reset total)

```powershell
# Windows PowerShell
Stop-Process -Name "JAUV Studio POS" -Force
Remove-Item "$env:APPDATA\jauv-studio-pos\jauv_pos.db"
# Al reabrir, se crea DB limpia con seeds
```

**Consecuencias:**
- Se pierden TODOS los datos (ventas, inventario, config)
- No se puede deshacer

---

### Backup y Restore Manual

**Backup:**
```powershell
# Copiar a carpeta de backup con fecha
Copy-Item "$env:APPDATA\jauv-studio-pos\jauv_pos.db" "C:\backups\jauv_pos_$(Get-Date -Format 'yyyyMMdd').db"
```

**Restore:**
```powershell
# Cerrar app primero
Copy-Item "C:\backups\jauv_pos_20250419.db" "$env:APPDATA\jauv-studio-pos\jauv_pos.db"
```

---

## 🐛 Reporte de Bugs

Si encuentras un bug que no esté listado:

1. **Reproducir pasos:**
   - ¿Qué hiciste?
   - ¿Qué esperabas?
   - ¿Qué pasó realmente?

2. **Capturar logs:**
   - Abrir DevTools (F12) → Consola
   - Copiar mensajes de error
   - Si hay stack trace, anotar

3. **Información del entorno:**
   - Versión de la app (en package.json)
   - Sistema operativo (Windows 10/11, Linux distro)
   - ¿Es recurrente? ¿Siempre pasa?

4. **Reportar:**
   - Crear GitHub Issue con título descriptivo
   - Incluir pasos para reproducir
   - Adjuntar logs y screenshots si es posible

---

## 🔄 Logs y Depuración

### Ver logs de la consola

**En desarrollo:**
- La terminal donde ejecutaste `npm run dev` muestra logs de Vite + Electron main process
- La ventana de la app: F12 → Console (logs del renderer React)

**En producción:**
- Los logs de Electron main process van a stdout (no hay archivo de log)
- Puedes redirigir la salida a archivo:
  ```bash
  "start": "electron . > logs.txt 2>&1"
  ```

### Habilitar logs de SQLite

**No implementado**, pero puedes añadir en `db.js`:
```javascript
sqlite3.verbose()  // al inicio
```

---

## 📞 Contacto de Soporte Técnico

- **Email:** [soporte@jauvstudio.com](mailto:soporte@jauvstudio.com)
- **Teléfono:** [+58 412 123 4567](tel:+584121234567)
- **Horario:** Lunes a Viernes, 8am - 5pm (hora Venezuela)

**Información a提供 al contactar:**
- Versión de la app (2.5.0)
- Sistema operativo
- Descripción del problema (con screenshots si es UI)

---

*Documento mantenido como código - actualizar con nuevos problemas reportados.*
