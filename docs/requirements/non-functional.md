# Requisitos No Funcionales

## RNF-01: Rendimiento

**Tiempo de Respuesta:**
- Búsqueda de productos/servicios: < 200ms (para 10,000 registros)
- Carga inicial de páginas: < 500ms
- Procesamiento de venta: < 1 segundo
- Impresión de ticket: < 2 segundos

**Concurrencia:**
- Soporte para 1 usuario (single-user desktop app)
- Manejo de hasta 50,000 productos sin degradación perceptible
- Hasta 100,000 registros en tabla `ventas` sin impacto en consultas

**Recursos:**
- Memoria RAM: < 200 MB en estado estable
- Tamaño de base de datos: < 500 MB (SQLite)
- CPU: < 5% en idle, < 30% durante operaciones intensivas

---

## RNF-02: Confiabilidad

**Disponibilidad:**
- Aplicación 100% offline: no requiere conexión a Internet
- Recuperación automática ante cierres inesperados
- Transacciones atómicas con rollback en caso de error

**Integridad de Datos:**
- Foreign keys habilitadas en SQLite (`PRAGMA foreign_keys = ON`)
- Todas las operaciones de escritura usan transacciones
- Validación de stock antes de venta (excepto en mermas, que pueden ir a negativo temporalmente)
- Duplicados prevenidos con constraints únicos (código, nombre en tablas correspondientes)

**Respaldo:**
- Base de datos en ubicación estándar del sistema (AppData/Roaming)
- Facilidad de backup: copiar archivo `jauv_pos.db`

---

## RNF-03: Seguridad

**Acceso:**
- No hay autenticación de usuario (app de escritorio single-user)
- Base de datos en directorio protegido del OS (solo usuario actual)
- Context isolation en Electron (`contextIsolation: true`)
- Deshabilitado `nodeIntegration` en renderer

**Validación:**
- Sanitización de búsquedas (prevención de inyección SQL mediante parámetros bound)
- Validación de tipos en frontend (number inputs)
- Límites en amounts (no negative values)

**Auditoría:**
- Todas las tablas tienen `created_at` o `fecha`
- Tabla `cierres_dia` preserva snapshot JSON de datos diarios
- Tabla `mermas` registra motivo, notas y fecha de cada pérdida

---

## RNF-04: Usabilidad

**Interfaz:**
- Diseño responsive: desktop (sidebar) + mobile (bottom nav)
- Tema oscuro consistente (Tailwind CSS)
- Feedback visual inmediato (hover, active, loading states)
- Modales para acciones críticas (confirmación de borrado, cierre de día)
- Alertas claras (AlertModal)

**Accesibilidad:**
- Contraste adequate (colores brand sobre dark surfaces)
- Tooltips en botones de acción
- Navegación por teclado en modales (Enter, Escape)
- Textos legibles (tamaño mínimo 12px, tipografía sans-serif)

**Flujos:**
- Máximo 3 clics para acciones principales (agregar producto, registrar venta)
- Búsqueda instantánea con debounce de 200ms
- Escaneo de código de barras integrado

---

## RNF-05: Mantenibilidad

**Código:**
- Estructura modular: separación clara frontend/backend
- Patrón de handler IPC por módulo (uno por tabla principal)
- Frontend: componentes reutilizables (modales, tablas)
- Uso de context (AppContext) para estado global compartido
- Sin comentarios innecesarios (código se auto-documenta)

**Testing:**
- No hay suite de tests automatizada (manual testing durante desarrollo)
- Console logs en producción (pueden activarse/desactivarse)

**Extensibilidad:**
- Facilidad para añadir nuevos módulos: crear handler IPC + página React + ruta
- Configuración centralizada en `configuracion` clave-valor
- Moneda dual built-in (fácil agregar tercera moneda con trabajos)

---

## RNF-06: Portabilidad

**Sistemas Operativos:**
- Desarrollado para Windows (principal), compatible con Linux y macOS
- Usa `app.getPath('userData')` para ubicación DB multiplataforma
- Build cross-platform con electron-builder (configurado para Win)

**Dependencias:**
- Node.js v16+ requerido
- Recompilación nativa de `better-sqlite3` para cada Electron version
- Sin dependencias de sistema externas (excepto build-essential para rebuild)

---

## RNF-07: Internacionalización (i18n)

**Idiomas:**
- Español (Venezuela) como idioma principal
- Formatos de fecha en español (date-fns locale `es`)
- Formato numérico Venezuela: `1.234,56` (2 decimales, separador milera punto, decimal coma)

**Monedas:**
- Sólo USD y VES (no multi-moneda en UI, pero datos soportan ambos)
- Tasa de conversión única y global

**Extensibilidad i18n:**
- Hard-coded en español (no extractable)
- Para traducir a otro idioma, habría que externalizar strings

---

## RNF-08: Disponibilidad de Datos

**Persistencia:**
- Base de datos SQLite con WAL journal mode (Write-Ahead Logging)
- Datos disponibles 100% offline
- No hay sync en la nube (local-only)

**Backup & Restore:**
- Backup: copiar archivo `jauv_pos.db` del directorio AppData
- Restore: reemplazar archivo (app debe estar cerrada)

**Migración:**
- Migraciones inline en `db.js` (ALTER TABLE con try-catch)
- Auto-deduplicación en startup (servicios, insumos)
- Seeds iniciales: categorías, insumos default, servicios default

---

## RNF-09: Seguridad Física

**Periféricos:**
- Impresora térmica: soporte para 58mm y 80mm (configurable)
- Lector de código de barras USB: compatible via cámara (html5-qrcode)
- Cámara web/DroidCam: permisos automáticos grant en Electron

**Hardware Mínimo:**
- CPU: Dual-core 2.0 GHz
- RAM: 4 GB
- Pantalla: 1280x720 (mínimo), 1400x900 (recomendado)

---

## RNF-10: Cumplimiento Legal

**Facturación:**
- Tickets impresos con formato simplificado (no factura fiscal)
- No está diseñado para facturación electrónica formal
- Uso interno de papelería (no sujeto a IVA según legislación venezolana para ciertos productos)

**Datos:**
- Almacenamiento local sin envío a terceros
- No recopila datos personales sensibles (solo nombres de clientes opcionales)
- Registro de transacciones para contabilidad interna

---

## RNF-11: Calidad de Código

**Estándares:**
- ESLint configurado (no ejecutado en scripts actuales)
- Formato inconsistente (no hay prettier configurado)
- Sin tests unitarios (solo testing manual)

**Documentación:**
- Este conjunto de archivos markdown
- Comentarios en código solo cuando la lógica es no-obvia
- JSDoc no utilizado

**Deuda Técnica:**
- Migraciones inline en `db.js` (líneas 187-237) - deberían estar separadas
- Algunas funciones muy largas (ej. buildDayData en reportes: 66 líneas)
- Mezcla de lógica de UI y negocio en algunos componentes React

---

*Documento mantenido como código - actualizar junto con cambios en arquitectura.*
