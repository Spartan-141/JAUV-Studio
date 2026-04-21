# JAUV Studio - Sistema de Punto de Venta (POS)

Un sistema integral de Punto de Venta diseñado específicamente para **JAUV Studio**, una papelería y centro de copiado. Esta aplicación de escritorio está optimizada para el mercado venezolano, operando exclusivamente en **Bolívares (VES)** para garantizar una gestión de inventario y facturación precisa y simplificada.

---

## 🚀 Tecnologías Principales

El proyecto utiliza un stack tecnológico robusto y moderno:

- **[Electron](https://www.electronjs.org/)**: Framework para aplicaciones de escritorio multiplataforma.
- **[React 18](https://react.dev/)**: Interfaz de usuario reactiva y eficiente.
- **[Vite](https://vitejs.dev/)**: Servidor de desarrollo y empaquetador de alto rendimiento.
- **[Tailwind CSS](https://tailwindcss.com/)**: Diseño visual moderno con soporte para tema oscuro.
- **[SQLite3](https://www.sqlite.org/)**: Motor de base de datos integrado para funcionamiento 100% **OFFLINE**.
- **[TypeScript](https://www.typescriptlang.org/)**: Tipado estático en el backend para mayor robustez y mantenibilidad.

---

## ✨ Características Principales

1. **Gestión Unificada en Bolívares**:
   - Todo el sistema (precios, costos, reportes) opera bajo la moneda local (VES).
   - Eliminación de la complejidad de tasas de cambio dinámicas para una contabilidad más clara.
2. **Punto de Venta (POS) Inteligente**:
   - Búsqueda instantánea de productos y servicios.
   - Soporte para múltiples métodos de pago: Efectivo, Pago Móvil y Transferencia.
3. **Módulo de Centro de Copiado**:
   - Gestión inteligente que diferencia entre el servicio cobrado y el insumo realmente consumido.
4. **Inventario de Alto Rendimiento**:
   - **Paginación Server-Side**: Optimizado para catálogos masivos sin pérdida de rendimiento.
   - Alertas visuales de stock bajo y gestión de mermas.
5. **Cuentas por Cobrar**:
   - Registro de clientes con sumatoria real de pagos recibidos.
   - **Sincronización de precios**: Capacidad de actualizar facturas abiertas si el precio del inventario cambia.
   - Sistema de abonos para pagos parciales.
6. **Reportes y Cierres de Caja**:.
7. **Impresión de Tickets**:
   - Plantillas personalizables para impresoras térmicas de 58mm y 80mm.

---

## 🛠 Instalación y Configuración

### Prerrequisitos

- [Node.js](https://nodejs.org/) (versión v18 o superior recomendada).
- Herramientas de compilación para C++ (necesarias para el módulo nativo de SQLite).

### Pasos

1. **Clonar el repositorio e instalar dependencias**
   ```bash
   npm install
   ```

2. **Compilar el Backend (Compilación inicial de TS)**
   ```bash
   npm run build:backend
   ```

3. **Arrancar en Entorno de Desarrollo**
   ```bash
   npm run dev
   ```

4. **Compilar para Producción**
   Genera el ejecutable instalador en la carpeta `dist-electron/`.
   ```bash
   npm run build
   ```

---

## 📂 Estructura del Proyecto

```
JAUV Studio/
├── electron/           # Backend (Main process)
│   ├── application/    # Casos de uso y validaciones (Zod)
│   ├── domain/         # Entidades e interfaces de repositorio
│   ├── infrastructure/ # Implementaciones de SQLite e IPC
│   └── database/       # Inicialización y esquemas SQL
├── src/                # Frontend (Renderer process)
│   ├── context/        # Estado global (AppContext)
│   ├── pages/          # Vistas (Dashboard, POS, Inventario, etc.)
│   ├── components/     # Componentes UI reutilizables
│   └── App.jsx         # Shell y enrutamiento
├── scripts/            # Scripts de utilidad (Seeding de datos)
└── package.json        # Dependencias y scripts de build
```

## 💾 Ubicación de los Datos

La base de datos (`jauv_pos.db`) se almacena en la carpeta de datos de aplicación del usuario:

- **Windows**: `%AppData%\jauv-studio-pos\jauv_pos.db`
- **Linux**: `~/.config/jauv-studio-pos/jauv_pos.db`
