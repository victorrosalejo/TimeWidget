import * as d3 from "d3";
import { darken } from "./utils.js";
import WebGPURenderer from "./WebGPURenderer.js";

function TimeLineOverview({
  ts,
  element,
  width = 800,
  height = 600,
  x,
  y,
  groupAttr,
}) {
  let me = {};
  let overviewX, overviewY;
  let renderer = new WebGPURenderer();
  let isWebGPUReady = false;
  let lastRenderArgs = null; 
  let rawData = [];

  const divOverview = d3
    .select(element)
    .style("display", "flex")
    .style("flex-wrap", "wrap")
    .style("position", "relative")
    .style("top", "0px")
    .style("left", "0px")
    .style("background-color", ts.backgroundColor);

  const innerWidth = width - ts.margin.left - ts.margin.right;
  const innerHeight = height - ts.margin.top - ts.margin.bottom;

  const canvas = divOverview
    .selectAll("canvas")
    .data([1])
    .join("canvas")
    .attr("height", innerHeight * window.devicePixelRatio)
    .attr("width", innerWidth * window.devicePixelRatio)
    .style("position", "absolute")
    .style("z-index", "-1")
    .style("top", `${ts.margin.top}px`)
    .style("left", `${ts.margin.left}px`)
    .style("width", `${innerWidth}px`)
    .style("height", `${innerHeight}px`)
    .style("pointer-events", "none");

  // Initialize WebGPU
  renderer.init(canvas.node()).then((success) => {
      if (success) {
          isWebGPUReady = true;
          if (overviewX && overviewY) {
               updateRendererScales();
          }
          if (rawData.length > 0) {
              uploadDataToRenderer();
          }
          if (lastRenderArgs) {
              me.render(...lastRenderArgs);
          }
      } else {
          console.error("Failed to initialize WebGPU Renderer");
      }
  });


  me.data = function (data) {
    rawData = [];
    me.idToIndex = new Map();
    
    let index = 0;
    data.forEach((d) => {
        const id = d[0];
        const points = d[1];
        
        const group = (groupAttr && typeof groupAttr === 'function') ? groupAttr(points[0]) : null;
        let baseColorStr = ts.defaultColor;
        if (groupAttr && typeof groupAttr === 'function') {
            baseColorStr = ts.colorScale(group);
        }
        const baseVec = d3ColorToVec4(baseColorStr);

        rawData.push({ 
            id: id, 
            dataItems: points, 
            group: group,
            baseVec: baseVec
        });
        
        me.idToIndex.set(id, index++);
    });

    if (isWebGPUReady) {
        uploadDataToRenderer();
    }
  };

  function uploadDataToRenderer() {
      const processedData = rawData.map(entry => {
          const points = entry.dataItems.map(p => [+x(p), +y(p)]);
          return { id: entry.id, points: points };
      });
      
      renderer.uploadData(processedData);
  }

  me.setScales = function ({ scaleX, scaleY }) {
    overviewX = scaleX;
    overviewY = scaleY;

    if (isWebGPUReady) {
        updateRendererScales();
    }
  };

  function updateRendererScales() {
      const xDomain = overviewX.domain();
      const yDomain = overviewY.domain();
      
      const minX = xDomain[0] instanceof Date ? xDomain[0].getTime() : xDomain[0];
      const maxX = xDomain[1] instanceof Date ? xDomain[1].getTime() : xDomain[1];

      const innerWidth = width - ts.margin.left - ts.margin.right;
      const innerHeight = height - ts.margin.top - ts.margin.bottom;

      renderer.updateUniforms(
          { x: [minX, maxX], y: [yDomain[0], yDomain[1]] },
          innerWidth, 
          innerHeight,
          {top:0, left:0, right:0, bottom:0}
      );
  }

  function d3ColorToVec4(colorStr) {
      const c = d3.color(colorStr);
      if (!c) return [0, 0, 0, 0];
      return [c.r / 255, c.g / 255, c.b / 255, c.opacity];
  }

  me.render = function (
    dataSelected,
    groupSelected,
    dataNotSelected,
    medians,
    hasSelection
  ) {
    if (!isWebGPUReady) {
        lastRenderArgs = [dataSelected, groupSelected, dataNotSelected, medians, hasSelection];
        return;
    }
    
    const count = rawData.length;
    const styleData = new Float32Array(count * 8);

    const isVisible = dataNotSelected && dataNotSelected.length > 0;
    const alpha = isVisible ? (hasSelection ? ts.noSelectedAlpha : ts.defaultAlpha) : 0;
    
    const useBaseColor = !hasSelection;
    const noSelColor = useBaseColor ? null : d3ColorToVec4(ts.noSelectedColor);
    
    for (let i = 0; i < count; i++) {
        const item = rawData[i];
        const cv = useBaseColor ? item.baseVec : noSelColor;
        
        styleData[i*8 + 0] = cv[0];
        styleData[i*8 + 1] = cv[1];
        styleData[i*8 + 2] = cv[2];
        styleData[i*8 + 3] = alpha;
        styleData[i*8 + 4] = 0;     
        styleData[i*8 + 7] = 0; // 0 = no -selected
    }

    if (hasSelection) {

       
           let groupCounter = 1;
           const activeGroupId = groupSelected; // groupSelected es el id del agrupo activo

           dataSelected.forEach((groupEntries, group) => {
               if (group === activeGroupId) return;

               const colStr = ts.brushesColorScale(group);
               const colVec = d3ColorToVec4(colStr);
               const selAlpha = ts.selectedAlpha;
               const groupFlag = groupCounter++;

               groupEntries.forEach((entry) => {
                    const lineId = entry[0]; // Extract ID from entry [id, points]
                    const idx = me.idToIndex.get(lineId);
                    if (idx !== undefined) {
                        styleData[idx*8 + 0] = colVec[0];
                        styleData[idx*8 + 1] = colVec[1];
                        styleData[idx*8 + 2] = colVec[2];
                        styleData[idx*8 + 3] = selAlpha;
                        styleData[idx*8 + 4] = 0; 
                        styleData[idx*8 + 7] = groupFlag; 
                    }
               });
           });

           // grupos activos
           if (activeGroupId !== undefined && dataSelected.has(activeGroupId)) {
               const groupEntries = dataSelected.get(activeGroupId);
               const colStr = ts.brushesColorScale(activeGroupId);
               const colVec = d3ColorToVec4(colStr);
               const selAlpha = ts.selectedAlpha;
               const groupFlag = groupCounter++;

               groupEntries.forEach((entry) => {
                    const lineId = entry[0];
                    const idx = me.idToIndex.get(lineId);
                    if (idx !== undefined) {
                        styleData[idx*8 + 0] = colVec[0];
                        styleData[idx*8 + 1] = colVec[1];
                        styleData[idx*8 + 2] = colVec[2]; 
                        styleData[idx*8 + 3] = selAlpha;
                        styleData[idx*8 + 4] = 0; 
                        styleData[idx*8 + 7] = groupFlag; 
                    }
               });
           }
           ts.activeGroupCount = groupCounter - 1;
    }
    
    renderer.updateStyles(styleData);
    
    if (medians && medians.length > 0) {
      const transformedMedians = medians.map(median => {
        const groupId = median[0];
        const points = median[1];
        const transformedPoints = points.map(p => [p[0], p[1]]);
        return [groupId, transformedPoints];
      });
      
      const medianStyles = new Map();
      medians.forEach(median => {
        const groupId = median[0];
        const groupColor = ts.brushesColorScale(groupId);
        const darkerColor = d3.color(groupColor).darker(1.5);
        const colorVec = [darkerColor.r / 255, darkerColor.g / 255, darkerColor.b / 255, 1.0];
        
        medianStyles.set(groupId, {
          color: colorVec,
          dashOn: ts.medianLineDash ? ts.medianLineDash[0] : 7,
          dashOff: ts.medianLineDash ? ts.medianLineDash[0] : 7,
          lineWidth: ts.medianLineWidth || 2
        });
      });

      
      renderer.uploadMedians(transformedMedians, medianStyles, ts.medianHalo !== false, {
        size:  ts.medianHaloSize,
        alpha: ts.medianHaloAlpha,
        color: ts.medianHaloColor,
      });
    } else {
      renderer.uploadMedians([], new Map());
    }
    
    renderer.draw(hasSelection, ts.activeGroupCount || 0);
  };

  return me;
}

export default TimeLineOverview;
