# Cómo Contribuir

¡Gracias por interesarte en mejorar JAUV Studio POS! Este documento establece las pautas para contribuir al proyecto.

---

## 🤝 Formas de Contribuir

### Reportar Bugs

Si encuentras un error:

1. **Buscar** si ya existe un issue similar
2. **Crear nuevo issue** con:
   - Título claro: `[BUG] Descripción corta`
   - Pasos para reproducir (minimal reproducible example)
   - Comportamiento esperado vs. actual
   - Environment: OS, Node version, versión de la app
   - Logs/consola (capturas de pantalla)

### Sugerir Features

Para nuevas funcionalidades:

1. Abrir issue con etiqueta `enhancement`
2. Describir el problema que soluciona
3. Propuesta de solución (mockups opcional)
4. Discutir con maintainers antes de implementar

### Pull Requests

1. **Fork** el repositorio
2. **Crear rama** desde `develop`: `git checkout -b feature/mi-mejora`
3. **Codificar** siguiendo estándares
4. **Testear** manualmente (ver checklist)
5. **Commit** con mensaje convencional: `type(scope): description`
6. **Push** a tu fork
7. **Abrir PR** contra rama `develop`

---

## 📐 Estándares de Código

### Estilo

- **Indentación:** 2 espacios
- **Punto y coma:** **NO** usar (excepto en for loops)
- **Comillas:** simples `'` para strings, excepto JSX: `"` en atributos
- **Líneas máx:** 100 caracteres
- **Trailing commas:** Sí, en objects/arrays multilínea

**Ejemplo:**
```javascript
// Bueno
const user = {
  name: 'Juan',
  age: 30,
}

// Malo
const user = {"name":"Juan","age":30};
```

### Naming

| Tipo | Convención | Ejemplo |
|------|-------------|---------|
| Archivos (React) | PascalCase | `POS.jsx` |
| Archivos (handlers) | snake_case | `productos.js` |
| Componentes | PascalCase | `function ProductoModal()` |
| Funciones/vars | camelCase | `const totalVentas` |
| Constantes | UPPER_SNAKE_CASE | `const API_PORT = 3001` |
| Clases | PascalCase | `class AppProvider` |

### Imports

**Orden:**
1. Node modules (alfabético)
2. Third-party modules (alphabetic)
3. Internal modules (relative paths)

```javascript
import React, { useState } from 'react'
import { LuShoppingCart } from 'react-icons/lu'
import { format } from 'date-fns'

import { useApp } from '../context/AppContext.jsx'
import AlertModal from '../components/AlertModal.jsx'
```

### Comentarios

**Usar comentarios solo cuando la lógica no sea obvia.**

✅ Bueno:
```javascript
// BEGIN TRANSACTION - descuento de stock y registro de venta son atómicos
await db.run('BEGIN')
```

❌ Malo:
```javascript
// Incrementa contador
counter++
```

---

## 🔍 Code Review

Todo PR requiere al menos **1 review approval** antes de merge.

**Reviewers checkean:**
- ✅ Funciona según lo prometido
- ✅ No rompe funcionalidad existente
- ✅ Cumple estándares de código
- ✅ Tests manuales pasados
- ✅ Documentación actualizada (si aplica)

---

## 📝 Commits

Seguir [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>
<body>
<footer>
```

**Types:**
- `feat:` nueva funcionalidad (minor)
- `fix:` corrección de bug (patch)
- `docs:` cambios solo en documentación
- `style:` formateo, sin cambio funcional
- `refactor:` refactorización sin add functionality
- `test:` añadir/modificar tests
- `chore:` tareas de mantenimiento (deps, build)

**Examples:**
```
fix(ventas): corrige cálculo de vuelto con pagos mixtos
feat(inventario): añade filtro por categoría en grid
docs: actualiza guía de usuario con nuevo flujo de escaneo
refactor(handlers): extrae lógica de validación a helper
```

---

## 🗂️ Estructura de Archivos (para nuevos módulos)

Si añades un nuevo módulo (ej: "Proveedores"):

```
electron/database/handlers/proveedores.js   ← handler IPC
src/pages/Proveedores.jsx                  ← página React
# Actualizar:
# - electron/main.js (require del handler)
# - src/App.jsx (nueva ruta)
# - NAV_ITEMS en App.jsx (nuevo icono + label)
```

---

## 🧪 Testing (Requirement)

Todo PR debe incluir **evidencia de testing manual**:

- Lista de pasos realizados
- Resultados esperados vs. reales
- Screenshots si hay cambios de UI

**Template:**
```markdown
### Testing
- [ ] Crear producto → aparece en búsqueda
- [ ] Editar precio → se actualiza en POS
- [ ] ... (según cambio)
```

---

## 🔄 Pull Request Process

1. **Abrir PR** desde tu rama feature hacia `develop`
2. **Descripción** clara: qué cambia, por qué, cómo
3. **Vincula** el issue correspondiente (si existe) con `Fixes #123`
4. **Espera review** (máximo 48h)
5. **Soluciona comentarios** (si hay) → push commits adicionales
6. **Merge** una vez aprobado (squash and merge recomendado)
7. **Borrar rama** después de merge

---

## 🚫 Qué NO hacer

- ❌ No committear datos sensibles ( passwords, API keys)
- ❌ No subir `node_modules/`, `dist/`, `dist-electron/` (ya en .gitignore)
- ❌ No modificar DB schema sin migración (ver `db.js:187+`)
- ❌ No hacer `force push` a ramas compartidas (`main`, `develop`)
- ❌ No mergear sin aprobación

---

## 📚 Recursos

- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Electron Security Guidelines](https://www.electronjs.org/docs/latest/tutorial/security)
- [React Best Practices](https://react.dev/learn/thinking-in-react)

---

## 🎯 Preguntas?

- **Discusiones técnicas:** Abrir GitHub Discussion
- **Bugs urgentes:** Etiquetar con `bug` y `priority: high`
- **Features grandes:** Sugerir issue primero antes de codificar

¡Happy coding! 🚀
