# Pruebas TFG — TimeWidget

Herramientas HTML para la validación funcional y el benchmark de rendimiento de la memoria del TFG.

---

## Requisitos previos

| Requisito | Versión mínima |
|-----------|---------------|
| Node.js   | 18 LTS        |
| npm       | incluido con Node |
| Google Chrome | cualquier versión reciente con WebGPU activo |

---

## 1. Instalar dependencias

Desde la **raíz del repositorio** (`TimeWidget/`):

```bash
npm install
```

---

## 2. Compilar el bundle

Los archivos HTML cargan `../../dist/TimeWidget.js`. Hay que generarlo antes de abrir cualquier página:

```bash
npm run build
```

Esto genera `dist/TimeWidget.js`, `dist/TimeWidget.esm.js` y `dist/TimeWidget.min.js`.

> Si haces cambios en el código fuente (`src/`), vuelve a ejecutar `npm run build` antes de recargar el HTML.

---

## 3. Servir los archivos en local

Los archivos usan `<script type="module">` y WebGPU, por lo que **no se pueden abrir directamente** con `file://`. Necesitan un servidor HTTP local.

### Opción A — extensión VS Code (recomendada)

Instala **Live Server** en VS Code, haz clic derecho sobre el archivo HTML → *Open with Live Server*.

### Opción B — npx (sin instalar nada)

Desde la raíz del repositorio:

```bash
npx serve .
```

Luego abre en Chrome:
```
http://localhost:3000/example/tfgExamples/validacionFuncional.html
http://localhost:3000/example/tfgExamples/benchmark_rendimiento.html
```

### Opción C — Python (si lo tienes instalado)

```bash
python -m http.server 8080
```

Luego abre:
```
http://localhost:8080/example/tfgExamples/validacionFuncional.html
```

---

## 4. Archivos disponibles

| Archivo | Descripción |
|---------|-------------|
| `validacionFuncional.html` | 8 escenarios de validación funcional (E1–E8). Requiere interacción manual. |
| `benchmark_rendimiento.html` | Benchmark automático Canvas 2D vs WebGPU. Genera filas LaTeX. |

---

## 5. Verificar que WebGPU está activo

Abre `chrome://gpu` en Chrome y comprueba que la línea **WebGPU** dice `Hardware accelerated`.

Si aparece `Disabled` o `Software only`, prueba con:

```
chrome --enable-unsafe-webgpu --enable-features=Vulkan
```

---

## 6. Flujo de trabajo típico para la memoria

```
npm install
npm run build
npx serve .
```

1. Abre `validacionFuncional.html` → ejecuta E1–E8 → anota los conteos → pulsa "Verificar".
2. Abre `benchmark_rendimiento.html` → pulsa **"⟳ Medir todos"** → espera → copia las filas LaTeX.
