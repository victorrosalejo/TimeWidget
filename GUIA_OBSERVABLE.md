# 📊 Guía Completa: TimeWidget con Líneas Algebraicas en Observable

Esta guía te enseñará paso a paso cómo configurar y usar TimeWidget con líneas algebraicas en Observable de manera sencilla.

## 🚀 Configuración Inicial

### 1. Importar TimeWidget en Observable

```javascript
// Celda 1: Importar la librería
TimeWidget = require("https://unpkg.com/your-timewidget@latest/dist/TimeWidget.js")
```

**O si tienes el archivo local:**
```javascript
// Celda 1: Importar desde archivo local
TimeWidget = FileAttachment("TimeWidget.js").js()
```

### 2. Importar D3 (requerido)

```javascript
// Celda 2: Importar D3
d3 = require("d3@7")
```

## 📊 Datos de Ejemplo

### Estructura de datos esperada:

```javascript
// Celda 3: Crear datos de ejemplo
data = [
  { Date: new Date("2023-01-01"), Volume: 1000, stock: "AAPL" },
  { Date: new Date("2023-01-02"), Volume: 1200, stock: "AAPL" },
  { Date: new Date("2023-01-03"), Volume: 950, stock: "AAPL" },
  { Date: new Date("2023-01-04"), Volume: 1400, stock: "AAPL" },
  { Date: new Date("2023-01-05"), Volume: 1100, stock: "AAPL" },
  { Date: new Date("2023-01-06"), Volume: 1600, stock: "AAPL" },
  { Date: new Date("2023-01-07"), Volume: 1300, stock: "AAPL" },
  // Puedes agregar más datos o múltiples stocks
  { Date: new Date("2023-01-01"), Volume: 800, stock: "GOOGL" },
  { Date: new Date("2023-01-02"), Volume: 900, stock: "GOOGL" },
  // ... más datos
]
```

### Generador automático de datos:

```javascript
// Celda 3 (alternativa): Generar datos automáticamente
data = {
  const stocks = ["AAPL", "GOOGL", "MSFT"];
  const startDate = new Date("2023-01-01");
  const days = 30;
  
  return stocks.flatMap(stock => 
    d3.range(days).map(i => ({
      Date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000),
      Volume: Math.random() * 1000 + 500 + Math.sin(i * 0.1) * 200,
      stock: stock
    }))
  );
}
```

## 🎛️ Configuración Básica del Widget

### Configuración mínima:

```javascript
// Celda 4: Widget básico
widget = {
  const div = html`<div style="width: 100%; height: 600px;"></div>`;
  
  const widget = TimeWidget(data, {
    x: "Date",           // Campo para eje X
    y: "Volume",         // Campo para eje Y  
    id: "stock",         // Campo para agrupar datos
    width: 800,          // Ancho del widget
    height: 600          // Alto del widget
  });
  
  // Agregar el widget al div
  div.appendChild(widget);
  
  return div;
}
```

### Configuración completa con opciones:

```javascript
// Celda 4 (alternativa): Widget con todas las opciones
widget = {
  const div = html`<div style="width: 100%; height: 600px;"></div>`;
  
  const widget = TimeWidget(data, {
    // === DATOS ===
    x: "Date",                    // Campo eje X
    y: "Volume",                  // Campo eje Y
    id: "stock",                  // Campo agrupación
    color: "stock",               // Campo para colores diferentes
    
    // === TAMAÑO ===
    width: 900,                   // Ancho total
    height: 600,                  // Alto total
    margin: { left: 60, top: 30, bottom: 50, right: 50 },
    
    // === ETIQUETAS ===
    xLabel: "Fecha",              // Etiqueta eje X
    yLabel: "Volumen",            // Etiqueta eje Y
    
    // === COLORES ===
    backgroundColor: "#ffffff",    // Fondo
    defaultColor: "#666",         // Color por defecto
    colorScale: d3.scaleOrdinal(d3.schemeCategory10),
    
    // === COMPORTAMIENTO ===
    showBrushesControls: true,    // Mostrar controles de selección
    showBrushTooltip: true,       // Mostrar tooltips
    showGrid: true,               // Mostrar rejilla
    autoUpdate: true,             // Actualización automática
    
    // === RENDIMIENTO ===
    maxTimelines: 100,            // Máximo número de líneas
  });
  
  div.appendChild(widget);
  return div;
}
```

## 📐 Añadir Líneas Algebraicas

### 1. Líneas Horizontales (Valores Fijos)

```javascript
// Celda 5: Líneas horizontales
{
  // Esperar a que el widget se inicialice
  setTimeout(() => {
    // Línea de volumen promedio
    widget.ts.addAlgebraicLine(() => 1000, {
      color: "#ff0000",           // Rojo
      opacity: 0.8,               // Transparencia
      strokeWidth: 2,             // Grosor de línea
      numPoints: 50               // Puntos para dibujar
    });
    
    // Línea de límite superior
    widget.ts.addAlgebraicLine(() => 1500, {
      color: "#00ff00",           // Verde
      opacity: 0.6,
      strokeWidth: 3
    });
    
    // Línea de límite inferior  
    widget.ts.addAlgebraicLine(() => 500, {
      color: "#ff8800",           // Naranja
      opacity: 0.7,
      strokeWidth: 2
    });
    
  }, 100); // Esperar 100ms para inicialización
  
  return "Líneas horizontales agregadas";
}
```

### 2. Líneas de Tendencia (Con Fechas)

```javascript
// Celda 6: Líneas de tendencia
{
  setTimeout(() => {
    // Tendencia creciente basada en tiempo
    widget.ts.addAlgebraicLine((dateObj) => {
      const baseTime = new Date("2023-01-01").getTime();
      const currentTime = dateObj.getTime();
      const days = (currentTime - baseTime) / (1000 * 60 * 60 * 24);
      
      return 800 + days * 10; // Crece 10 unidades por día
    }, {
      color: "#0066cc",
      opacity: 0.8,
      strokeWidth: 2
    });
    
    // Tendencia sinusoidal
    widget.ts.addAlgebraicLine((dateObj) => {
      const baseTime = new Date("2023-01-01").getTime();
      const currentTime = dateObj.getTime();
      const days = (currentTime - baseTime) / (1000 * 60 * 60 * 24);
      
      return 1000 + Math.sin(days * 0.2) * 200; // Onda sinusoidal
    }, {
      color: "#cc00cc",
      opacity: 0.6,
      strokeWidth: 3
    });
    
  }, 100);
  
  return "Líneas de tendencia agregadas";
}
```

### 3. Líneas Complejas (Múltiples Ecuaciones)

```javascript
// Celda 7: Líneas complejas
{
  setTimeout(() => {
    // Función exponencial suave
    widget.ts.addAlgebraicLine((dateObj) => {
      const baseTime = new Date("2023-01-01").getTime();
      const currentTime = dateObj.getTime();
      const days = (currentTime - baseTime) / (1000 * 60 * 60 * 24);
      
      return 700 + Math.exp(days * 0.05) * 50;
    }, {
      color: "#ff6600",
      opacity: 0.7,
      strokeWidth: 2
    });
    
    // Línea con condicionales
    widget.ts.addAlgebraicLine((dateObj) => {
      const day = dateObj.getDay(); // 0 = domingo, 6 = sábado
      
      // Volumen menor en fines de semana
      if (day === 0 || day === 6) {
        return 600;
      } else {
        return 1200;
      }
    }, {
      color: "#9900cc",
      opacity: 0.5,
      strokeWidth: 4
    });
    
  }, 100);
  
  return "Líneas complejas agregadas";
}
```

## 🎯 Parámetros de Configuración Detallados

### Opciones para `addAlgebraicLine`:

| Parámetro | Tipo | Por Defecto | Descripción |
|-----------|------|-------------|-------------|
| `color` | string | `"#ff0000"` | Color de la línea (hex, rgb, nombre) |
| `opacity` | number | `0.8` | Transparencia (0.0 a 1.0) |
| `strokeWidth` | number | `2` | Grosor de la línea en píxeles |
| `numPoints` | number | `100` | Número de puntos para dibujar la línea |
| `xRange` | array | `null` | Rango personalizado `[xMin, xMax]` |

### Ejemplos de colores:

```javascript
// Diferentes formas de especificar colores
widget.ts.addAlgebraicLine(equation, {
  color: "#ff0000",           // Hexadecimal
  color: "rgb(255, 0, 0)",    // RGB
  color: "red",               // Nombre
  color: "hsl(0, 100%, 50%)"  // HSL
});
```

## 🔧 Funciones de Ecuación Útiles

### Para datos con fechas:

```javascript
// Plantillas de funciones útiles

// 1. Línea horizontal simple
(dateObj) => 1000

// 2. Tendencia lineal
(dateObj) => {
  const days = (dateObj - new Date("2023-01-01")) / (1000 * 60 * 60 * 24);
  return 500 + days * 20;
}

// 3. Ciclo semanal
(dateObj) => {
  const dayOfWeek = dateObj.getDay();
  return 800 + Math.sin(dayOfWeek * Math.PI / 3) * 200;
}

// 4. Ciclo mensual
(dateObj) => {
  const dayOfMonth = dateObj.getDate();
  return 1000 + Math.cos(dayOfMonth * Math.PI / 15) * 150;
}

// 5. Función exponencial
(dateObj) => {
  const days = (dateObj - new Date("2023-01-01")) / (1000 * 60 * 60 * 24);
  return 600 + Math.exp(days * 0.03) * 100;
}
```

## 🚨 Solución de Problemas Comunes

### ❌ Error: "No aparece la línea"

**Solución:**
```javascript
// Asegúrate de esperar a la inicialización
setTimeout(() => {
  widget.ts.addAlgebraicLine(equation, options);
}, 100);
```

### ❌ Error: "La línea se sale del gráfico"

**Solución:**
```javascript
// Verifica el rango de Y de tus datos
console.log("Rango Y:", widget.extent.y);

// Ajusta tu ecuación para estar en ese rango
widget.ts.addAlgebraicLine((dateObj) => {
  const result = tuEcuacion(dateObj);
  // Limitar al rango visible
  const [minY, maxY] = widget.extent.y;
  return Math.max(minY, Math.min(maxY, result));
});
```

### ❌ Error: "TypeError con fechas"

**Solución:**
```javascript
// Asegúrate de que tu función maneja fechas correctamente
widget.ts.addAlgebraicLine((dateObj) => {
  // Verificar que dateObj es una fecha
  if (!(dateObj instanceof Date)) {
    console.warn("No es una fecha:", dateObj);
    return 1000; // Valor por defecto
  }
  
  // Tu lógica aquí...
  return resultado;
});
```

## 📱 Ejemplo Completo Funcional

```javascript
// === NOTEBOOK COMPLETO DE EJEMPLO ===

// Celda 1: Imports
TimeWidget = require("path/to/TimeWidget.js")
d3 = require("d3@7")

// Celda 2: Datos
data = {
  const startDate = new Date("2023-01-01");
  return d3.range(30).map(i => ({
    Date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000),
    Volume: 800 + Math.random() * 400 + Math.sin(i * 0.3) * 100,
    stock: "DEMO"
  }));
}

// Celda 3: Widget con líneas
widget = {
  const div = html`<div style="width: 100%; height: 600px;"></div>`;
  
  const widget = TimeWidget(data, {
    x: "Date",
    y: "Volume",
    id: "stock",
    width: 900,
    height: 600,
    xLabel: "Fecha",
    yLabel: "Volumen",
    showGrid: true
  });
  
  // Agregar líneas después de inicialización
  setTimeout(() => {
    // Línea promedio
    widget.ts.addAlgebraicLine(() => 1000, {
      color: "#ff0000",
      opacity: 0.8,
      strokeWidth: 2
    });
    
    // Tendencia creciente
    widget.ts.addAlgebraicLine((date) => {
      const days = (date - new Date("2023-01-01")) / (1000 * 60 * 60 * 24);
      return 700 + days * 15;
    }, {
      color: "#00cc00",
      opacity: 0.6,
      strokeWidth: 3
    });
    
  }, 100);
  
  div.appendChild(widget);
  return div;
}
```

## 🎨 Tips Avanzados

### 1. Múltiples líneas con bucle:
```javascript
// Agregar múltiples líneas de soporte/resistencia
const levels = [500, 750, 1000, 1250, 1500];
const colors = ["#ff0000", "#ff8800", "#ffff00", "#88ff00", "#00ff00"];

levels.forEach((level, i) => {
  widget.ts.addAlgebraicLine(() => level, {
    color: colors[i],
    opacity: 0.5,
    strokeWidth: 1
  });
});
```

### 2. Líneas dinámicas basadas en datos:
```javascript
// Calcular promedio de los datos y agregar línea
const avgVolume = d3.mean(data, d => d.Volume);
widget.ts.addAlgebraicLine(() => avgVolume, {
  color: "#0066cc",
  opacity: 0.8,
  strokeWidth: 3
});
```

### 3. Líneas con rangos específicos:
```javascript
// Línea solo para parte del gráfico
widget.ts.addAlgebraicLine((date) => {
  const targetDate = new Date("2023-01-15");
  if (date < targetDate) {
    return null; // No dibujar antes de esta fecha
  }
  return 1200;
}, {
  color: "#cc00cc",
  opacity: 0.7
});
```

¡Con esta guía deberías poder configurar y usar las líneas algebraicas sin problemas! 🚀
