# Configuración del Entorno de Desarrollo

Esta guía configura el entorno local para desarrollar y probar cambios en JAUV Studio POS.

---

## 📋 Prerrequisitos

### Software Requerido

| Herramienta | Versión Mínima | Propósito |
|-------------|----------------|-----------|
| Node.js | v18.x (v20 LTS) | Runtime JavaScript |
| npm | v8.x | Gestor de paquetes |
| Git | 2.x | Control de versiones |
| TypeScript | v5.x | Lenguaje del Backend |
| Windows Build Tools | latest | Compilar `sqlite3` (si es necesario) |

**Nota:** En Windows, instala "windows-build-tools" globalmente:
```bash
npm install --global windows-build-tools
```

En Linux (Ubuntu/Debian):
```bash
sudo apt-get install build-essential python3
```

---

## 🚀 Instalación Paso a Paso

### 1. Clonar el Repositorio

```bash
git clone https://github.com/jauvstudio/pos.git
cd jauv-studio-pos
```

### 2. Instalar Dependencias

```bash
npm install
```

Esto instala:
- Dependencias de producción (react, electron, sqlite3, etc.)
- DevDependencies (vite, tailwind, electron-rebuild, etc.)

**Duración:** 2-5 minutos dependiendo de conexión.

### 3. Compilar el Backend (TypeScript)

El backend utiliza TypeScript y debe ser transpilado a `dist-backend/` antes de ejecutar la aplicación.

```bash
npm run build:backend
```

**Qué hace:**
- Ejecuta `tsc -p tsconfig.backend.json`
- Genera archivos JavaScript en `dist-backend/` compatibles con Electron.
- Mantiene el tipado estricto durante el desarrollo.

**Nota:** Si vas a desarrollar activamente en el backend, puedes usar `npm run build:backend-watch` en una terminal separada.

### 4. Iniciar en Desarrollo

```bash
npm run dev
```

**Qué inicia:**
1. **Vite dev server** en `http://localhost:5173` (Hot Module Replacement)
2. **Electron** (espera a que Vite esté listo con `wait-on`)
3. Abre ventana de la app

**Ventajas de dev mode:**
- Cambios en archivos `.jsx` → reload instantáneo (HMR)
- Consola de DevTools abierta (F12) para debug
- Logs en terminal

---

## 🏗️ Estructura de Desarrollo

```
├── electron/           # Código principal de Electron (TypeScript source)
├── src/               # Código frontend React (Vite)
├── dist/              # Output de build del Frontend (no committear)
├── dist-backend/      # Output de compilación del Backend (no committear)
├── dist-electron/     # Output empaquetado final (no committear)
├── node_modules/      # Dependencias
├── package.json       # Scripts y dependencias
├── tsconfig.backend.json # Configuración de TypeScript para el Backend
├── vite.config.js     # Config Vite
├── tailwind.config.js # Config Tailwind
└── postcss.config.js  # Config PostCSS
```

---

## 🔧 Scripts Disponibles

```bash
npm run dev          # Inicia Vite + Electron + Watch del Backend
npm run vite         # Solo Vite dev server (frontend)
npm run build:backend # Compila el backend una sola vez
npm run build:backend-watch # Compila backend en modo observación
npm run build        # Build final (React + Backend + App Package)
npm run test         # Ejecuta pruebas unitarias con Jest
```

**Detalles:**

- `npm run dev` usa `concurrently` para ejecutar `vite` y `electron:dev` simultáneamente
- `wait-on` espera a que `http://localhost:5173` responda antes de lanzar Electron
- `cross-env NODE_ENV=development` setea variable de entorno

---

## 🖥️ Debugging

### Console Logs

**Main process (Electron):**
- Salida en la terminal donde ejecutaste `npm run dev`
- También en DevTools → Console (pestaña "Main" en Electron)

**Renderer process (React):**
- DevTools → Console (pestaña "Renderer")
- O `console.log` directamente en componentes

### Debug con VS Code

1. Abre la carpeta en VS Code
2. Instala extensión "Debugger for Chrome" o "JavaScript Debugger" (built-in)
3. Crea `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Electron Main",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/electron",
      "args": ["."],
      "outputCapture": "std"
    },
    {
      "name": "Electron Renderer",
      "type": "chrome",
      "request": "attach",
      "port": 9222,
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

**Para lanzar:**
- Primero `npm run dev` (con `--remote-debugging-port=9222` agregado a `main.js` si quieres attach)
- Luego seleccionar "Electron Renderer" en VS Code

---

## 🧪 Testing Manual

No hay suite de tests automatizados. El testing se realiza manualmente siguiendo escenarios.

**Checklist básico después de cambio:**

1. **Compilar:** `npm run build` → sin errores
2. **Iniciar:** `npm run dev` → app abre
3. **POS:**
   - Buscar producto → agregar al carrito ✅
   - Aplicar descuento → recalcula total ✅
   - Cobrar → sale ticket ✅
   - Stock actualizado? ✅
4. **Inventario:**
   - Crear producto → aparece en búsqueda ✅
   - Editar → cambios reflejados ✅
   - Eliminar → desaparece ✅
5. **Reportes:**
   - Reporte del día coincide con ventas hechas ✅
   - Cerrar día → se crea snapshot ✅

---

## 🎨 Trabajar con Tailwind CSS

### Añadir nueva clase utility

Edita `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: { ... },
        surface: { ... },
        accent: { ... }
      },
      // Añadir nuevas animaciones
      animation: {
        'pulse-soft': 'pulseSoft 2s infinite',
        // nueva:
        'bounce-slow': 'bounce 3s infinite',
      }
    }
  }
}
```

**Recompilar estilos:** Vite detecta cambios automáticamente y recarga.

### Crear componente CSS reutilizable

Añade en `src/index.css` dentro de `@layer components`:

```css
.btn-new {
  @apply px-4 py-2 bg-blue-600 text-white rounded-lg font-medium;
}
```

---

## 🔄 Flujo de Trabajo con Git

### Ramas

- `main` → producción estable (última release)
- `develop` → integración de features
- `feature/nombre` → nueva funcionalidad
- `hotfix/nombre` → bug urgente en producción

**Workflow:**
```bash
git checkout develop
git pull origin develop
git checkout -b feature/nueva-funcionalidad
# ... codificar ...
git add .
git commit -m "feat: agregar módulo de proveedores"
git push origin feature/nueva-funcionalidad
# Crear PR en GitHub → code review → merge a develop
```

### Commits

Seguir [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

Types:
feat: nueva funcionalidad
fix: corrección de bug
docs: cambios en documentación
style: formato (no afecta funcionalidad)
refactor: refactorización sin changes funcionales
test: añadir/modificar tests
chore: tareas de mantenimiento (deps, build)
```

**Ejemplo:**
```
fix(ventas): corrige cálculo de vuelto pagos mixtos
```

---

## 📦 Dependencias

### Añadir Nueva Dependencia

```bash
# Producción
npm install nombre-paquete

# Development
npm install --save-dev nombre-paquete
```

**Ejemplo:** Añadir `lodash` para utilidades:
```bash
npm install lodash
```
```javascript
import debounce from 'lodash/debounce'
```

### Actualizar Dependencias

```bash
npm outdated        # ver qué está desactualizado
npm update          # actualizar dentro del rango semver
# O manualmente editar package.json y npm install
```

**Precaución:** `better-sqlite3` requiere rebuild después de `npm update` si cambia la versión:
```bash
npx @electron/rebuild -f -w better-sqlite3
```

---

## 🏗️ Build de Producción

### Compilar

```bash
npm run build
```

**Proceso:**
1. **Vite build:**
   - Minifica CSS/JS
   - Genera `dist/` con archivos estáticos (index.html, assets JS/CSS)
   - Hash en nombres para cache busting

2. **electron-builder:**
   - Toma los archivos de `dist/`
   - Incluye `electron/**/*` (main, preload, database)
   - Empaqueta todo en un `.exe` (Windows) o `.AppImage` (Linux)
   - Output en `dist-electron/`

**Artifacts:**
```
dist-electron/
└── win-unpacked/
    └── resources/
        ├── app.asar          # app empaquetada
        └── database/         # DB se incluye? No, la DB es userData (runtime)
```

**Nota:** La base de datos **NO** se incluye en el build; se crea en `userData` al primera ejecución.

### Empaquetado Personalizado

Editar `package.json` → `build`:

```json
"build": {
  "appId": "com.jauvstudio.pos",
  "productName": "JAUV Studio POS",
  "directories": { "output": "dist-electron" },
  "win": {
    "icon": "img/icono.png",
    "target": ["nsis"]  // o "zip"
  },
  "mac": { ... },
  "linux": { ... }
}
```

**Formatos soportados:**
- Windows: `nsis` (instalador), `zip` (portable)
- macOS: `dmg`, `zip`
- Linux: `AppImage`, `deb`, `tar.gz`

---

## 🐛 Debugging Producción

### Modo debug

```bash
npm run dev  # ya trae devtools abiertas
```

Para producción, añade `--enable-logging` al ejecutable:
```bash
"start": "electron . --enable-logging"
```

Esto escribe logs a archivo (depende de OS).

### Ver logs en Windows

```powershell
Get-Content "$env:APPDATA\jauv-studio-pos\..\jauv-studio-pos\logs\*.log" -Wait
```

---

## 📚 Recursos de Aprendizaje

- [Electron Docs](https://www.electronjs.org/docs)
- [React Docs](https://react.dev/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)

---

*Documento mantenido como código - actualizar con cambios en entorno de desarrollo.*
