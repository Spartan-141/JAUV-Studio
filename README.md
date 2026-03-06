# JAUV Studio - Sistema de Punto de Venta (POS)

Un sistema integral de Punto de Venta diseñado específicamente para **JAUV Studio**, una papelería y centro de copiado. Esta aplicación de escritorio está optimizada para operar en escenarios híbridos de moneda (Dólares y Bolívares) e incluye flujos complejos como la gestión de inventario, facturación de servicios de impresión y cuentas por cobrar.

---

## 🚀 Tecnologías Principales

El proyecto ha sido desarrollado utilizando un stack tecnológico moderno y eficiente:

- **[Electron](https://www.electronjs.org/)**: Framework principal para empaquetar la aplicación web como una aplicación nativa de escritorio (Windows, Linux, macOS).
- **[React 18](https://react.dev/)**: Librería para construir una interfaz de usuario interactiva y fluida.
- **[Vite](https://vitejs.dev/)**: Herramienta de compilación y servidor de desarrollo ultrarrápido para React.
- **[Tailwind CSS](https://tailwindcss.com/)**: Framework de utilidades CSS para diseñar rápidamente interfaces personalizadas, aplicando un tema oscuro moderno.
- **[SQLite (better-sqlite3)](https://github.com/WiseLibs/better-sqlite3)**: Motor de base de datos relacional rápido e integrado localmente, lo que garantiza el funcionamiento 100% **OFFLINE** del sistema.

---

## ✨ Características Principales

1. **Gestión Bimoneda Nativa**:
   - Seguimiento en tiempo real de la tasa de cambio USD/VES mediante un panel lateral.
   - Precios base guardados en dólares y conversiones transparentes en todas las vistas de la aplicación.
2. **Punto de Venta (POS) Inteligente**:
   - Búsqueda súper rápida de productos y servicios por código de barras o nombre.
   - Procesamiento de **Pagos Mixtos**: Los clientes pueden pagar una parte en Efectivo (Dólares o Bolívares), Pago Móvil y Transferencia en una sola transacción.
   - Calculadora automática de "Vuelto" al exceder el monto a pagar.
3. **Módulo de Centro de Copiado**:
   - Lógica de "Doble Cantidad": Separa el cobro del servicio (ej. 5 copias) del descuento real de inventario (ej. 6 hojas gastadas por 1 error de impresión).
4. **Inventario Robusto**:
   - Alertas visuales de stock bajo.
   - Módulo de "Mermas" para justificar daños, robos o pérdidas de materiales y productos.
   - Generación automática de códigos tipo `PAP-XXXXXX` y visores de código de barras.
5. **Cuentas por Cobrar**:
   - Módulo para ventas a crédito con registro de cliente.
   - Seguimiento de saldos pendientes y sistema de "Abonos" (pagos parciales).
6. **Reportes y Cierres de Caja**:
   - Resumen del día con desglose de ganancia neta.
   - Cierre de caja preciso segmentado por cada método de pago (Efectivo, Transferencia, Pago Móvil).
7. **Impresión de Tickets**:
   - Plantillas HTML formateadas listas para ser enviadas a impresoras térmicas de medidas estándar (58mm u 80mm).

---

## 🛠 Instalación y Configuración

Siga las siguientes instrucciones para compilar, levantar y empaquetar la aplicación localmente.

### Prerequisitos

- [Node.js](https://nodejs.org/) (versión v16 o superior).
- Windows Build Tools o `build-essential` en Linux, ya que `better-sqlite3` es un módulo nativo en C++ que requiere ser compilado para la arquitectura destino.

### Pasos

1. **Clonar/Abrir el repositorio**
   Asegúrese de estar en el directorio de `JAUV Studio`.

   \`\`\`bash
   cd "/ruta/hacia/JAUV Studio"
   \`\`\`

2. **Instalar dependencias**
   Instala las librerías necesarias descritas en el archivo \`package.json\`.

   \`\`\`bash
   npm install
   \`\`\`

3. **Recompilar SQLite para Electron**
   Al usar Electron, los módulos nativos como `better-sqlite3` necesitan estar alineados con la versión V8 (Node) interna de Electron. Este paso es fundamental:

   \`\`\`bash
   npx @electron/rebuild -f -w better-sqlite3
   \`\`\`

4. **Arrancar en Entorno de Desarrollo**
   Este comando lanza concurrentemente el servidor de Vite (`localhost:5173`) y la ventana de Electron. Al guardar archivos de React, los cambios se reflejarán instantáneamente (HMR).

   \`\`\`bash
   npm run dev
   \`\`\`

5. **Compilar para Producción**
   Para generar el ejecutable final listo para instalarse o distribuirse a la computadora de la tienda:

   \`\`\`bash
   npm run build
   \`\`\`
   El empaquetado resultante (ej. un `.AppImage` o `.deb` en Linux, `.exe` en Windows) será guardado en el directorio `dist/`.

---

## 📂 Estructura del Proyecto

\`\`\`
JAUV Studio/
├── electron/ # Código del backend de Electron
│ ├── database/ # Lógica de SQLite, esquemas e inicialización
│ │ ├── db.js # Definición de las 11 tablas de base de datos
│ │ └── handlers/ # Puente de la DB; controladores CRUD por módulo
│ ├── main.js # Punto de entrada de la app de escritorio
│ └── preload.js # Puente de seguridad IPC para exponer métodos a React
├── src/ # Código Frontend en React
│ ├── context/ # Gestores de estados globales (ej. AppContext para la Tasa BCV)
│ ├── pages/ # Vistas de la aplicación (Dashboard, POS, Inventario, Reportes, etc.)
│ ├── index.css # Estilos globales de Tailwind y utilidades UI reutilizables
│ ├── App.jsx # Sistema de Enrutamiento y "Shell" (Sidebar) de la App
│ └── main.jsx # Raíz de la aplicación DOM
├── tailwind.config.js # Estructura del sistema de diseño (Colores de JAUV)
└── package.json # Metadatos del proyecto y scripts
\`\`\`

## 💾 Donde viven los datos

Por motivos de seguridad y persistencia, la base de datos de SQLite (`jauv_pos.db`) no reside en la carpeta del repositorio, sino en el directorio de datos de aplicación protegido del sistema operativo del usuario.

- **En Linux**: `~/.config/jauv-studio-pos/jauv_pos.db`
- **En Windows**: `C:\Users\<Usuario>\AppData\Roaming\jauv-studio-pos\jauv_pos.db`
