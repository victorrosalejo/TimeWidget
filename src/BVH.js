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
  let staticLine = null; // Store the static line definition
  
  // Load example static line for testing
  function loadExampleStaticLine() {
    // Define a diagonal line that crosses through the data
    staticLine = {
      type: 'slope-intercept',
      slope: 0.5,
      intercept: 0
    };
    console.log('📏 Example static line loaded: y = 0.5x + 0');
  }

  function pupulateBVHPolylines(data, BVH) {
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
        if (xCoor != null && yCoor != null) {
          let xIndex = Math.floor(xCoor / xinc);
          let yIndex = Math.floor(yCoor / yinc);
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

  // Load example static line automatically
  loadExampleStaticLine();

  // If no data is provided, use example data for testing
  if (!data || data.length === 0) {
    console.log('📝 Using example data for testing...');
    data = [
      ['test1', [[0, 0], [10, 5], [20, 10]]],
      ['test2', [[5, 15], [15, 8], [25, 12]]],
      ['test3', [[0, 10], [30, 10]]] // horizontal line
    ];
    // Recreate BVH with example data
    BVH = makeBVH();
  }

  // Auto-run test if we have example data
  setTimeout(() => {
    if (data.length <= 3) { // Only run test with small example data
      me.testStaticLineFunctionality();
    }
  }, 100);

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

  // Add new methods for static line functionality
  
  /**
   * Define a static line analytically
   * @param {Object} lineDefinition - Can be:
   *   - {slope: m, intercept: b} for y = mx + b
   *   - {point1: [x1, y1], point2: [x2, y2]} for line through two points
   *   - {point: [x, y], slope: m} for line through point with slope
   *   - {vertical: x} for vertical line x = constant
   */
  me.defineStaticLine = function(lineDefinition) {
    if (lineDefinition.slope !== undefined && lineDefinition.intercept !== undefined) {
      // y = mx + b format
      staticLine = {
        type: 'slope-intercept',
        slope: lineDefinition.slope,
        intercept: lineDefinition.intercept
      };
    } else if (lineDefinition.point1 && lineDefinition.point2) {
      // Two points format
      let [x1, y1] = lineDefinition.point1;
      let [x2, y2] = lineDefinition.point2;
      
      if (x1 === x2) {
        // Vertical line
        staticLine = {
          type: 'vertical',
          x: x1
        };
      } else {
        let slope = (y2 - y1) / (x2 - x1);
        let intercept = y1 - slope * x1;
        staticLine = {
          type: 'slope-intercept',
          slope: slope,
          intercept: intercept
        };
      }
    } else if (lineDefinition.point && lineDefinition.slope !== undefined) {
      // Point and slope format
      let [x, y] = lineDefinition.point;
      let intercept = y - lineDefinition.slope * x;
      staticLine = {
        type: 'slope-intercept',
        slope: lineDefinition.slope,
        intercept: intercept
      };
    } else if (lineDefinition.vertical !== undefined) {
      // Vertical line format
      staticLine = {
        type: 'vertical',
        x: lineDefinition.vertical
      };
    } else {
      throw new Error('Invalid line definition format');
    }
  };

  /**
   * Check if the static line intersects with a cell
   * @param {Object} cell - BVH cell with x0, y0, x1, y1 properties
   * @returns {boolean} - True if line intersects the cell
   */
  function staticLineIntersectsCell(cell) {
    if (!staticLine) return false;
    
    let {x0, y0, x1, y1} = cell;
    
    if (staticLine.type === 'vertical') {
      let lineX = staticLine.x;
      return lineX >= x0 && lineX <= x1;
    } else {
      // slope-intercept form: y = mx + b
      let m = staticLine.slope;
      let b = staticLine.intercept;
      
      // Check if line intersects any of the cell's edges
      // Left edge (x = x0)
      let yAtX0 = m * x0 + b;
      if (yAtX0 >= y0 && yAtX0 <= y1) return true;
      
      // Right edge (x = x1)
      let yAtX1 = m * x1 + b;
      if (yAtX1 >= y0 && yAtX1 <= y1) return true;
      
      // Bottom edge (y = y0)
      if (m !== 0) {
        let xAtY0 = (y0 - b) / m;
        if (xAtY0 >= x0 && xAtY0 <= x1) return true;
      }
      
      // Top edge (y = y1)
      if (m !== 0) {
        let xAtY1 = (y1 - b) / m;
        if (xAtY1 >= x0 && xAtY1 <= x1) return true;
      }
      
      // Check if line passes completely through the cell
      let y0AtX0 = m * x0 + b;
      let y1AtX1 = m * x1 + b;
      if ((y0AtX0 < y0 && y1AtX1 > y1) || (y0AtX0 > y1 && y1AtX1 < y0)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get all cells that contain the static line
   * @returns {Array} - Array of cell objects that intersect with the static line
   */
  me.getCellsWithStaticLine = function() {
    if (!staticLine) {
      throw new Error('No static line defined. Call defineStaticLine() first.');
    }
    
    let cellsWithLine = [];
    
    for (let i = 0; i < xPartitions; ++i) {
      for (let j = 0; j < yPartitions; ++j) {
        let cell = BVH.BVH[i][j];
        if (staticLineIntersectsCell(cell)) {
          cellsWithLine.push({
            i: i,
            j: j,
            cell: cell
          });
        }
      }
    }
    
    return cellsWithLine;
  };

  /**
   * Check if a polyline segment intersects with the static line
   * @param {Array} segment - Array of points representing a polyline segment
   * @returns {boolean} - True if segment intersects with static line
   */
  function polylineIntersectsStaticLine(segment) {
    if (!staticLine || segment.length < 2) return false;
    
    for (let i = 0; i < segment.length - 1; i++) {
      let [x1, y1] = segment[i];
      let [x2, y2] = segment[i + 1];
      
      if (staticLine.type === 'vertical') {
        let lineX = staticLine.x;
        // Check if segment crosses the vertical line
        if ((x1 <= lineX && x2 >= lineX) || (x1 >= lineX && x2 <= lineX)) {
          return true;
        }
      } else {
        // Line equation: y = mx + b, or mx - y + b = 0
        let m = staticLine.slope;
        let b = staticLine.intercept;
        
        // Calculate which side of the line each point is on
        let side1 = m * x1 - y1 + b;
        let side2 = m * x2 - y2 + b;
        
        // If points are on opposite sides (or one is on the line), there's an intersection
        if (side1 * side2 <= 0) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Find all polylines that intersect with the static line within the cells where the line is present
   * @returns {Set} - Set of polyline keys that intersect with the static line
   */
  me.getPolylinesIntersectingStaticLine = function() {
    if (!staticLine) {
      throw new Error('No static line defined. Call defineStaticLine() first.');
    }
    
    let intersectingPolylines = new Set();
    let cellsWithLine = me.getCellsWithStaticLine();
    
    // Only check cells that contain the static line
    for (let cellInfo of cellsWithLine) {
      let cell = cellInfo.cell;
      
      // Check each polyline in this cell
      for (let [polylineKey, segments] of cell.data) {
        if (!intersectingPolylines.has(polylineKey)) {
          // Check each segment of the polyline
          for (let segment of segments) {
            if (polylineIntersectsStaticLine(segment)) {
              intersectingPolylines.add(polylineKey);
              break; // Found intersection, no need to check more segments
            }
          }
        }
      }
    }
    
    return intersectingPolylines;
  };

  /**
   * Get detailed intersection information between polylines and static line
   * @returns {Array} - Array of objects with polyline key and intersection details
   */
  me.getDetailedStaticLineIntersections = function() {
    if (!staticLine) {
      throw new Error('No static line defined. Call defineStaticLine() first.');
    }
    
    let intersections = [];
    let cellsWithLine = me.getCellsWithStaticLine();
    let processedPolylines = new Set();
    
    for (let cellInfo of cellsWithLine) {
      let cell = cellInfo.cell;
      
      for (let [polylineKey, segments] of cell.data) {
        if (!processedPolylines.has(polylineKey)) {
          processedPolylines.add(polylineKey);
          
          let polylineIntersections = [];
          
          for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
            let segment = segments[segmentIndex];
            if (polylineIntersectsStaticLine(segment)) {
              polylineIntersections.push({
                segmentIndex: segmentIndex,
                segment: segment,
                cellI: cellInfo.i,
                cellJ: cellInfo.j
              });
            }
          }
          
          if (polylineIntersections.length > 0) {
            intersections.push({
              polylineKey: polylineKey,
              intersections: polylineIntersections
            });
          }
        }
      }
    }
    
    return intersections;
  };

  /**
   * Clear the static line definition
   */
  me.clearStaticLine = function() {
    staticLine = null;
  };

  /**
   * Get the current static line definition
   * @returns {Object|null} - Current static line definition or null if none defined
   */
  me.getStaticLine = function() {
    return staticLine;
  };

  /**
   * Test the static line functionality with example data
   */
  me.testStaticLineFunctionality = function() {
    if (!staticLine) {
      console.log('❌ No static line defined');
      return;
    }
    
    console.log('🧪 Testing static line functionality...');
    console.log('📏 Static line:', staticLine);
    
    try {
      const cellsWithLine = me.getCellsWithStaticLine();
      console.log(`📦 Cells containing the line: ${cellsWithLine.length}`);
      console.log('📦 Cell positions:', cellsWithLine.map(c => `(${c.i},${c.j})`).join(', '));
      
      const intersectingPolylines = me.getPolylinesIntersectingStaticLine();
      console.log(`🔗 Polylines intersecting: ${intersectingPolylines.size}`);
      console.log('🔗 Intersecting polylines:', Array.from(intersectingPolylines));
      
      const detailedIntersections = me.getDetailedStaticLineIntersections();
      console.log('📊 Detailed intersections:');
      detailedIntersections.forEach(intersection => {
        console.log(`  • ${intersection.polylineKey}: ${intersection.intersections.length} intersections`);
      });
      
      console.log('✅ Static line functionality test completed!');
    } catch (error) {
      console.error('❌ Error testing static line:', error.message);
    }
  };

  return me;
}

export default BVH;
