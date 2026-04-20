# JAUV Studio POS - Documentación del Proyecto

> **Documentación como Código** - Esta carpeta contiene la documentación completa del sistema POS de JAUV Studio, mantenida junto al código fuente usando el principio "documentation as code".

## 📚 Índice de Documentación

### [Requisitos](requirements/)
- [Requisitos Funcionales](requirements/functional.md)
- [Requisitos No Funcionales](requirements/non-functional.md)
- [Restricciones y Suposiciones](requirements/constraints.md)

### [Arquitectura](architecture/)
- [Visión General](architecture/overview.md)
- [Decisiones Arquitectónicas (ADR)](architecture/decisions.md)
- [Patrones de Diseño](architecture/patterns.md)

### [Base de Datos](database/)
- [Esquema Completo](database/schema.md)
- [Migramientos y Migraciones](database/migrations.md)
- [Semillas Iniciales](database/seeds.md)

### [API](api/)
- [Canales IPC (Frontend ↔ Backend)](api/ipc-channels.md)
- [API HTTP (Red Local)](api/http-api.md)
- [Modelos de Datos](api/data-models.md)

### [Guías](guides/)
- [Guía de Usuario](guides/user-guide.md)
- [Guía de Administrador](guides/admin-guide.md)
- [Solución de Problemas](guides/troubleshooting.md)

### [Desarrollo](development/)
- [Configuración del Entorno](development/setup.md)
- [Compilación y Despliegue](development/build.md)
- [Pruebas](development/testing.md)

### [Contribución](contributing.md)
- Cómo contribuir al proyecto
- Estándares de código
- Proceso de pull request

---

## 🎯 Visión Rápida

**JAUV Studio POS** es un sistema de Punto de Venta integral para una papelería y centro de copiado en Venezuela. Diseñado para operar 100% offline con capacidades bimoneda (USD/VES).

### Características Clave
- ✅ Punto de Venta con pagos mixtos (efectivo, pago móvil, transferencia)
- ✅ Gestión de inventario con alertas de stock bajo
- ✅ Centro de copiado con lógica de "doble cantidad"
- ✅ Cuentas por cobrar con sistema de abonos
- ✅ Reportes diarios con cierre de caja automático
- ✅ Impresión de tickets térmicos
- ✅ Escaneo de códigos de barras
- ✅ Multi-moneda con tasa de cambio BCV en tiempo real

### Stack Tecnológico
| Tecnología | Uso |
|------------|-----|
| Electron | Framework de escritorio (Windows/Linux/macOS) |
| React 19 | Interfaz de usuario |
| TypeScript | Lenguaje para el Backend (Node.js) |
| Vite | Build tool y dev server |
| Tailwind CSS | Estilos utilitarios |
| SQLite (node:sqlite / sqlite3) | Base de datos local |
| Zod | Validación de esquemas y tipos |
| Jest / ts-jest | Suite de pruebas unitarias |
| Express | API HTTP para clientes móviles |
| Recharts | Gráficos y visualización |

---

## 📁 Estructura del Proyecto

```
JAUV Studio/
├── electron/           # Backend de Electron (TypeScript)
│   ├── application/   # Casos de Uso (Business Logic)
│   ├── domain/        # Entidades e Interfaces de Repositorio
│   ├── infrastructure/# Implementaciones (DB, Controllers, DI)
│   ├── main.ts        # Punto de entrada de la app
│   └── preload.ts     # Puente IPC seguro
├── src/               # Frontend React (Javascript/JSX)
├── dist/              # Build de producción (React)
├── dist-backend/      # Build de producción (TypeScript Backend)
├── dist-electron/     # Empaquetado final de la app
└── docs/             # 📖 Esta documentación aplicación
```

---

## 🔄 Flujo de Datos

```
Frontend React (Vite)
         │
         │ IPC (ipcRenderer.invoke)
         ▼
Main Process (Controllers)
         │
         │ Application Use Cases
         ▼
Repositories (Infrastructure)
         │
         │ SQLite queries
         ▼
SQLite Database (Local)
         │
         │ Results
         ▲
Express API Server (puerto 3001)
         │
         │ HTTP POST /api/invoke
         ▼
Clientes móviles en red local
```

---

## 🗄️ Modelo de Datos Resumido

El sistema consta de **11 tablas principales**:

| Tabla | Descripción |
|-------|-------------|
| `configuracion` | Clave-valor para settings globales |
| `categorias` | Categorías de productos |
| `productos` | Inventario de productos con precios duales |
| `insumos` | Materiales de copiado (papel, tinta) |
| `servicios` | Catálogo de servicios de copiado/impresión |
| `ventas` | Cabecera de ventas (pagadas/crédito) |
| `detalle_venta` | Líneas deitems por venta |
| `pagos` | Pagos recibidos por venta |
| `abonos` | Pagos parciales de créditos |
| `mermas` | Pérdidas/daños de inventario |
| `cierres_dia` | Snapshot diario de operación |

---

## 🚀 Inicio Rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Compilar el Backend (TypeScript)
npm run build:backend

# 3. Iniciar en desarrollo
npm run dev

# 4. Construir para producción (Frontend + Backend + App)
npm run build
```

> Ver [development/setup.md](development/setup.md) para instrucciones detalladas.

---

## ❓ Preguntas Frecuentes

**¿Dónde se almacena la base de datos?**
La base de datos SQLite (`jauv_pos.db`) se almacena en el directorio de datos de la aplicación:
- Windows: `C:\Users\<Usuario>\AppData\Roaming\jauv-studio-pos\`
- Linux: `~/.config/jauv-studio-pos/`

**¿Cómo funciona el modo bimoneda?**
Los precios se guardan en USD y se convierten a VES usando la tasa BCV. Puedes fijar precios directamente en VES también. Ver [api/data-models.md](api/data-models.md).

**¿Puedo usar el sistema sin conexión?**
Sí, es 100% offline. La base de datos es local. El API HTTP solo funciona en red local (puerto 3001) para dispositivos móviles en la misma red.

---

## 📄 Licencia

ISC - JAUV Studio

---

**Última actualización:** Abril 2025  
**Versión del documento:** 2.5.0 (coincide con la versión del software)
