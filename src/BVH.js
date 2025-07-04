import { log } from "./utils.js";
import * as d3 from "d3";


/*Data is an array of the next form
[
  [id,[[x0,y0],[x1,y1]...]]
  .
  .
  .
]
 */
function BVH({
  data,
  xPartitions = 10,
  yPartitions = 10,
  polylines = true,
}) {
  let me = {};
  let BVH = makeBVH();


   
  // Función auxiliar para calcular celdas BVH usando lógica de pupulateBVHPolylines
  function calculateBVHCells(extractedPoints) {
    console.log("Calculando celdas BVH para puntos extraídos:", extractedPoints);
    let xinc = BVH.xinc;
    let yinc = BVH.yinc;
    let cellsInfo = [];
    extractedPoints.forEach((d, index) => {
      let xCoor = d[0] - BVH.offsetX;
      let yCoor = d[1] - BVH.offsetY;
     console.log("Offset",BVH.offsetX, BVH.offsetY);
      if (xCoor != null && yCoor != null) {
        let xIndex = Math.floor(xCoor / xinc);
        let yIndex = Math.floor(yCoor / yinc);
        console.log("Calculando celda para punto:", "-> Índices:", xIndex, yIndex);
        
        if (isNaN(xIndex) || isNaN(yIndex)) {
          log("ERROR: xIndex or YIndex is NaN: XCoor: " + xCoor + "; yCoor: " + yCoor);
        }

        // Verificar límites (igual que en pupulateBVHPolylines)
        let isValid = xIndex >= 0 && xIndex < BVH.BVH.length &&
                      yIndex >= 0 && yIndex < BVH.BVH[0].length;

        cellsInfo.push({
          pointIndex: index,
          point: d,
          cellIndices: [xIndex, yIndex],
          originalCoords: [d[0], d[1]],
          adjustedCoords: [xCoor, yCoor],
          isValid: isValid,
          cell: isValid ? BVH.BVH[xIndex][yIndex] : null
        });
      } else {
        // Manejar coordenadas nulas
        cellsInfo.push({
          pointIndex: index,
          point: d,
          cellIndices: [null, null],
          originalCoords: [d[0], d[1]],
          adjustedCoords: [xCoor, yCoor],
          isValid: false,
          cell: null
        });
      }
    });

    return cellsInfo;
  }


  function pupulateBVHPolylines(data, BVH) {
    console.log("Poblando BVH con polilíneas:", data,BVH);
    let xinc = BVH.xinc;
    let yinc = BVH.yinc;
    data.forEach((d) => {
      let key = d[0];
      let lastXindex = -1;
      let lastYindex = -1;
      for (let i = 0; i < d[1].length; ++i) {
        let current = d[1][i];
        let xCoor = current[0];
        let yCoor = current[1];
        log("ERROR: xIndex or YIndex is NaN: XCoor: " + xCoor +"; yCoor: " + yCoor );
        if (xCoor != null && yCoor != null) {
          let xIndex = Math.floor(xCoor / xinc);
          let yIndex = Math.floor(yCoor / yinc);
          console.log("Calculando celda para punto:", "-> Índices:", xIndex, yIndex);
          if (isNaN(xIndex) || isNaN(yIndex)) {
            log("ERROR: xIndex or YIndex is NaN: XCoor: " + xCoor +"; yCoor: " + yCoor );
          }

          if (i === 0) {
            BVH.BVH[xIndex][yIndex].data.set(key, [[current]]);
          } else {
            if (xIndex === lastXindex && yIndex === lastYindex) {
              BVH.BVH[xIndex][yIndex].data.get(key).at(-1).push(current);
            } else {
              let previousCell = BVH.BVH[lastXindex][lastYindex];
              previousCell.data.get(key).at(-1).push(current);
              let previous = d[1][i - 1];
              for (let row of BVH.BVH) {
                for (let cell of row) {
                  if (cell !== previousCell) {
                    if (
                      lineIntersection(
                        [previous, current],
                        cell.x0,
                        cell.y0,
                        cell.x1,
                        cell.y1
                      )
                    ) {
                      if (cell.data.has(key)) {
                        cell.data.get(key).push([previous]);
                        cell.data.get(key).at(-1).push(current);
                      } else {
                        cell.data.set(key, [[previous]]);
                        cell.data.get(key).at(-1).push(current);
                      }
                    }
                  }
                }
              }
            }
          }
          
          lastXindex = xIndex;
          lastYindex = yIndex;
        }
      }
    });
  }

  function populateBVHPoints(data, BVH) {
    let xinc = BVH.xinc;
    let yinc = BVH.yinc;
    data.forEach(d => {
      let key = d[0];
      for (let point of d[1]) {
        let [x, y] = point;
        let Iindex = Math.floor(x / xinc);
        let Jindex = Math.floor(y / yinc);
        console.log("Calculando celda para punto:", point, "-> Índices:", Iindex, Jindex);
        let cell = BVH.BVH[Iindex][Jindex];

        if (cell.data.has(key)) {
          cell.data.get(key).push([x,y]);
        } else {
          cell.data.set(key,[x,y]);
        }
      }
    });
  }

  function makeBVH() {
    let keys = data.map((d) => d[0]);
    let allValues = data.map(d => d[1]).flat();
    let extentX = d3.extent(allValues, d => d[0]);
    let extentY = d3.extent(allValues, d => d[1]);
    console.log("Extent X:", extentX, "Extent Y:", extentY);
    let width = (extentX[1] - extentX[0]) + 1;
    let height = (extentY[1] - extentY[0]) + 1;
    let xinc = width / xPartitions;
    let yinc = height / yPartitions;
    let BVH = {
      width: width,
      height: height,
      xinc: xinc,
      yinc: yinc,
      offsetX: extentX[0],
      offsetY: extentY[0],
      keys: keys,
      BVH: [],
    };

    for (let i = 0; i < xPartitions; ++i) {
      BVH.BVH[i] = [];
      let currentX = i * xinc;
      for (let j = 0; j < yPartitions; ++j) {
        let currentY = yinc * j;
        BVH.BVH[i][j] = {
          x0: currentX,
          x1: currentX + xinc,
          y0: currentY,
          y1: currentY + yinc,
          data: new Map(),
        };
      }
    }

    // Move the data to start at coordinates [0,0]
    data = data.map(([k, v]) => [k, v.map(([x, y]) => [x - BVH.offsetX, y - BVH.offsetY])]);
    

    if (polylines)
      pupulateBVHPolylines(data, BVH);
    else
      populateBVHPoints(data, BVH);

    return BVH;
  }

  function pointIntersection(point, x0, y0, x1, y1) {
    let [px,py] = point;
    return px >= x0 && px <= x1 && py >= y0 && py <= y1;
  }

  //Calculate the intersection with the first vertical line of the box.
  function intersectX0(initPoint, finalPoint, x0, y0, x1, y1) {
    let intersectX0 =
      (initPoint[0] <= x0 && finalPoint[0] >= x0) ||
      (initPoint[0] >= x0 && finalPoint[0] <= x0);
    if (intersectX0) {
      let m = (finalPoint[1] - initPoint[1]) / (finalPoint[0] - initPoint[0]);
      let y = m * (x0 - initPoint[0]) + initPoint[1];
      return y >= y0 && y <= y1;
    }
    return false;
  }

  function intersectX1(initPoint, finalPoint, x0, y0, x1, y1) {
    let intersectX1 =
      (initPoint[0] <= x1 && finalPoint[0]) >= x1 ||
      (initPoint[0] >= x1 && finalPoint[0] <= x1);
    if (intersectX1) {
      let m = (finalPoint[1] - initPoint[1]) / (finalPoint[0] - initPoint[0]);
      let y = m * (x1 - initPoint[0]) + initPoint[1];
      return y >= y0 && y <= y1;
    }
    return false;
  }

  function intersectY0(initPoint, finalPoint, x0, y0, x1, y1) {
    let intersectY0 =
      (initPoint[1] <= y0 && finalPoint[1] >= y0) ||
      (initPoint[1] >= y0 && finalPoint[1] <= y0);
    if (intersectY0) {
      let m = (finalPoint[1] - initPoint[1]) / (finalPoint[0] - initPoint[0]);
      let x = (y0 - initPoint[1]) / m + initPoint[0];
      return x >= x0 && x <= x1;
    }
    return false;
  }

  function intersectY1(initPoint, finalPoint, x0, y0, x1, y1) {
    let intersectY1 =
      (initPoint[1] >= y1 && finalPoint[1] <= y1) ||
      (initPoint[1] <= y1 && finalPoint[1] >= y1);
    if (intersectY1) {
      let m = (finalPoint[1] - initPoint[1]) / (finalPoint[0] - initPoint[0]);
      let x = (y1 - initPoint[1]) / m + initPoint[0];
      return x >= x0 && x <= x1;
    }
    return false;
  }

  function lineIntersection(line, x0, y0, x1, y1) {
    let initPoint = line[0];

    for (let index = 1; index < line.length; ++index) {
      let finalPoint = line[index];
      if (intersectX0(initPoint, finalPoint, x0, y0, x1, y1)) return true;
      if (intersectX1(initPoint, finalPoint, x0, y0, x1, y1)) return true;
      if (intersectY0(initPoint, finalPoint, x0, y0, x1, y1)) return true;
      if (intersectY1(initPoint, finalPoint, x0, y0, x1, y1)) return true;
      initPoint = finalPoint;
    }
    return pointIntersection(initPoint, x0, y0, x1, y1);
  }

  function containIntersection(line, x0, y0, x1, y1) {
    let initPoint = line[0];
    let finalPoint = line[line.length - 1];
    let isIntersectX0 = false;
    let isIntersectX1 = false;

    if (initPoint[0] < x0 && finalPoint[0] < x0) return undefined;
    if (initPoint[0] > x1 && finalPoint[0] > x1) return undefined;

    for (let index = 1; index < line.length; ++index) {
      let finalPoint = line[index];
      if (isIntersectX0 || intersectX0(initPoint, finalPoint, x0, y0, x1, y1)) isIntersectX0 = true;
      if (isIntersectX1 || intersectX1(initPoint, finalPoint, x0, y0, x1, y1)) isIntersectX1 = true;
      if (intersectY0(initPoint, finalPoint, x0, y0, x1, y1)) return false;
      if (intersectY1(initPoint, finalPoint, x0, y0, x1, y1)) return false;
      initPoint = finalPoint;
    }

    let isAllLineInside = !isIntersectX0 && !isIntersectX1;
    if (isAllLineInside) {
      return pointIntersection(line[0], x0, y0, x1, y1);
    }

    return true;
  }

  // Returns the range of cells that collide with the given box. The result is of the form [[InitI,EndI],[INiJ, EndJ]]]
  function getCollidingCells(x0, y0, x1, y1) {
    if (x1 > BVH.width || y1 > BVH.height || x0 < 0 || y0 < 0)
      log("👁️ BVH is called off limits", [
        [x0, y0],
        [x1, y1],
      ]);

    // Esure that the coordinates are in the limits oh the BVH
    x1 = Math.min(x1, BVH.width - 1);
    y1 = Math.min(y1, BVH.height - 1);
    x0 = Math.max(x0, 0);
    y0 = Math.max(y0, 0);

    let initI = Math.floor(x0 / BVH.xinc);
    let finI = Math.floor(x1 / BVH.xinc);
    let initJ = Math.floor(y0 / BVH.yinc);
    let finJ = Math.floor(y1 / BVH.yinc);
    return [[initI, finI], [initJ, finJ]];
  }

  //
  function applyOffsets(x0, y0, x1, y1) {
    return [x0 - BVH.offsetX, y0 - BVH.offsetY, x1 - BVH.offsetX, y1 - BVH.offsetY];
  }

  // Returns all the polylines that satisfy the function "testFunc" for a complete polyline. The function testFunct must be as follows
  // TestFunc( Entity, x0, x1,y0,y1). Where entity is a polyline and return true, false or undefined if the result of the cuerrent entity dosent matter
  function testsEntitiesAll(x0, y0, x1, y1, testFunc) {
    [x0, y0, x1, y1] = applyOffsets(x0, y0, x1, y1);
    let [[initI, finI], [initJ, finJ]] = getCollidingCells(x0, y0, x1, y1);

    let contains = new Set();
    let notContains = new Set();


    for (let i = initI; i <= finI; ++i)
      for (let j = initJ; j <= finJ; ++j)
        for (const entities of BVH.BVH[i][j].data)
          if (!notContains.has(entities[0])){
            for (const entity of entities[1]) {
              let intersect = testFunc(entity, x0, y0, x1, y1);
              if (intersect !== undefined) {
                if (intersect) {
                  contains.add(entities[0]);
                } else {
                  notContains.add(entities[0]);
                }
              }
            }
          }

    notContains.forEach(d => contains.delete(d));

    return contains;

  }

  // Returns all the polylines that satisfy the function "testFunc" for any piece of polyline. The function testFunct must be as follows
  // TestFunc( Entity, x0, x1,y0,y1). Where entity is a polyline.
  function testsEntitiesAny(x0, y0, x1, y1, testFunc) {
    [x0, y0, x1, y1] = applyOffsets(x0, y0, x1, y1);
    let [[initI, finI], [initJ, finJ]] = getCollidingCells(x0, y0, x1, y1);

    let intersections = new Set();

    for (let i = initI; i <= finI; ++i)
      for (let j = initJ; j <= finJ; ++j)
        for (const entities of BVH.BVH[i][j].data)
          if (!intersections.has(entities[0]))
            for (const entity of entities[1]) {
              let intersect = testFunc(entity, x0, y0, x1, y1);
              if (intersect) {
                intersections.add(entities[0]);
                break;
              }
            }

    return intersections;
  }

  me.contains = function(x0, y0, x1, y1) {
    return testsEntitiesAll(x0, y0, x1, y1, containIntersection);
  };


  me.intersect = function(x0, y0, x1, y1) {
    return testsEntitiesAny(x0, y0, x1, y1, lineIntersection);
  };



  // Método para procesar y simplificar líneas de referencia
me.processReferenceLine = function(curve, lineId = "ref_line", overviewX = null, overviewY = null) {
  if (!curve) {
    log("❌ Error: Curva no válida");
    return null;
  }
  
  let gloablNumPoints = 100;  //MIRAR SI CONFIGURAR EL NUMERO DE PUTNOS DE LA CURVA

  // Identificar tipo de curva y extraer puntos
  let extractedPoints = extractPointsFromCurve(curve, gloablNumPoints);
  
  if (!extractedPoints || extractedPoints.length === 0) {
    log("❌ Error: No se pudieron extraer puntos de la curva");
    return null;
  }
  
  // Imprimir en formato original de data
  printCurveAnalysis(lineId, curve, extractedPoints, overviewX, overviewY);
  
  return extractedPoints;
};

// Función para extraer puntos según el tipo de curva
function extractPointsFromCurve(curve, numPoints = gloablNumPoints) {
  let points = [];
  
  // Tipo 1: Datos directos
  if (curve.data && Array.isArray(curve.data)) {
    log(`📊 Curva tipo: DATOS DIRECTOS (${curve.data.length} puntos)`);
    // Tomar muestra uniforme de los puntos existentes
    points = samplePoints(curve.data, numPoints);
  }
  
  // Tipo 2: Función matemática
  else if (curve.func && typeof curve.func === 'function') {
    log(`📊 Curva tipo: FUNCIÓN MATEMÁTICA`);
    let xMin = curve.domain ? curve.domain[0] : 0;
    let xMax = curve.domain ? curve.domain[1] : 10;
    points = generateFunctionPoints(curve.func, xMin, xMax, numPoints);
  }
  
  // Tipo 3: Curva paramétrica
  else if (curve.xFunc && curve.yFunc && 
           typeof curve.xFunc === 'function' && 
           typeof curve.yFunc === 'function') {
    log(`📊 Curva tipo: CURVA PARAMÉTRICA`);
    let tMin = curve.tRange ? curve.tRange[0] : 0;
    let tMax = curve.tRange ? curve.tRange[1] : 2 * Math.PI;
    points = generateParametricPoints(curve.xFunc, curve.yFunc, tMin, tMax, numPoints);
  }
  
  // Tipo 4: Polinomio por coeficientes
  else if (curve.coefficients && Array.isArray(curve.coefficients)) {
    log(`📊 Curva tipo: POLINOMIO (grado ${curve.coefficients.length - 1})`);
    let xMin = curve.domain ? curve.domain[0] : 0;
    let xMax = curve.domain ? curve.domain[1] : 10;
    points = generatePolynomialPoints(curve.coefficients, xMin, xMax, numPoints);
  }
  
  else {
    log(`❌ Tipo de curva no reconocido`);
    return null;
  }
  
  return points;
}

// Función para muestrear puntos uniformemente
function samplePoints(originalPoints, numPoints) {
  if (originalPoints.length <= numPoints) return originalPoints;
  
  let step = (originalPoints.length - 1) / (numPoints - 1);
  let sampled = [];
  
  for (let i = 0; i < numPoints; i++) {
    let index = Math.round(i * step);
    sampled.push(originalPoints[index]);
  }



  return sampled;
}

// Función para generar puntos de función matemática
function generateFunctionPoints(func, xMin, xMax, numPoints) {
  let points = [];
  let step = (xMax - xMin) / (numPoints - 1);
  
  for (let i = 0; i < numPoints; i++) {
    let x = xMin + i * step;
    try {
      let y = func(x);
      if (isFinite(y) && !isNaN(y)) {
        points.push([x, y]);
      }
    } catch (e) {
      log(`⚠️ Error evaluando función en x=${x}`);
    }
  }
  
  return points;
}

// Función para generar puntos de curva paramétrica
function generateParametricPoints(xFunc, yFunc, tMin, tMax, numPoints) {
  let points = [];
  let step = (tMax - tMin) / (numPoints - 1);
  
  for (let i = 0; i < numPoints; i++) {
    let t = tMin + i * step;
    try {
      let x = xFunc(t);
      let y = yFunc(t);
      if (isFinite(x) && isFinite(y) && !isNaN(x) && !isNaN(y)) {
        points.push([x, y]);
      }
    } catch (e) {
      log(`⚠️ Error evaluando funciones paramétricas en t=${t}`);
    }
  }
  
  return points;
}

// Función para generar puntos de polinomio
function generatePolynomialPoints(coefficients, xMin, xMax, numPoints) {
  let points = [];
  let step = (xMax - xMin) / (numPoints - 1);
  
  for (let i = 0; i < numPoints; i++) {
    let x = xMin + i * step;
    let y = 0;
    
    // Evaluar polinomio: y = a0 + a1*x + a2*x² + ...
    for (let j = 0; j < coefficients.length; j++) {
      y += coefficients[j] * Math.pow(x, j);
    }
    
    if (isFinite(y) && !isNaN(y)) {
      points.push([x, y]);
    }
  }
  
  return points;
}

// Función para imprimir análisis de curva
function printCurveAnalysis(lineId, curve, extractedPoints, overviewX = null, overviewY = null) {
  console.log(`\n🔍 ANÁLISIS DE CURVA DE REFERENCIA: ${lineId}`);
  console.log(`📋 Tipo identificado: ${getCurveType(curve)}`);
  console.log(`📏 Puntos extraídos (${extractedPoints.length}):`);
  
  console.log(`🎯 ANÁLISIS DE CELDAS BVH USANDO pupulateBVHPolylines:`);
  
  // TRANSFORMAR puntos usando las escalas del BVH (simulando la transformación D3)
  console.log(`🔄 Transformando puntos de coordenadas originales a espacio BVH...`);
  let transformedPoints = extractedPoints.map(point => {
    let [origX, origY] = point;
    
    let transformedX, transformedY;
    
    if (overviewX && overviewY) {
      // Aplicar las escalas D3 como hace TimeWidget
      transformedX = overviewX(origX);
      transformedY = overviewY(origY);
      console.log(`  Punto [${origX.toFixed(3)}, ${origY.toFixed(3)}] → Escalado [${transformedX.toFixed(3)}, ${transformedY.toFixed(3)}]`);
    } else {
      // Sin escalas, usar coordenadas originales
      transformedX = origX;
      transformedY = origY;
      console.log(`  ⚠️ Sin escalas disponibles, usando punto original: [${origX.toFixed(3)}, ${origY.toFixed(3)}]`);
    }
    
    return [transformedX, transformedY];
  });
  
  // Formatear los puntos transformados como polilínea para pupulateBVHPolylines
  // Formato: [[id, [[x0,y0],[x1,y1]...]]]
  let polylineData = [[lineId, transformedPoints]];
  
  // Crear una copia temporal del BVH para hacer el análisis sin afectar el original
  let tempBVH = JSON.parse(JSON.stringify(BVH));
  
  // Limpiar datos de la copia temporal
  for (let i = 0; i < tempBVH.BVH.length; i++) {
    for (let j = 0; j < tempBVH.BVH[i].length; j++) {
      tempBVH.BVH[i][j].data = new Map();
    }
  }
  
  // Usar pupulateBVHPolylines para detectar celdas
  console.log(`📌 Llamando pupulateBVHPolylines con datos transformados:`, polylineData);
  pupulateBVHPolylines(polylineData, tempBVH);
  
  // Analizar resultados
  let cellsOccupied = new Map();
  let totalSegments = 0;
  
  for (let i = 0; i < tempBVH.BVH.length; i++) {
    for (let j = 0; j < tempBVH.BVH[i].length; j++) {
      let cell = tempBVH.BVH[i][j];
      if (cell.data.has(lineId)) {
        let segments = cell.data.get(lineId);
        let cellKey = `[${i},${j}]`;
        
        cellsOccupied.set(cellKey, {
          cellIndices: [i, j],
          segmentCount: segments.length,
          segments: segments,
          cellBounds: {
            x0: cell.x0,
            y0: cell.y0,
            x1: cell.x1,
            y1: cell.y1
          }
        });
        
        totalSegments += segments.length;
        
        console.log(`  ✅ Celda [${i},${j}]: ${segments.length} segmento(s)`);
        console.log(`     Límites: x[${cell.x0.toFixed(3)}, ${cell.x1.toFixed(3)}], y[${cell.y0.toFixed(3)}, ${cell.y1.toFixed(3)}]`);
        
        // Mostrar algunos puntos de los segmentos
        segments.slice(0, 2).forEach((segment, segIdx) => {
          console.log(`     Segmento ${segIdx + 1}: ${segment.length} puntos`);
          if (segment.length > 0) {
            let first = segment[0];
            let last = segment[segment.length - 1];
            console.log(`       Inicio: [${first[0].toFixed(3)}, ${first[1].toFixed(3)}]`);
            if (segment.length > 1) {
              console.log(`       Final:  [${last[0].toFixed(3)}, ${last[1].toFixed(3)}]`);
            }
          }
        });
        
        if (segments.length > 2) {
          console.log(`     ... y ${segments.length - 2} segmentos más`);
        }
      }
    }
  }
  
  console.log(`\n📊 RESUMEN DE ANÁLISIS CON pupulateBVHPolylines:`);
  console.log(`Total de celdas ocupadas: ${cellsOccupied.size}`);
  console.log(`Total de segmentos detectados: ${totalSegments}`);
  
  if (cellsOccupied.size === 0) {
    console.log(`⚠️ No se detectaron celdas ocupadas. Verificar:`);
    console.log(`  - Puntos originales:`, extractedPoints.slice(0, 3).map(p => `[${p[0].toFixed(3)}, ${p[1].toFixed(3)}]`));
    console.log(`  - Offsetts BVH: X=${BVH.offsetX}, Y=${BVH.offsetY}`);
    console.log(`  - Dimensiones BVH: ${BVH.width} x ${BVH.height}`);
    console.log(`  - Incrementos: xinc=${BVH.xinc.toFixed(3)}, yinc=${BVH.yinc.toFixed(3)}`);
  }
}

// Función auxiliar para identificar tipo de curva
function getCurveType(curve) {
  if (curve.data && Array.isArray(curve.data)) return "DATOS DIRECTOS";
  if (curve.func && typeof curve.func === 'function') return "FUNCIÓN MATEMÁTICA";
  if (curve.xFunc && curve.yFunc) return "CURVA PARAMÉTRICA";
  if (curve.coefficients && Array.isArray(curve.coefficients)) return "POLINOMIO";
  return "DESCONOCIDO";
}

  return me;
}

export default BVH;