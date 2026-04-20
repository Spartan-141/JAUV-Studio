# Compilación y Despliegue

Guía completa para construir el instalador de JAUV Studio POS y distribuirlo.

---

## 🏗️ Build de Producción

### Build Completo (Vite + Electron)

```bash
npm run build
```

**Secuencia:**

1. **Vite Build** (`vite build`)
   - Entrada: `index.html` + componentes React
   - Salida: carpeta `dist/` (HTML minificado, JS/CSS con hash)
   - Assets: imágenes, fuentes copiadas

2. **Electron Builder** (`electron-builder`)
   - Lee `package.json` → sección `build`
   - Toma `dist/**/*` y `electron/**/*`
   - Incluye `database/` como `extraResources`
   - Genera instalador en `dist-electron/`

**Resultados:**
```
dist-electron/
├── JAUV Studio Setup 2.5.0.exe    # Instalador Windows (NSIS)
└── win-unpacked/                  # Versión portable (sin instalador)
    └── resources/
        ├── app.asar               # App comprimida
        └── database/              # Copia de seeds (no DB runtime)
```

---

## ⚙️ Configuración de electron-builder

Editar `package.json` sección `build`:

```json
{
  "build": {
    "appId": "com.jauvstudio.pos",
    "productName": "JAUV Studio POS",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "dist/**/*",
      "electron/**/*"
    ],
    "extraResources": [
      {
        "from": "electron/database",
        "to": "database"
      }
    ],
    "win": {
      "icon": "img/icono.png",
      "target": ["nsis", "zip"]
    }
  }
}
```

### Opciones Clave

| Campo | Descripción |
|-------|-------------|
| `appId` | Identificador único (usado para AppData folder) |
| `productName` | Nombre que aparece en el instalador |
| `directories.output` | Dónde guardar los artefactos |
| `files` | Patrones de archivos a incluir en el ASAR |
| `extraResources` | Archivos que NO van en ASAR (se copian crudos) → aquí va la carpeta `database/` con handlers y seeds |
| `win.target` | `nsis` = instalador, `zip` = portable |

**Importante:** `extraResources` es necesario porque el código del handler debe ser legible por Electron en runtime (no comprimido en ASAR), ya que `require()` de archivos JS necesita acceso directo al filesystem.

---

## 📦 Formatos de Salida

### Windows

| Formato | Resultado | Uso |
|---------|-----------|-----|
| `nsis` (default) | `.exe` instalador | Para distribuir a clientes (registra en Agregar/Quitar Programas) |
| `zip` | `.zip` portable | Para copiar a USB o red local sin instalador |

**Tamaño aproximado:** 80-120 MB (incluye Chromium + Node).

---

### Linux

```json
"linux": {
  "target": ["AppImage", "deb"],
  "icon": "img/icono.png"
}
```

- **AppImage:** ejecutable único, portable
- **deb:** paquete para Debian/Ubuntu (instala en `/usr/bin`)

---

### macOS (futuro)

```json
"mac": {
  "target": ["dmg", "zip"],
  "icon": "img/icono.icns",
  "category": "public.app-category.business"
}
```

---

## 🔨 Personalización del Build

### Cambiar Icono

- Formato: `.ico` para Windows, `.icns` para macOS, `.png` para Linux
- Tamaños recomendados:
  - Windows: 256x256, 128x128, 64x64, 32x32, 16x16 en un `.ico`
  - macOS: .icns con múltiples resoluciones
- Ruta: `"icon": "img/icono.ico"`

**Generar:** Usar [Icon Workshaper](https://github.com/atom/atom/blob/master/scripts/icon/README.md) o herramientas en línea.

---

### Añadir Variables de Entorno

```bash
# En package.json scripts:
"build:win": "cross-env NODE_ENV=production electron-builder --win"
```

Acceso en código:
```javascript
if (process.env.NODE_ENV === 'production') {
  // Deshabilitar DevTools, logs, etc.
}
```

---

### Firma de Código (Code Signing)

Para Windows (opcional pero recomendado para evitar warnings de SmartScreen):

```json
"win": {
  "certificateFile": "path/to/cert.pfx",
  "certificatePassword": "secret"
}
```

**Obtener certificado:** Comprar a Comodo, DigiCert, Sectigo (~$100-300/año).

---

## 🚀 Despliegue

### Auto-Update (No implementado)

**Futuro:** Implementar `electron-updater` para actualizaciones automáticas desde GitHub Releases.

**Workflow:**
1. Subir `.exe` a GitHub Releases
2. App checkea nueva versión en startup
3. Descarga e instala silenciosamente

---

### Distribución Manual

**Pasos:**
1. Construir: `npm run build`
2. El instalador estará en `dist-electron/JAUV Studio Setup 2.5.0.exe`
3. Copiar a USB o servidor de descargas
4. En la tienda: ejecutar instalador en cada PC

**Post-instalación:**
- La DB se crea en `%APPDATA%\jauv-studio-pos\`
- Los datos persisten entre upgrades
- Al desinstalar, la DB **NO** se borra (por seguridad)

---

### Actualización (Upgrade)

**Qué pasa cuando instalas nueva versión sobre antigua:**
- Electron Builder detecta instalación existente
- Actualiza archivos en `C:\Program Files\JAUV Studio POS\`
- La base de datos en `AppData` queda intacta → **datos preservados**

**¡Importante!** Si cambias el esquema de DB (nuevas tablas/columnas), debes hacer migración (ver `db.js`).

---

## 🧪 Testing de Build

### Probar el ejecutable sin instalarlo

```bash
# Extraer el portable
cd dist-electron/win-unpacked
# Ejecutar directamente (sin instalar)
./resources/app.asar.unpacked/node_modules/.bin/electron.exe .
# O en Windows:
resources\app.asar.unpacked\node_modules\.bin\electron.exe .
```

**Problema:** app.asar es read-only; los handlers que escriben en DB necesitan estar en `extraResources`. Ya están configurados.

**Mejor:** Usar el instalador NSIS y probar instalación en carpeta temporal:
```bash
# Instalar en %TEMP%
dist-electron\JAUV Studio Setup 2.5.0.exe /S /D=C:\temp\jauv-test
```

---

### Verificar integridad

**Checklist post-build:**
- [ ] La app inicia sin errores en consola
- [ ] La base de datos se crea en `%APPDATA%`
- [ ] Puedes crear un producto, una venta, imprimir ticket
- [ ] Reportes generan correctamente
- [ ] Impresora detectada (si hay)
- [ ] Escáner funciona (si hay cámara)

---

## 📦 Empaquetado para Distribución

### Crear ZIP portable

```bash
# Configurar package.json
"build": {
  "win": {
    "target": "zip"
  }
}
npm run build
```

Resultado: `dist-electron/win-unpacked.zip` (descomprimir y ejecutar `electron.exe`).

---

### Crear instalador (NSIS)

```bash
# Default ya es nsis
npm run build
```

Resultado: `dist-electron/JAUV Studio Setup 2.5.0.exe`

**Ventajas:**
- Crea accesos directos
- Registra en "Agregar o quitar programas"
- Puede desinstalar

---

## 🔄 Release Process

### Versionado

**SemVer** (Semantic Versioning): `MAJOR.MINOR.PATCH`

- **MAJOR:** cambios incompatibles (ej: borrar tabla)
- **MINOR:** nuevas funcionalidades backwards-compatible
- **PATCH:** bug fixes

**Actualizar versiones:**
1. `package.json`: `"version": "2.5.0"`
2. `electron/main.js` (si tiene constante)? - no
3. Commit: `git commit -m "chore: bump version to 2.5.0"`

---

### Crear Release en GitHub

1. **Crear tag:**
```bash
git tag -a v2.5.0 -m "Release 2.5.0 - Adds barcode scanning, improved reports"
git push origin v2.5.0
```

2. **GitHub Actions** (si está configurado) automáticamente:
   - Build en múltiples platforms
   - Sube assets a GitHub Releases

3. **O manual:** Subir `.exe` a [Releases page](https://github.com/jauvstudio/pos/releases)

---

## 🐛 Debug de Build

### Build falla con "Cannot find module"

**Causa:** Dependencia no instalada correctamente.

**Solución:**
```bash
rm -rf node_modules package-lock.json
npm install
npx @electron/rebuild -f -w better-sqlite3
```

---

### Tamaño del ASAR muy grande

**Síntoma:** app.asar > 200 MB (lento para descargar).

**Solución:**
- Excluir archivos innecesarios de `files` en `build` config
- Usar `.gitignore` y `files` patterns
- No empaquetar `node_modules` completos, solo lo necesario (electron-builder lo hace automáticamente)

---

### App se inicia y cierra inmediatamente

**Verificar logs:**
```bash
# En Windows, ejecutar desde CMD para ver error:
cd "C:\ruta\jauv-test"
resources\app.asar.unpacked\node_modules\.bin\electron.exe .
```

**Errores comunes:**
- `Error: Cannot find module 'electron'` → falta rebuild
- `Database not initialized` → DB corrupta o permisos

---

## 📁 Estructura de Archivos en Instalación

### Windows (NSIS)

```
C:\Program Files\JAUV Studio POS\
├── app.asar                 # App principal comprimida
├── resources/
│   ├── database/
│   │   ├── db.js
│   │   └── handlers/
│   └── img/icono.png
└── jauv-studio-pos.exe      # Binario Electron
```

**UserData (datos del usuario):**
```
C:\Users\[Usuario]\AppData\Roaming\jauv-studio-pos\
├── jauv_pos.db              # Base de datos SQLite
└── logs/                    # (si se habilita logging)
```

---

## 🛠️ Automatización (Opcional)

### Script de Build Multiplataforma

```bash
#!/bin/bash
# build-all.sh
npm run build:win   && echo "Windows OK"
npm run build:linux && echo "Linux OK"
npm run build:mac   && echo "macOS OK"
```

**Nota:** Requiere configurar electron-builder para cada plataforma y tener工具 de firma instalados.

---

## 🔍 Verificación Final

Antes de distribuir, ejecutar:

```bash
# 1. Limpiar
git clean -fdx  # cuidado: borra node_modules, dist, etc.
npm install

# 2. Rebuild
npx @electron/rebuild -f -w better-sqlite3

# 3. Build
npm run build

# 4. Test en máquina limpia
# Copiar dist-electron a VM sin Node/Dev tools
# Ejecutar instalador
# Probar flujos básicos
```

---

## 🆘 Problemas de Build Comunes

### Error: "Cannot find module 'sqlite3'"

**Solución:** Rebuild failed. Ejecutar de nuevo:
```bash
npx @electron/rebuild -f -w better-sqlite3 --arch=x64
```

### Error: "ENOSPC: System limit for number of file watchers reached"

**Linux:** Aumentar límite de inotify:
```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Vite build tarda mucho

**Solución:** Asegurarse que no esté en modo `--debug`:
```bash
# En package.json, "build": "vite build"
```

---

## 📊 Tamaños de Build Estimados

| Plataforma | Formato | Tamaño (comprimido) | Tiempo de descarga (5 Mbps) |
|------------|---------|---------------------|-----------------------------|
| Windows NSIS | .exe | ~110 MB | ~3 minutos |
| Windows ZIP | .zip | ~105 MB | ~2.8 minutos |
| Linux AppImage | .AppImage | ~115 MB | ~3 minutos |
| macOS DMG | .dmg | ~120 MB | ~3.2 minutos |

*(varía según tamaño de node_modules)*

---

*Documento mantenido como código - actualizar con cambios en build pipeline.*
