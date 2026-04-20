# Arquitectura - Visión General (VES Only)

## 📐 Panorama General

JAUV Studio POS es una aplicación de escritorio **Electron** que ejecuta una interfaz **React** en el renderer process y lógica de negocio en el **main process** (Node.js). La comunicación se realiza mediante **IPC (Inter-Process Communication)** seguro con `contextBridge`.

A partir de la versión 2.5.0, el sistema opera exclusivamente bajo un esquema de **Moneda Única (Bolívares - VES)**, simplificando la lógica de negocio y eliminando la dependencia de tasas de cambio externas para la operación base.

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                    │
│   (TypeScript - DDD / Clean Architecture)                   │
├─────────────────────────────────────────────────────────────┐
│  Infrastructure Layer (Controllers, DI, Repositories)       │
│  ↓                                                          │
│  Application Layer (Use Cases + Validation)                │
│  ↓                                                          │
│  Domain Layer (Entities, Repositories Interfaces)           │
│  ↓                                                          │
│  SQLite (jauv_pos.db) via IUnitOfWork                       │
└─────────────────────────────────────────────────────────────┘
                         ↑ ↑  ↑
                         │ │  │ IPC (invoke/handle)
                         │ │  │
┌────────────────────────┘ │  └──────────────────────────────┐
│  Electron Preload Script (expose 'api')                    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Renderer Process (React App - BrowserWindow)      │    │
│  │  ┌────────────────────────────────────────────────┐│    │
│  │  │  React Components + Context (AppContext)       ││    │
│  │  │  window.api.invoke('channel', args)            ││    │
│  │  └────────────────────────────────────────────────┘│    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Patrones Arquitectónicos

### 1. **Electron Main-Renderer con IPC**
Main process actúa como el servidor de datos y el renderer process como el cliente UI.
- **Main process** expone handlers IPC asíncronos (`ipcMain.handle`).
- **Renderer** invoca estos métodos vía `window.api.invoke`.

### 2. **Arquitectura Limpia (Layered/DDD)**
- **Dominio (`domain/`):** Lógica pura, interfaces de repositorios y entidades.
- **Aplicación (`application//`):** Casos de Uso (Use Cases) que orquestan el flujo de datos y validan entradas con **Zod**.
- **Infraestructura (`infrastructure/`):** Implementaciones técnicas (SQLite, Controladores IPC).

### 3. **Unidad de Trabajo (Unit of Work)**
Garantiza que operaciones complejas (ej. registrar una venta y descontar stock) sean atómicas.

---

## 📁 Estructura de Archivos

```
electron/
├── application/                # Casos de uso y esquemas de validación Zod
├── domain/                     # Interfaces y lógica de negocio central
└── infrastructure/             # Implementaciones de DB, IPC y DI
src/
├── context/
│   └── AppContext.jsx          # Estado global y utilidades de formato (Bs.)
├── pages/
│   ├── Dashboard.jsx           # Métricas agregadas en VES
│   ├── POS.jsx                 # Punto de Venta en VES
│   └── ...
```

---

## 🔄 Flujo de Datos (VES Only)

### 1. **Inicialización**
El sistema carga la configuración base y verifica cierres automáticos de días anteriores. No se carga ni se procesa ninguna tasa de cambio global.

### 2. **Venta Completa**
```javascript
// POS.jsx
const result = await window.api.invoke('ventas:create', {
  cabecera: {
    subtotal, descuento, total,
    estado: 'pagada' | 'credito',
    cliente_nombre, saldo_pendiente, notas
  },
  detalles: [ { tipo, ref_id, nombre, cantidad, precio_unitario, subtotal } ],
  pagos: [ { metodo, monto } ]
})
```

---

## 🏷️ Manejo de Monedas (VES)

El sistema ha sido migrado de un esquema dual a uno de **moneda única**. 

### Precios en DB
Para mantener compatibilidad con el esquema físico preexistente, se conservan los nombres de columnas pero su semántica es fija:
- `precio_compra_ves` / `precio_venta_ves`: Almacenan montos en Bolívares.
- `moneda_precio`: Valor estático `'ves'`.

### Visualización
La función `fmt(valor)` en el frontend formatea automáticamente cualquier número como moneda venezolana (`es-VE`), añadiendo el prefijo `Bs.` y manejando separadores de miles y decimales correctamente.

---

## 💾 Persistencia de Datos
- **Motor:** SQLite3.
- **Modo:** WAL (Write-Ahead Logging) para mejor rendimiento.
- **Ubicación:** Carpeta de datos del usuario (AppData/Roaming en Windows).
