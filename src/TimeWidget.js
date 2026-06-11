import * as d3 from "d3";
import { add, intervalToDuration, sub } from "date-fns";

import { log } from "./utils.js";
import { throttle } from "throttle-debounce";

import TimelineDetails from "./TimelineDetails.js";
import TimeLineOverview from "./TimeLineOverview";
import brushInteraction from "./BrushInteraction";
import HelpSystem from "./HelpSystem.js";
import { BrushAggregation, BrushModes } from "./utils.js";
function TimeWidget(
  data,
  {
    /* Elements */
    target = document.createElement("div"), // pass a html element where you want to render
    showBrushesControls = true, // If false you can still use brushesControlsElement to show the control on a different element on your app. For this use the exported value "groups"
    showBrushTooltip = true, // Allows to display a tooltip on the brushes containing its coordinates.
    showBrushesCoordinates = true, // If false you can still use brushesCoordinatesElement to show the control on a different element on your app. For this use the exported value "brushesCoordinates"
    showDetails = true, // If false and with hasDetails = true, you can still use detailsElement to show the control on a different element on your app. For this use the exported value "details"
    showHelp = true, // Shows the "?" help button with the built-in documentation popup and the step-by-step guided tour.
    helpLang = "es", // Language for the built-in help system: 'es' (Spanish, default) or 'en' (English).
    /* Data */
    x = (d) => d.x, // Attribute to show in the X axis (Note that it also supports functions)
    y = (d) => d.y, // Attribute to show in the Y axis (Note that it also supports functions)
    id = (d) => d.id, // Attribute to group the input data (Note that it also supports functions)
    color = null, //Specifies the attribute to be used to discriminate the groups (Note that it also supports functions).
    referenceCurves = null, // Specifies a Json object with the information of the reference lines.
    fmtX, // Function, how to format x points in the tooltip. If not provided will try to guess if it is a date or a number
    fmtY = d3.format(".1f"), // Function, how to format x points in the tooltip
    stepX = { days: 10 }, // Defines the step used, both in the spinboxes and with the arrows on the X axis.
    stepY = 1, // // Defines the step used, both in the spinboxes and with the arrows on the Y axis.
    xScale, //It allows to pass a scale of d3 with its parameters, except for the domain which is defined by the xDomain parameter.
    yScale = d3.scaleLinear(), //It allows to pass a scale of d3 with its parameters, except for the domain which is defined by the yDomain parameter.
    xDomain, // Defines the domain to be used in the x scale.
    yDomain, // Defines the domain to be used in the y scale.
    yLabel = "",
    xLabel = "",
    xTicks, //Allows to use custom strings as ticks on the X-axis independently of the X-scale. A vector of [xValue,Label] pairs is expected. Note that only the defined elements are displayed.
    yTicks, //Allows to use custom strings as ticks on the y-axis independently of the y-scale. A vector of [yValue,Label] pairs is expected. Note that only the defined elements are displayed.
    filters = [], // Array of filters to use, format [[x1, y1], [x2, y2], ...]
    /* Color Configuration */
    defaultAlpha = 0.7, // Default transparency (when no selection is active) of drawn lines
    selectedAlpha = 1.0, // Transparency of selected lines
    noSelectedAlpha = 0.1, // Transparency of unselected lines
    alphaScale = d3.scalePow().exponent(0.25).range([1, 1]), // A scale to adjust the alpha by the number of rendering elements
    backgroundColor = "#ffffff",
    defaultColor = "#aaa", // Default color (when no selection is active) of the drawn lines. It only has effect when "color" is not defined.
    selectedColor = "#aaa", // Color of selected lines. It only has effect when "color" is not defined.
    noSelectedColor = "#dce0e5", // Color of unselected lines. It only has effect when "color" is not defined.
    colorScale = d3.scaleOrdinal(d3.schemeAccent), // The color scale to be used to display the different groups defined by the "color" attribute.
    brushesColorScale = color
      ? d3.scaleOrdinal(d3.schemeGreys[3].toReversed())
      : d3.scaleOrdinal(d3.schemeTableau10), // The color scale to be used to display the brushes
    selectedColorTransform = (color, groupId) =>
      d3.color(color).darker(groupId), // Function to be applied to the color of the selected group. It only has effect when "color" is defined.
    /* Size Configuration */
    width = 800, // Set the desired width of the overview Widget
    detailsWidth = 400, // Set the desired width of the details Widget
    height = 600, // Set the desired height of the overview Widget
    detailsHeight = 300, // Set the desired height of the details Widget
    detailsContainerHeight = 400, // Set the desired height of the details Widget
    margin = { left: 50, top: 30, bottom: 50, right: 50 },
    detailsMargin = null, // Margin options for details view, d3 common format, leave null for using the overview margin
    /* CallBacks */
    updateCallback = () => {}, // (data) => doSomethingWithData
    statusCallback = () => {}, // (status) => doSomethingWithStatus
    /* Rendering */
    brushShadow = "drop-shadow( 2px 2px 2px rgba(0, 0, 0, .7))",
    showGroupMedian = true, // If active show a line with the median of the enabled groups.
    hasDetails = false, // Determines whether detail data will be displayed or not. Disabling it saves preprocessing time if detail data is not to be displayed.
    doubleYlegend = false, // Allows the y-axis legend to be displayed on both sides of the chart.
    showGrid = false, // If active, a reference grid is displayed.
    brushGroupSize = 15, //Controls the size of the colored rectangles used to select the different brushGroups.
    /* Performance */
    maxDetailsRecords = 10, // How many results to show in the detail view
    maxTimelines = null, // Set to a value to limit the number of distinct timelines to show
    xPartitions = 10, // Partitions performed on the X-axis for the collision acceleration algorithm.
    yPartitions = 10, // Partitions performed on the Y-axis for the collision acceleration algorithm.
    /* Options */
    medianNumBins = 10, // Number of bins used to compute the group median.
    medianLineDash = [7], // Selected group median line dash pattern canvas style
    medianLineAlpha = 1, // Selected group median line opacity
    medianLineWidth = 2, // Selected group median line width
    medianFn = d3.median, // Function to use when showing the median
    medianMinRecordsPerBin = 5, // Min number of records each bin must have to be considered
    autoUpdate = true, // Allows to decide whether changes in brushes are processed while moving, or only at the end of the movement.
    _this, // pass the object this in order to be able to maintain the state in case of changes in the input
    fixAxis, // When active, the axes will not change when modifying the data.
    /* Legacy or to be deleted */
    groupAttr = null, // DEPRECATED use color instead: Specifies the attribute to be used to discriminate the groups (Note that it also supports functions).
    overviewWidth, // Legacy, to be deleted
    overviewHeight, // Legacy, to be deleted
    highlightAlpha = 1, // Transparency oh the highlighted lines (lines selected in other TS)
    renderer = "webgpu", // Rendering backend: 'webgpu' (default, GPU-accelerated) | 'canvas' (legacy Canvas 2D + d3)
    enableLOD = false, // If false, disables WebGPU LOD (point & line subsampling). Useful when outliers must not be dropped.
  } = {}
) {
  width = overviewWidth || width;
  height = overviewHeight || height;
  detailsMargin = detailsMargin || margin;

  let ts = {},
    groupedData,
    fData,
    overviewX,
    overviewY,
    divOverview,
    divRender,
    divControls,
    divData,
    brushesCoordinates,
    detailsElement,
    groupsElement,
    svg,
    gGroupBrushes,
    gBrushes,
    gReferences,
    brushSpinBoxes = null,
    medianBrushGroups,
    dataSelected,
    dataNotSelected,
    renderSelected, // Selected data to render. Depends on selected DataGroup and the selection of other TS
    renderNotSelected, // Non Selected data to render. Depends on selected DataGroup and the selection of other TS
    showNonSelected, // Determines if unselected data is rendered
    selectedGroupData,
    hasScaleTime,
    nGroupsData,
    timelineDetails, // Centralizes the details component
    timelineOverview,
    brushes; // Stores the reference lines
  let gProbes;
  let helpSystem = null; // Sistema de ayuda: popup de documentación + demo guiada
  // Cache de render(): evita recrear Maps por frame cuando el estado no cambia.
  // render() siempre creaba new Map()/Array.from() → el dirty-cache de estilos GPU nunca saltaba
  // → updateStyles() escribía 3.2MB a la GPU en cada frame incluso sin cambios de selección.
  const _renderEmptyArray = [];
  let _renderInputSelected = null, _renderInputNotSelected = null, _renderInputHasSelection = undefined;
  let _renderCachedMDataSelected = null, _renderCachedMDataNotSelected = null, _renderCachedMedians = null;
  let sliders = new Map();
  let sliderSeq = 0;
  function getRefCurveById(refId) {
    if (!Array.isArray(referenceCurves)) return null;
    return (
      referenceCurves.find((c) => c.id === refId && c.isVisible !== false) ||
      null
    );
  }

  function isGroupEnabled(groupId) {
    // Evitar optional chaining para compatibilidad
    let groups = null;
    if (brushes && typeof brushes.getBrushesGroup === "function") {
      groups = brushes.getBrushesGroup();
    }
    const g =
      groups && typeof groups.get === "function" ? groups.get(groupId) : null;
    return !!(g && g.isEnable);
  }

  function isRefPolylineSelected() {
    const gid = brushes.getBrushGroupSelected();
    if (gid == null) return { ok: false };

    const g = brushes.getBrushesGroup().get(gid);
    if (!g) return { ok: false };

    const name = (g.name || "").trim();
    if (!name.startsWith("RC ")) return { ok: false };

    // Heurística: el id de la curva suele ir tras "RC "
    const refIdGuess = name.slice(3).trim();

    // Intentos razonables de emparejar grupo ↔ curva
    let ref =
      (Array.isArray(referenceCurves) &&
        (referenceCurves.find((r) => String(r.id).trim() === refIdGuess) ||
          referenceCurves.find((r) => String(r.id).trim() === name) ||
          referenceCurves.find(
            (r) => String(r.name || "").trim() === refIdGuess
          ))) ||
      null;

    if (!ref) return { ok: false };
    if (ref.isSimplePoints) return { ok: false }; // solo polilínea

    return { ok: true, groupId: gid, ref };
  }

  // util: delta de dominio equivalente a N píxeles (para bloquear cruces)
  function domainDxFromPixels(px = 6) {
    // convierte 0px y px a dominio (soporta Date y número)
    const d0 = +overviewX.invert(0);
    const d1 = +overviewX.invert(px);
    return Math.abs(d1 - d0) || 0;
  }

  // util: primera curva de referencia visible
  function getFirstVisibleRef() {
    return Array.isArray(referenceCurves)
      ? referenceCurves.find((c) => c.isVisible !== false && !c.isSimplePoints)
      : null;
  }
  // Interpolación lineal y clamp a extremos
  function getYAtX(curve, x) {
    if (!curve || !Array.isArray(curve.data) || !curve.data.length) return null;
    const data = curve.data;
    let lo = 0,
      hi = data.length - 1;

    if (x <= data[0][0]) return data[0][1];
    if (x >= data[hi][0]) return data[hi][1];

    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (data[mid][0] <= x) lo = mid;
      else hi = mid;
    }
    const [x0, y0] = data[lo],
      [x1, y1] = data[hi];
    const t = (x - x0) / (x1 - x0);
    return y0 * (1 - t) + y1 * t;
  }
  // Exported Parameters
  ts.xPartitions = xPartitions;
  ts.yPartitions = yPartitions;
  ts.defaultAlpha = defaultAlpha;
  ts.selectedAlpha = selectedAlpha;
  ts.noSelectedAlpha = noSelectedAlpha;
  ts.backgroundColor = backgroundColor;
  ts.defaultColor = defaultColor;
  ts.selectedColor = selectedColor;
  ts.noSelectedColor = noSelectedColor;
  ts.hasDetails = hasDetails;
  ts.margin = margin;
  ts.colorScale = colorScale;
  ts.brushesColorScale = brushesColorScale;
  ts.color = color;
  ts.doubleYlegend = doubleYlegend;
  ts.showGrid = showGrid;
  ts.showBrushTooltip = showBrushTooltip;
  ts.autoUpdate = autoUpdate;
  ts.brushGroupSize = brushGroupSize;
  ts.stepX = stepX;
  ts.stepY = stepY;
  ts.medianLineAlpha = medianLineAlpha;
  ts.medianLineWidth = medianLineWidth;
  ts.medianLineDash = medianLineDash;
  ts.medianNumBins = medianNumBins;
  ts.medianFn = medianFn;
  ts.alphaScale = alphaScale;
  ts.medianMinRecordsPerBin = medianMinRecordsPerBin;
  ts.yScale = yScale;
  ts.xScale = xScale;
  ts.highlightAlpha = highlightAlpha;
  ts.selectedColorTransform = selectedColorTransform;
  ts.renderer = renderer;
  ts.enableLOD = enableLOD;
  //Backwards compatibility with groupAttr.
  if (groupAttr) {
    console.warn('The attribute "groupAttr" is deprecated use "color" instead');
    color = groupAttr;
  }

  // Convert attrStrings to functions
  if (typeof x === "string") {
    let _x = x;
    x = (d) => d[_x];
  }
  if (typeof y === "string") {
    let _y = y;
    y = (d) => d[_y];
  }
  if (typeof id === "string") {
    let _id = id;
    id = (d) => d[_id];
  }
  if (color && typeof color === "string") {
    let _color = color;
    color = (d) => d[_color];
  }

  divOverview = d3
    .select(target)
    .style("display", "flex")
    .style("flex-wrap", "wrap")
    .style("position", "relative")
    .style("top", "0px")
    .style("left", "0px")
    .style("background-color", ts.backgroundColor)
    .node();

  divControls =
    divControls ||
    d3.select(target).select("#control").node() ||
    d3.create("div").attr("id", "control").node();
  brushesCoordinates =
    brushesCoordinates ||
    d3.select(target).select("#brushesCoordinates").node() ||
    d3.create("div").attr("id", "brushesCoordinates").node();
  groupsElement =
    groupsElement ||
    d3.select(target).select("#brushesGroups").node() ||
    d3.create("div").attr("id", "brushesGroups").node();
  medianBrushGroups = new Map();
  dataSelected = new Map();
  dataNotSelected = [];
  selectedGroupData = new Set();
  showNonSelected = true;

  function computeBrushColor(groupId) {
    return ts.brushesColorScale(groupId);
  }

  function onAddBrushGroup() {
    brushes.addBrushGroup();
  }

  function onChangeNonSelected(newState) {
    showNonSelected = newState;
  }
  function onEpsilonChange(rcId, newValue) {
    const curve = referenceCurves.find((c) => c.id === rcId);
    if (curve) {
      curve.epsilon = newValue;

      const bvh = brushes.getBvh();
      if (bvh) {
        bvh.removeReferenceCurves([rcId]);
        ts.addReferenceCurve([curve]);
      }
    }
  }

  function onChangeBrushGroupState(id, newState) {
    brushes.changeBrushGroupState(id, newState);
    updateDependentStates(id, newState);
    brushes.recomputeSelection();
    ts.printSliders();
    renderBrushesControls();
  }
    function onRemoveBrushGroup(id) {
    const affectedCurves = [];
    if (Array.isArray(referenceCurves)) {
      referenceCurves.forEach(curve => {
        if (curve.isSimplePoints && Array.isArray(curve.associations)) {
          const originalCount = curve.associations.length;
          curve.associations = curve.associations.filter(assoc => assoc.id !== id);
          if (curve.associations.length < originalCount) {
            affectedCurves.push(curve);
          }
        }
      });
    }
    if (affectedCurves.length > 0) {
      ts.addReferenceCurve(affectedCurves);
    }
    brushes.removeBrushGroup(id);
  }

  function onSelectBrushGroup(id) {
    const oldSelectedId = brushes.getBrushGroupSelected();
    brushes.selectBrushGroup(id);
    if (oldSelectedId !== undefined && oldSelectedId !== id) {
      const oldGroup = brushes.getBrushesGroup().get(oldSelectedId);
      if (oldGroup) {
        updateDependentStates(oldSelectedId, oldGroup.isEnable);
      }
    }

    updateDependentStates(id, true);

    brushes.recomputeSelection();
  }

  function initBrushesControls() {
    groupsElement.innerHTML = `
        <h3>Groups</h3>
        <div id="brushesList" style="margin-bottom: 8px;"></div>
        <button id="btnAddBrushGroup">Add Group</button>
    `;
    groupsElement
      .querySelector("button#btnAddBrushGroup")
      .addEventListener("click", onAddBrushGroup);

    const rcWidgetElement = d3
      .select(target)
      .selectAll("#rcWidget")
      .data([1])
      .join("div")
      .attr("id", "rcWidget")
      .style("margin-top", "15px")
      .node();

    rcWidgetElement.innerHTML = `
        <h3>Reference Curves</h3>
        <div id="rcList"></div>
    `;

    if (showBrushesControls) {
      divControls.appendChild(groupsElement);
      divControls.appendChild(rcWidgetElement);
    }
  }

  function renderGroupsWidget() {
    const brushesList = d3.select(groupsElement).select("#brushesList");

    const brushGroups = Array.from(brushes.getBrushesGroup()).filter(
      ([id, group]) => !group.name.startsWith("RC ")
    );

    brushesList
      .selectAll(".brushControl")
      .data(brushGroups, (d) => d[0])
      .join("div")
      .attr("class", "brushControl")
      .each(function (d) {
        const div = d3.select(this);
        const groupName = d[1].name;
        const groupCount = renderSelected.has(d[0])
          ? renderSelected.get(d[0]).length
          : 0;

        div.node().innerHTML = `<div style="display: flex; align-items: center; flex-wrap: nowrap; margin-bottom: 2px;">
            <input type="checkbox" id="checkBoxShowBrushGroup" ${
              d[1].isEnable ? "checked" : ""
            }></input>
            <div id="groupColor" style="
              min-width: ${ts.brushGroupSize}px; height: ${ts.brushGroupSize}px;
              background-color: ${computeBrushColor(d[0])};
              border: ${
                d[0] === brushes.getBrushGroupSelected()
                  ? "2px solid black"
                  : "1px solid #ccc"
              };
              margin: 0 5px; cursor: pointer;
            "></div>
            <input id="groupName" style="border: none; outline: none; width: ${
              groupName.length + 1
            }ch;" value="${groupName}"></input>
            <span id="groupSize" style="margin-right: 5px; cursor: pointer;">(${groupCount})</span>
            <button style="color: red; font-weight: bold; border:none; background:none; display:${
              brushes.getBrushesGroupSize() > 1 ? "block" : "none"
            }" id="btnRemoveBrushGroup">&cross;</button>
          </div>
        `;

        div.select("input#groupName").on("input", function () {
          this.style.width = this.value.length + 1 + "ch";
        });
        div.select("input#groupName").on("change", (evt) => {
          brushes.updateBrushGroupName(d[0], evt.target.value);
        });
        div.select("#btnRemoveBrushGroup").on("click", (e) => {
          e.stopPropagation();
          onRemoveBrushGroup(d[0]);
        });
        div.select("#checkBoxShowBrushGroup").on("change", (e) => {
          onChangeBrushGroupState(d[0], e.target.checked);
        });
        div
          .select("div#groupColor, span#groupSize")
          .on("click", () => onSelectBrushGroup(d[0]));
      });

    const nonSelectedContainer = d3
      .select(groupsElement)
      .selectAll(".nonSelectedControl")
      .data([1]);
    nonSelectedContainer
      .enter()
      .append("div")
      .attr("class", "nonSelectedControl")
      .merge(nonSelectedContainer)
      .each(function () {
        this.innerHTML = `<div style="display: flex; align-items: center; margin-top: 5px;">
                <input type="checkbox" id="checkBoxShowNonSelected" ${
                  showNonSelected ? "checked" : ""
                }></input>
                <span>Non selected (<span id="nonSelectedCount">${
                  renderNotSelected.length
                }</span>)</span>
            </div>`;
        d3.select(this)
          .select("#checkBoxShowNonSelected")
          .on("change", (e) => {
            showNonSelected = e.target.checked;
            onSelectionChange();
          });
      });
    d3.select(groupsElement)
      .select("#nonSelectedCount")
      .text(renderNotSelected.length);
  }
function renderReferenceCurvesWidget() {
    const rcWidget = d3.select(target).select("#rcWidget");
    const rcList = rcWidget.select("#rcList");
    if (!referenceCurves || referenceCurves.length === 0) {
      rcWidget.style("display", "none");
      return;
    }
    rcWidget.style("display", "block");

    rcList
      .selectAll(".rcControl")
      .data(referenceCurves, (d) => d.id)
      .join("div")
      .attr("class", "rcControl")
      .style("margin-bottom", "10px")
      .each(function (rc) {
        const div = d3.select(this);

        const actionButtonHTML = rc.isSimplePoints
          ? `<button class="add-association-btn" style="margin-left: 8px; font-size: 0.8em; cursor: pointer;">Add Association</button>`
          : `<button class="add-slider-btn" style="margin-left: 8px; font-size: 0.8em; cursor: pointer;">Add Slider</button>`;

        const hexColor = d3.color(rc.color || "#000000").formatHex();
        div.node().innerHTML = `
            <div style="display: flex; align-items: center; font-weight: bold;">
                <input type="checkbox" class="rc-visible-toggle" ${
                  rc.isVisible !== false ? "checked" : ""
                }></input>
                
                <input type="color" class="rc-color-picker" value="${hexColor}" title="Change Curve Color" style="
                  width: 20px; height: 20px; 
                  border: none; padding: 0; background: none;
                  margin: 0 5px; cursor: pointer;
                  flex-shrink: 0;">
                </input>

                <input class="rc-name" style="border: none; outline: none; font-weight: bold; width: ${String(
                  rc.name || rc.id
                ).length + 1}ch;" value="${rc.name || rc.id}"></input>
                ${actionButtonHTML} 
            </div>
            <div class="associations-list" style="margin-left: 20px; margin-top: 4px;"></div>
            <div class="sliders-list" style="margin-left: 20px; margin-top: 4px;"></div>
          `;

        div.select(".rc-color-picker").on("input", (e) => {
             rc.color = e.target.value;
             ts.printReferenceCurves(referenceCurves); 
             ts.printSliders(); 
        });

        div
          .select("input.rc-name")
          .on("input", function () {
            this.style.width = this.value.length + 1 + "ch";
          })
          .on("change", (evt) => {
            rc.name = evt.target.value;
          });

        div.select(".rc-visible-toggle").on("change", (e) => {
          rc.isVisible = e.target.checked;
          ts.printReferenceCurves(referenceCurves);
          ts.printSliders();
          brushes.recomputeSelection();
          renderBrushesControls();
        });

        div.select(".add-slider-btn").on("click", () => onAddSlider(rc.id));
        div
          .select(".add-association-btn")
          .on("click", () => onUpdatePointCurveAssociation(rc.id, null, "add"));

        // Render Sliders
        const associatedSliders = Array.from(sliders.values()).filter(
          (s) => s.rcId === rc.id
        );
        const slidersList = div.select(".sliders-list");
        slidersList
          .selectAll(".slider-control")
          .data(associatedSliders, (d) => d.id)
          .join("div")
          .attr("class", "slider-control")
          .each(function (slider) {
            const group = brushes.getBrushesGroup().get(slider.groupId);
            const groupName = group ? group.name : "...";

            d3.select(this).node().innerHTML = `
                  <div style="display: flex; align-items: center; margin-bottom: 2px; font-size: 0.9em;">
                      <input type="checkbox" class="slider-enabled-toggle" title="Enable/Disable Slider" ${
                        slider.userEnabled ? "checked" : ""
                      } style="margin-right: 5px;"></input>
                      
                      <input class="slider-name" style="border: none; outline: none; width: ${String(
                        slider.name
                      ).length + 1}ch;" value="${slider.name}"></input>
                      <span style="margin-left: 2px;">(${groupName})</span>
                      <div title="Associated Group Color" style="width: 12px; height: 12px; background-color: ${
                        computeBrushColor(
                          slider.groupId
                        )
                      }; margin: 0 5px; border: 1px solid #ccc;"></div>
                      <button class="toggle-side-btn" title="Toggle position (above/below)" style="border: none; background: none; cursor: pointer; font-size: 1.1em; padding: 0 5px;">
                          ${slider.side === "above" ? "↓" : "↑"}
                      </button>
                      
                      <button class="remove-slider-btn" title="Remove Slider" style="color: red; border:none; background:none; font-weight: bold; cursor: pointer;">&cross;</button>
                  </div>
                `;

            d3.select(this)
              .select("input.slider-name")
              .on("input", function () {
                this.style.width = this.value.length + 1 + "ch";
              })
              .on("change", (evt) => {
                slider.name = evt.target.value;
              });

            d3.select(this)
              .select(".toggle-side-btn")
              .on("click", () => {
                slider.side = slider.side === "above" ? "below" : "above";
                ts.printSliders();
                brushes.recomputeSelection();
                renderReferenceCurvesWidget();
              });
            d3.select(this)
              .select(".slider-enabled-toggle")
              .on("change", (e) => onToggleSlider(slider.id, e.target.checked));
            d3.select(this)
              .select(".remove-slider-btn")
              .on("click", () => onRemoveSlider(slider.id));
          });

        // Render Point Associations
        const pointAssociations =
          rc.isSimplePoints && Array.isArray(rc.associations)
            ? rc.associations
            : [];
        const associationsList = div.select(".associations-list");
        associationsList
          .selectAll(".association-control")
          .data(pointAssociations, (d) => d.id)
          .join("div")
          .attr("class", "association-control")
          .style("display", rc.isVisible !== false ? "block" : "none")
          .each(function (assoc) {
            if (assoc.userEnabled === undefined) {
              assoc.userEnabled = assoc.enabled;
            }
            if (assoc.aggregation === undefined) {
              assoc.aggregation = BrushAggregation.And;
            }
            if (assoc.negate === undefined) {
              assoc.negate = false; 
            }

            const group = brushes.getBrushesGroup().get(assoc.id);
            const groupName = group ? group.name : "...";
            const uniqueId = `rc-${rc.id}-assoc-${assoc.id}`;

            d3.select(this).node().innerHTML = `
                  <div style="display: flex; align-items: center; margin-bottom: 2px; font-size: 0.9em;">
                      <input type="checkbox" class="assoc-enabled-toggle" title="Enable/Disable Association" ${
                        assoc.userEnabled ? "checked" : ""
                      } style="margin-right: 5px;"></input>

                      <span>(${groupName})</span>
                      <div title="Associated Group Color" style="width: 12px; height: 12px; background-color: ${computeBrushColor(
                        assoc.id
                      )}; margin: 0 5px; border: 1px solid #ccc;"></div>
                      
                      <div style="font-size: 0.9em; margin-right: 5px;">
                        <input type="radio" id="${uniqueId}-and" name="${uniqueId}-agg" value="and" 
                          ${
                            assoc.aggregation === BrushAggregation.And
                              ? "checked"
                              : ""
                          }>
                        <label for="${uniqueId}-and" style="cursor: pointer;">AND</label>
                        
                        <input type="radio" id="${uniqueId}-or" name="${uniqueId}-agg" value="or" 
                          ${
                            assoc.aggregation === BrushAggregation.Or
                              ? "checked"
                              : ""
                          }>
                        <label for="${uniqueId}-or" style="cursor: pointer;">OR</label>
                      </div>

                      <div style="font-size: 0.9em; margin-right: 5px; padding-left: 5px; border-left: 1px solid #ccc;">
                        <input type="checkbox" id="${uniqueId}-not" name="${uniqueId}-not" 
                          ${assoc.negate ? "checked" : ""}>
                        <label for="${uniqueId}-not" style="cursor: pointer;">NOT</label>
                      </div>
                      
                      <button class="remove-assoc-btn" title="Remove Association" style="color: red; border:none; background:none; font-weight: bold; cursor: pointer;">&cross;</button>
                  </div>
                `;

            d3.select(this)
              .select(`#${uniqueId}-and`)
              .on("change", () => {
                assoc.aggregation = BrushAggregation.And;
                brushes.recomputeSelection();
              });
            d3.select(this)
              .select(`#${uniqueId}-or`)
              .on("change", () => {
                assoc.aggregation = BrushAggregation.Or;
                brushes.recomputeSelection();
              });
            
            d3.select(this)
              .select(`#${uniqueId}-not`)
              .on("change", (e) => {
                assoc.negate = e.target.checked;
                brushes.recomputeSelection();
              });

            d3.select(this)
              .select(".assoc-enabled-toggle")
              .on("change", (e) => {
                onUpdatePointCurveAssociation(
                  rc.id,
                  assoc.id,
                  "toggle",
                  e.target.checked
                );
              });
            d3.select(this)
              .select(".remove-assoc-btn")
              .on("click", () => {
                onUpdatePointCurveAssociation(rc.id, assoc.id, "remove");
              });
          });

        if (rc.isSimplePoints) {
          const epsilonControl = div
            .selectAll(".epsilon-control")
            .data([rc])
            .join("div")
            .attr("class", "epsilon-control")
            .style("margin-left", "20px")
            .style("font-size", "0.9em")
            .style("margin-bottom", "5px")
            .style("display", rc.isVisible !== false ? "flex" : "none")
            .style("align-items", "center").html(`
            <label style="margin-right: 5px;">Collision Tolerance:</label>
            <input type="number" class="epsilon-input"
                   value="${rc.epsilon}" min="0" step="0.1"
                   style="width: 5ch;">
        `);

          const epsilonInput = epsilonControl.select(".epsilon-input");

          epsilonInput.on("change", (event) => {
            const newValue = +event.target.value;
            if (!isNaN(newValue) && newValue >= 0) {
              onEpsilonChange(rc.id, newValue);
            }
          });

          epsilonInput.on("input", function () {
            this.style.width = Math.max(5, this.value.length + 2) + "ch";
          });
          epsilonInput.dispatch("input");
        }
      });
  }

  function onUpdatePointCurveAssociation(rcId, groupId, action, newState) {
    const ref = referenceCurves.find((c) => c.id === rcId);
    if (!ref) return;

    if (!Array.isArray(ref.associations)) {
      ref.associations = [];
    }

    if (action === "add") {
      const selectedGroupId = brushes.getBrushGroupSelected();
      if (selectedGroupId === undefined || selectedGroupId === null) {
        alert("Please select a Group before adding an association.");
        return;
      }
      if (!ref.associations.some((a) => a.id === selectedGroupId)) {
        ref.associations.push({
          id: selectedGroupId,
          enabled: true,
          userEnabled: true,
        });
      }
    } else if (action === "remove" && groupId !== null) {
      ref.associations = ref.associations.filter((a) => a.id !== groupId);
    } else if (action === "toggle" && groupId !== null) {
      const assoc = ref.associations.find((a) => a.id === groupId);
      if (assoc) {
        assoc.userEnabled = newState;
        const group = brushes.getBrushesGroup().get(assoc.id);
        const groupIsEnabled = group ? group.isEnable : false;
        assoc.enabled = groupIsEnabled && assoc.userEnabled;
      }
    }
       ts.addReferenceCurve([ref]);
    renderReferenceCurvesWidget();
  }
  function renderBrushesControls() {
    renderGroupsWidget();
    renderReferenceCurvesWidget();
  }
  function updateDependentStates(groupId, groupIsEnabled) {
    for (const slider of sliders.values()) {
      if (slider.groupId === groupId) {
        slider.enabled = groupIsEnabled && slider.userEnabled;
      }
    }

    (referenceCurves || []).forEach((curve) => {
      if (curve.isSimplePoints && Array.isArray(curve.associations)) {
        const assoc = curve.associations.find((a) => a.id === groupId);
        if (assoc) {
          assoc.enabled = groupIsEnabled && assoc.userEnabled;
        }
      }
    });

    brushes.updateReferenceCurves(referenceCurves);
  }
 function onAddSlider(rcId) {
    // Primero, encontramos la curva por su ID, sin importar si está visible o no.
    const ref = Array.isArray(referenceCurves)
      ? referenceCurves.find((c) => c.id === rcId)
      : null;

    if (!ref) {
      // Este es un caso de seguridad, es poco probable que ocurra.
      alert(`Error: No se encontró la curva de referencia con ID "${rcId}".`);
      return;
    }

    if (ref.isVisible === false) {
      alert("You can't add a slider to a reference curve that isn't visible. Please activate it first.");
      return; // Detenemos la ejecución aquí.
    }
    
    if (!ref.data || ref.data.length < 2 || ref.isSimplePoints) {
      console.warn(
        "Cannot add slider to this reference curve (no data, not a polyline, or not found)."
      );
      alert(
        "You can't add a slider to this reference curve. It may not be a polyline or may not have enough data."
      );
      return;
    }

    const groupId = brushes.getBrushGroupSelected();
    if (groupId === undefined || groupId === null) {
      alert("Please select a Group before adding a slider.");
      return;
    }

    const curveDomain = d3.extent(ref.data, (d) => d[0]);
    const domainStart =
      curveDomain[0] instanceof Date
        ? curveDomain[0].getTime()
        : curveDomain[0];
    const domainEnd =
      curveDomain[1] instanceof Date
        ? curveDomain[1].getTime()
        : curveDomain[1];
    const domainWidth = domainEnd - domainStart;

    let leftX = domainStart + domainWidth * 0.25;
    let rightX = domainStart + domainWidth * 0.75;

    if (curveDomain[0] instanceof Date) {
      leftX = new Date(leftX);
      rightX = new Date(rightX);
    }

    const sliderId = ++sliderSeq;
    sliders.set(sliderId, {
      id: sliderId,
      name: `Slider ${sliderId}`,
      rcId: rcId,
      groupId: groupId,
      side: "above",
      enabled: true,
      userEnabled: true,
      leftX: leftX,
      rightX: rightX,
      mode: BrushModes.Intersect,
      aggregation: BrushAggregation.And,
      negate: false,
    });

    brushes.recomputeSelection();
    ts.printSliders();
    renderReferenceCurvesWidget();
  }

  function onRemoveSlider(sliderId) {
    sliders.delete(sliderId);
    brushes.recomputeSelection();
    ts.printSliders();
    renderReferenceCurvesWidget();
  }

  function onToggleSlider(sliderId, isEnabled) {
    if (sliders.has(sliderId)) {
      const slider = sliders.get(sliderId);
      slider.userEnabled = isEnabled;
      const group = brushes.getBrushesGroup().get(slider.groupId);
      const groupIsEnabled = group ? group.isEnable : false;
      slider.enabled = groupIsEnabled && slider.userEnabled;
      brushes.recomputeSelection();
      ts.printSliders();
    }
  }
  function initDomains({ xDataType, fData }) {
    if (!xDomain) {
      xDomain = fixAxis && _this ? _this.extent.x : d3.extent(fData, x);
    }

    overviewX = xScale ? xScale.copy() : undefined;

    if (xDataType === "object" && x(fData[0]) instanceof Date) {
      hasScaleTime = true;
      if (!overviewX) overviewX = d3.scaleTime();
      overviewX.domain(xDomain);
      if (!fmtX) {
        // It is a function of type d3.timeFormat. I don't like the way to check that it is a function of that type, but I don't know a better one.
        fmtX = d3.timeFormat("%Y-%m-%d");
      } else if (fmtX.name === "M") {
        console.log(
          "👁️t has been detected that the parameter fmtX formats numerical data, while the data selected for " +
            'the X-axis is a date. The function d3.timeFormat("%Y-%m-%d") will be used as fmtX; '
        );
        fmtX = d3.timeFormat("%Y-%m-%d");
      }
    } else {
      // We if x is something else overviewX won't be assigned
      // if (xDataType === "number") {
      // X is number
      if (!overviewX) overviewX = d3.scaleLinear();
      overviewX.domain(xDomain);
      if (!fmtX) {
        fmtX = d3.format(".1f");
      }
    }

    overviewX.range([0, width - ts.margin.right - ts.margin.left]).nice();

    if (!yDomain) {
      yDomain = fixAxis && _this ? _this.extent.y : d3.extent(fData, y); // Keep same axes as in the first rendering
    }

    overviewY = yScale.copy();

    overviewY.domain(yDomain);

    overviewY
      .range([height - ts.margin.top - ts.margin.bottom, 0])
      .nice()
      .clamp(true);
  }

  function init() {
    //CreateOverView
    referenceCurves = referenceCurves || [];
    divData = d3
      .select(divControls)
      .selectAll("div#divData")
      .data([1])
      .join("div")
      .attr("id", "divData");

    divRender = d3
      .select(divOverview)
      .selectAll("div#render")
      .data([1])
      .join("div")
      .attr("id", "render")
      .style("position", "relative")
      .style("z-index", 1);

    timelineOverview = TimeLineOverview({
      ts,
      element: divRender.node(),
      width: width,
      height: height,
      x,
      y,
      groupAttr: color,
      overviewX,
      overviewY,
      renderer, 
    });

    svg = divRender
      .selectAll("svg")
      .data([1])
      .join("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("height", height)
      .attr("width", width);

    const g = svg
      .selectAll("g.gDrawing")
      .data([1])
      .join("g")
      .attr("class", "gDrawing")
      .attr("transform", `translate(${ts.margin.left}, ${ts.margin.top})`)
      .attr("tabindex", 0)
      .style("pointer-events", "all")
      .style("outline", "-webkit-focus-ring-color solid 0px")
      .on("keydown", (e) => {
        e.preventDefault();
        switch (e.key) {
          case "r":
          case "Backspace":
          case "Delete":
            brushes.removeSelectedBrush();
            break;
          case "+":
            onAddBrushGroup();
            break;
          case "ArrowRight":
            onArrowRigth(e);
            break;
          case "ArrowLeft":
            onArrowLeft(e);
            break;
          case "ArrowUp":
            onArrowUp(e);
            break;
          case "ArrowDown":
            onArrowDown(e);
            break;
          case "i":
            brushes.invertQuerySelectedGroup();
            break;
        }
      });

    let yAxis = d3.axisLeft(overviewY);
    if (yTicks) {
      yAxis
        .tickValues(yTicks.map((d) => d[0]))
        .tickFormat((d, i) => (yTicks[i][1] ? yTicks[i][1] : yTicks[i][0]));
    }

    let gmainY = g
      .selectAll("g.mainYAxis")
      .data([1])
      .join("g")
      .attr("class", "mainYAxis")
      .call(yAxis)
      .call((axis) =>
        axis
          .selectAll("text.label")
          .data([1])
          .join("text")
          .text(yLabel)
          .attr("dy", -15)
          .attr("class", "label")
          .style("fill", "black")
          .style("text-anchor", "end")
          .style("pointer-events", "none")
      )
      .style("pointer-events", "none");

    if (ts.doubleYlegend) {
      g.selectAll("g.secondYaxis")
        .data([1])
        .join("g")
        .attr("class", "secondYaxis")
        .call(d3.axisRight(overviewY))
        .attr(
          "transform",
          `translate(${width - ts.margin.left - ts.margin.right},0)`
        )
        .style("pointer-events", "none");
    }

    let xAxis = d3.axisBottom(overviewX ? overviewX : g);
    if (xTicks) {
      xAxis
        .tickValues(xTicks.map((d) => d[0]))
        .tickFormat((d, i) => (xTicks[i][1] ? xTicks[i][1] : xTicks[i][0]));
    }

    let gmainx = g
      .selectAll("g.mainXAxis")
      .data([1])
      .join("g")
      .attr("class", "mainXAxis")
      .call(xAxis)
      .attr(
        "transform",
        `translate(0, ${height - ts.margin.top - ts.margin.bottom})`
      )
      .call((axis) =>
        axis
          .selectAll("text.label")
          .data([1])
          .join("text")
          .attr("class", "label")
          .text(xLabel)
          .attr(
            "transform",
            `translate(${width - ts.margin.right - ts.margin.left - 5}, -10 )`
          )
          .style("fill", "black")
          .style("text-anchor", "end")
          .style("pointer-events", "none")
      )
      .style("pointer-events", "none");

    gReferences = g
      .selectAll("g.gReferences")
      .data([1])
      .join("g")
      .attr("class", "gReferences")
      .style("pointer-events", "none");

    gmainY
      .selectAll("g.tick")
      .selectAll(".gridline")
      .data(ts.showGrid ? [1] : [])
      .join("line")
      .attr("class", "gridline")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", width - ts.margin.right - ts.margin.left)
      .attr("y2", 0)
      .attr("stroke", "#9ca5aecf") // line color
      .attr("stroke-dasharray", "4"); // make it dashed;;

    gmainx
      .selectAll("g.tick")
      .selectAll(".gridline")
      .data(ts.showGrid ? [1] : [])
      .join("line")
      .attr("class", "gridline")
      .attr("x1", 0)
      .attr("y1", -height + ts.margin.top + ts.margin.bottom)
      .attr("x2", 0)
      .attr("y2", 0)
      .attr("stroke", "#9ca5aecf") // line color
      .attr("stroke-dasharray", "4"); // make it dashed;

    if (color) {
      fData.forEach((d) => selectedGroupData.add(color(d)));
      nGroupsData = selectedGroupData.size;
    }

    gGroupBrushes = svg
      .selectAll("g.colorBrushes")
      .data([1])
      .join("g")
      .attr("class", "colorBrushes")
      .attr(
        "transform",
        `translate(${ts.margin.left + 10},${
          ts.margin.top - ts.brushGroupSize - 5
        } )`
      );

    // TODO John: We might want to move this into brushInteraction
    gBrushes = g
      .selectAll("g#brushes")
      .data([1])
      .join("g")
      .attr("id", "brushes");

    gProbes = g
      .selectAll("g.gProbes")
      .data([1])
      .join("g")
      .attr("class", "gProbes");

    //Before create the brushes structure, we generete the reerence lines points.
    //THIS IS ONLY TO GENERATE POINTS FOR THE FUNCTIONS
    if (referenceCurves) {
      referenceCurves = generateCurvePoints(
        referenceCurves,
        overviewX.domain(),
        overviewY.domain()
      );
    }

    brushes = brushInteraction({
      ts,
      element: gBrushes.node(),
      data: groupedData,
      tooltipTarget: divRender.node(),
      contextMenuTarget: divRender.node(),
      width,
      height,
      xPartitions,
      yPartitions,
      x,
      y,
      brushShadow,
      fmtY,
      fmtX: fmtX,
      scaleX: overviewX,
      scaleY: overviewY,
      updateTime: 150,
      extent: [
        [0, 0],
        [
          width - margin.left - margin.right,
          height - margin.top - margin.bottom,
        ],
      ],
      selectionCallback: onSelectionChange,
      groupsCallback: onBrushGroupsChange,
      changeSelectedCoordinatesCallback: onBrushCoordinatesChange,
      referenceCurves: referenceCurves,
      getProbePairBoxes: () => ts.getActiveSliderBoxes(),
      getSliders: () => sliders,
      getYAtX: getYAtX,
      printSlidersCallback: () => ts.printSliders(),
    });

    gGroupBrushes
      .selectAll("text")
      .data([1])
      .join("text")
      .attr("x", 0)
      .attr("y", ts.brushGroupSize / 2 + 2)
      .text("Groups + : ")
      .style("cursor", "pointer")
      .on("click", onAddBrushGroup);

    divOverview.appendChild(divControls);
    initBrushCoordinates();
    initBrushesControls();

    // init() puede ejecutarse varias veces (ts.data); el sistema de ayuda solo se crea una vez.
    if (showHelp && !helpSystem) {
      helpSystem = HelpSystem({
        container: divOverview,
        lang: helpLang,
        elements: {
          chart: () => divRender.node(),
          groups: () => (showBrushesControls ? groupsElement : null),
          referenceCurves: () =>
            referenceCurves && referenceCurves.length
              ? d3.select(target).select("#rcWidget").node()
              : null,
          coordinates: () =>
            showBrushesCoordinates ? brushesCoordinates : null,
          dataGroups: () => (color && divData ? divData.node() : null),
          details: () =>
            ts.hasDetails && showDetails ? detailsElement : null,
        },
      });
    }

    return g;
  }

  // Callback that is called every time the coordinates of the selected brush are modified.
  function onBrushCoordinatesChange(selection) {
    _setCoordsMode("timebox");
    updateBrushSpinBox(selection);
    updateStatus();
  }

  function updateBrushSpinBox(selection) {
    if (selection) {
      let [[x0, y0], [x1, y1]] = selection;

      // When initializing the brushes the spinbox is not ready
      if (brushSpinBoxes) {
        let [[sx0, sy0], [sx1, sy1]] = brushSpinBoxes;

        sx0.node().value = fmtX(x0);
        sx1.node().value = fmtX(x1);
        sy0.node().value = fmtY(y1).replace("\u2212", "-"); // Change D3 minus sign to parseable minus
        sy1.node().value = fmtY(y0).replace("\u2212", "-");
      } else {
        log(
          "updateBrushSpinBox called, but brushSpinBoxes not ready ",
          brushSpinBoxes
        );
      }
    } else {
      emptyBrushSpinBox();
    }
  }

  function emptyBrushSpinBox() {
    let [[sx0, sy0], [sx1, sy1]] = brushSpinBoxes;

    sx0.node().value = "";
    sx1.node().value = "";
    sy0.node().value = "";
    sy1.node().value = "";
  }

  function initBrushCoordinates() {
    brushesCoordinates.innerHTML = "";
    let selection = d3.select(brushesCoordinates);
    let divX = selection.append("div");

    divX.append("span").text(xLabel ? xLabel : "X Axis:");

    let divInputX = divX.append("div");

    let domainX = overviewX.domain();
    let x0 = divInputX
      .append("div")
      .append("input")
      .attr("type", hasScaleTime ? "Date" : "number")
      .attr("min", hasScaleTime ? fmtX(domainX[0]) : domainX[0])
      .attr("max", hasScaleTime ? fmtX(domainX[1]) : domainX[1])
      .attr("step", ts.stepX)
      .attr("width", "50%")
      // .style("background-color", ts.backgroundColor)
      .on("change", onSpinboxChange);

    let x1 = divInputX
      .append("div")
      .append("input")
      .attr("type", hasScaleTime ? "Date" : "number")
      .attr("min", hasScaleTime ? fmtX(domainX[0]) : domainX[0])
      .attr("max", hasScaleTime ? fmtX(domainX[1]) : domainX[1])
      .attr("width", "50%")
      .attr("step", ts.stepX)
      // .style("background-color", ts.backgroundColor)
      .on("change", onSpinboxChange);

    let divY = selection.append("div").attr("id", "coordsYRow");

    divY.append("span").text(yLabel ? yLabel : "Y Axis:");

    let divInputY = divY.append("div");

    let domainY = overviewY.domain();

    let y0 = divInputY
      .append("div")
      .append("input")
      .attr("type", "number")
      .attr("min", domainY[0])
      .attr("max", domainY[1])
      .attr("width", "50%")
      .attr("step", ts.stepY)
      // .style("background-color", ts.backgroundColor)
      .on("change", onSpinboxChange);

    let y1 = divInputY
      .append("div")
      .append("input")
      .attr("type", "number")
      .attr("min", domainY[0])
      .attr("max", domainY[1])
      .attr("width", "50%")
      .attr("step", ts.stepY)
      // .style("background-color", ts.backgroundColor)
      .on("change", onSpinboxChange);

    brushSpinBoxes = [
      [x0, y0],
      [x1, y1],
    ];

    if (showBrushesCoordinates) {
      selection
        .insert("h3", ":first-child")
        .attr("id", "coordsTitle")
        .text("Current TimeBox Coordinates:");
      divControls.appendChild(brushesCoordinates);
    }
  }

  let _coordsActiveSlider = null;

  function _setCoordsMode(mode) {
    const titleEl = brushesCoordinates
      ? brushesCoordinates.querySelector("#coordsTitle")
      : null;
    const yRow = brushesCoordinates
      ? brushesCoordinates.querySelector("#coordsYRow")
      : null;
    if (mode === "slider") {
      if (titleEl) titleEl.textContent = "Current Slider Coordinates:";
      if (yRow) yRow.style.display = "none";
    } else {
      _coordsActiveSlider = null;
      if (titleEl) titleEl.textContent = "Current TimeBox Coordinates:";
      if (yRow) yRow.style.display = "";
    }
  }

  function updateSliderSpinBox(slider) {
    if (!brushSpinBoxes) return;
    let [[sx0, ], [sx1, ]] = brushSpinBoxes;
    _coordsActiveSlider = slider;
    _setCoordsMode("slider");
    sx0.node().value = fmtX(slider.leftX);
    sx1.node().value = fmtX(slider.rightX);
  }

  function generateDataSelectionDiv() {
    if (color) {
      divData.node().innerHTML = "";
      divData.append("span").text("Data groups: ");

      let divButtons = divData
        .selectAll(".groupData")
        .data(selectedGroupData)
        .join("div")
        .attr("class", "groupData");
      divButtons
        .append("button")
        .style("font-size", `${ts.brushGroupSize}px`)
        .style("stroke", "black")
        .style("margin", "2px")
        .style("margin-right", "10px")
        .style("border-width", "3px")
        .style("border", "solid black")
        .style("width", `${ts.brushGroupSize}px`)
        .style("height", `${ts.brushGroupSize}px`)
        .style("background-color", (d) => ts.colorScale(d))
        .on("click", function (event, d) {
          if (selectedGroupData.has(d)) {
            selectedGroupData.delete(d);
            d3.select(this).style("border", "solid transparent");
          } else {
            selectedGroupData.add(d);
            d3.select(this).style("border", "solid black");
          }

          onGroupDataChange();
        });
      divButtons.append("span").text((d) => d);
    }
  }

  // Filter dataSelected and dataNotSelected by enable dataGroups
  function filterDatabyDataGroups(dataSelected, dataNotSelected) {
    let dataSelectedF = new Map(dataSelected);
    let dataNotSelectedF = dataNotSelected;
    for (let d of dataSelectedF) {
      let filtered = d[1].filter((d) => selectedGroupData.has(color(d[1][0])));
      dataSelectedF.set(d[0], filtered);
    }
    dataNotSelectedF = dataNotSelectedF.filter((d) =>
      selectedGroupData.has(color(d[1][0]))
    );

    return [dataSelectedF, dataNotSelectedF];
  }

  // Called when the active dataGroups are modified.
  function onGroupDataChange() {
    onSelectionChange();
  }

  function initDetails({ overviewX, overviewY }) {
    if (ts.hasDetails) {
      // see if already exists and element and reutilize it, if not create new div
      if (!detailsElement) {
        detailsElement =
          d3.select(target).select("#details").node() ||
          d3.create("div").attr("id", "#details").node();
      }

      // TimelineDetails object
      timelineDetails = TimelineDetails({
        ts,
        detailsElement,
        detailsContainerHeight,
        detailsWidth,
        maxDetailsRecords,
        detailsHeight,
        x,
        y,
        margin: detailsMargin,
      });

      timelineDetails.setScales({ overviewX, overviewY });
      if (showDetails) divOverview.appendChild(detailsElement);
    }
  }

  // Callback that is called when the value of the spinboxes is modified.
  function onSpinboxChange(sourceEvent) {
    // ── Modo Slider: actualizar leftX / rightX del slider activo ──
    if (_coordsActiveSlider) {
      const slider = _coordsActiveSlider;
      let [[sx0, ], [sx1, ]] = brushSpinBoxes;
      let newLeft, newRight;
      if (hasScaleTime) {
        newLeft  = new Date(sx0.node().value);
        newRight = new Date(sx1.node().value);
      } else {
        newLeft  = +sx0.node().value;
        newRight = +sx1.node().value;
      }
      // Garantizar orden y separación mínima
      if (newLeft >= newRight) {
        if (sourceEvent.target === sx0.node()) {
          newRight = newLeft + ts.stepX;
          sx1.node().value = fmtX(newRight);
        } else {
          newLeft = newRight - ts.stepX;
          sx0.node().value = fmtX(newLeft);
        }
      }
      slider.leftX  = newLeft;
      slider.rightX = newRight;
      ts.printSliders();
      brushes.recomputeSelection();
      return;
    }

    // ── Modo TimeBox (comportamiento original) ────────────────────
    let selectedBrush = brushes.getSelectedBrush();
    if (selectedBrush === null) return;

    let [[sx0, sy0], [sx1, sy1]] = brushSpinBoxes;

    let domainX = overviewX.domain();

    let x0;
    let x1;
    let y0 = +sy1.node().value;
    let y1 = +sy0.node().value;

    if (hasScaleTime) {
      x0 = new Date(sx0.node().value);
      x1 = new Date(sx1.node().value);
      if (x0 >= x1) {
        if (sourceEvent.target === sx0.node()) {
          x1 = add(x0, ts.stepX);
          x1 = Math.min(x1, domainX[1]);
          sx1.node().value = fmtX(x1);
        } else {
          x0 = sub(x1, ts.stepX);
          x0 = Math.max(x0, domainX[0]);
          sx0.node().value = fmtX(x0);
        }
      }
    } else {
      x0 = +sx0.node().value;
      x1 = +sx1.node().value;

      if (x0 >= x1) {
        if (sourceEvent.target === sx0.node()) {
          x1 = x0 + ts.stepX;
          sx1.node().value = x1;
        } else {
          x0 = x1 - ts.stepX;
          sx0.node().value = x0;
        }
      }
    }

    if (y1 >= y0) {
      if (sourceEvent.target === sy0.node()) {
        y0 = y1 + ts.stepY;
        sy1.node().value = y0;
      } else {
        y1 = y0 - ts.stepY;
        sy0.node().value = y1;
      }
    }

    brushes.moveSelectedBrush([
      [x0, y0],
      [x1, y1],
    ]);
  }

  function onArrowRigth() {
    let selectedBrush = brushes.getSelectedBrush();
    if (selectedBrush === null) return;

    let [[x0, y0], [x1, y1]] = selectedBrush[1].selectionDomain;

    let maxX = overviewX.domain()[1];

    if (hasScaleTime) {
      x1 = add(x1, ts.stepX);
      if (x1 > maxX) {
        x1 = sub(x1, ts.stepX);
        let dist = intervalToDuration({ start: x1, end: maxX });
        x1 = maxX;
        x0 = add(x0, dist);
      } else {
        x0 = add(x0, ts.stepX);
      }
    } else {
      x1 += ts.stepX;
      if (x1 > maxX) {
        let dist = maxX - x1 + ts.stepX;
        x1 = maxX;
        x0 -= dist;
      } else {
        x0 += ts.stepX;
      }
    }

    brushes.moveSelectedBrush(
      [
        [x0, y0],
        [x1, y1],
      ],
      true
    );
  }

  function onArrowLeft() {
    let selectedBrush = brushes.getSelectedBrush();
    if (selectedBrush === null) return;

    let [[x0, y0], [x1, y1]] = selectedBrush[1].selectionDomain;

    let minX = overviewX.domain()[0];

    if (hasScaleTime) {
      x0 = sub(x0, ts.stepX);
      if (x0 < minX) {
        x0 = add(x0, ts.stepX);
        let dist = intervalToDuration({ start: minX, end: x0 });
        x0 = minX;
        x1 = sub(x1, dist);
      } else {
        x1 = sub(x1, ts.stepX);
      }
    } else {
      x0 -= ts.stepX;
      if (x0 < minX) {
        let dist = x0 + ts.stepX - minX;
        x0 = minX;
        x1 -= dist;
      } else {
        x1 -= ts.stepX;
      }
    }

    brushes.moveSelectedBrush(
      [
        [x0, y0],
        [x1, y1],
      ],
      true
    );
  }

  function onArrowDown() {
    let selectedBrush = brushes.getSelectedBrush();
    if (selectedBrush === null) return;

    let [[x0, y0], [x1, y1]] = selectedBrush[1].selectionDomain;

    y1 -= ts.stepY;

    let minY = overviewY.domain()[0];

    if (y1 < minY) {
      let dist = y1 + ts.stepY - minY;
      y1 = minY;
      y0 -= dist;
    } else {
      y0 -= ts.stepY;
    }
    brushes.moveSelectedBrush(
      [
        [x0, y0],
        [x1, y1],
      ],
      true
    );
  }

  function onArrowUp() {
    let selectedBrush = brushes.getSelectedBrush();
    if (selectedBrush === null) return;

    let [[x0, y0], [x1, y1]] = selectedBrush[1].selectionDomain;

    y0 += ts.stepY;

    let maxY = overviewY.domain()[1];

    if (y0 > maxY) {
      let dist = maxY - y0 + ts.stepY;
      y0 = maxY;
      y1 += dist;
    } else {
      y1 += ts.stepY;
    }

    brushes.moveSelectedBrush(
      [
        [x0, y0],
        [x1, y1],
      ],
      true
    );
  }

  // To render the overview and detailed view based on the selectedData
  // En TimeWidget.js
  // En TimeWidget.js

  function render(dataSelected, dataNotSelected, hasSelection) {
    let medians, mDataSelected, mDataNotSelectedArr;

    if (
      dataSelected   === _renderInputSelected   &&
      dataNotSelected === _renderInputNotSelected &&
      hasSelection   === _renderInputHasSelection &&
      _renderCachedMDataSelected !== null
    ) {
      // Cache hit: mismos objetos de entrada → la selección no cambió entre frames.
      // Pasamos las mismas referencias a timelineOverview.render() para que su
      // dirty-check de estilos salte el writeBuffer de 3.2MB.
      mDataSelected    = _renderCachedMDataSelected;
      mDataNotSelectedArr = _renderCachedMDataNotSelected;
      medians          = _renderCachedMedians;
    } else {
      // Cache miss: recalcular Maps y medianas
      medians = [];
      let enableBrushGroups = brushes.getEnableGroups();
      enableBrushGroups.forEach((id) => {
        if (medianBrushGroups.has(id)) {
          medians.push([id, medianBrushGroups.get(id)]);
        }
      });

      const isGroupWithPointAssociation = (groupId) => {
        const hasPointAssoc = (referenceCurves || []).some(
          (rc) =>
            rc.isSimplePoints &&
            Array.isArray(rc.associations) &&
            rc.associations.some((assoc) => assoc.id === groupId && assoc.enabled)
        );
        const hasActiveSlider = Array.from(sliders.values()).some(
          (s) => s.groupId === groupId && s.enabled
        );
        return hasPointAssoc || hasActiveSlider;
      };

      mDataSelected = new Map();
      let mDataNotSelectedSet = new Set(dataNotSelected);

      dataSelected.forEach((groupData, groupId) => {
        const group = brushes.getBrushesGroup().get(groupId);
        if ((group && group.isEnable) || isGroupWithPointAssociation(groupId)) {
          mDataSelected.set(groupId, groupData);
        } else {
          groupData.forEach((d) => mDataNotSelectedSet.add(d));
        }
      });

      mDataSelected.forEach((arr) => {
        for (const item of arr) mDataNotSelectedSet.delete(item);
      });
      mDataNotSelectedArr = Array.from(mDataNotSelectedSet);

      _renderInputSelected      = dataSelected;
      _renderInputNotSelected   = dataNotSelected;
      _renderInputHasSelection  = hasSelection;
      _renderCachedMDataSelected    = mDataSelected;
      _renderCachedMDataNotSelected = mDataNotSelectedArr;
      _renderCachedMedians          = medians;
    }

    timelineOverview.render(
      mDataSelected,
      brushes.getBrushGroupSelected(),
      showNonSelected ? mDataNotSelectedArr : _renderEmptyArray,
      medians,
      hasSelection
    );

    if (ts.hasDetails) {
      let brushGroupSelected = brushes.getBrushGroupSelected();
      window.requestAnimationFrame(() =>
        timelineDetails.render({ data: dataSelected, brushGroupSelected })
      );
    }
  }

  function getBrushGroupsMedians(data) {
    if (!brushes.hasSelection()) return;
    let minX = +overviewX.domain()[0];
    let maxX = +overviewX.domain()[1];

    let binW = (maxX - minX) / ts.medianNumBins;

    // log(
    //   "getBrushGroupsMedians: number of bins",
    //   ts.medianNumBins,
    //   " binW ",
    //   binW,
    //   minX,
    //   maxX
    // );

    for (let g of data.entries()) {
      let id = g[0];

      let bins = [];
      let cx = minX;
      for (let i = 0; i < ts.medianNumBins; ++i) {
        bins.push({
          x0: cx,
          x1: cx + binW,
          data: [],
        });
        cx += binW;
      }
      for (let line of g[1]) {
        for (let point of line[1]) {
          let i = Math.floor((x(point) - minX) / binW);
          i = i > ts.medianNumBins - 1 ? i - 1 : i;
          bins[i].data.push(y(point));
        }
      }

      let median = [];
      for (let bin of bins) {
        if (bin.data.length >= ts.medianMinRecordsPerBin) {
          let x = bin.x0 + (bin.x1 - bin.x0) / 2;
          let y = ts.medianFn(bin.data);
          median.push([x, y]);
        }
      }
      medianBrushGroups.set(id, median);
    }

    // log(" Bins computed", medianBrushGroups);
  }
function updateSliderVisuals(gSlider, slider) {
    if (gSlider.empty()) return;

    const ref = getRefCurveById(slider.rcId);
    if (!ref) return;
    
    const groupColor = computeBrushColor(slider.groupId);
    const isOrAggregation = slider.aggregation === BrushAggregation.Or;

    const mainStrokeColor = groupColor; 
    const mainStrokeDash = slider.mode === BrushModes.Intersect ? "4" : null;

    const notShadowColor = slider.negate ? "red" : "#333";
    const notShadowWidth = slider.negate ? 8 : 4; // Exagerado si es NOT
    const notShadowOpacity = slider.negate ? 0.6 : 0.5; // Más opaco si es NOT


    const drawHandle = (which) => {
      const xDom = which === "left" ? slider.leftX : slider.rightX;
      const xPx = overviewX(xDom);
      const yCurve = getYAtX(ref, +xDom);
      if (yCurve === null) return;

      const yCurvePx = overviewY(yCurve);
      const [yMin, yMax] = overviewY.domain();
      const yEndPx =
        slider.side === "above" ? overviewY(yMax) : overviewY(yMin);

      const gHandle = gSlider.select(`.handle-${which}`);

      gHandle
        .select(".slider-line-main")
        .attr("x1", xPx)
        .attr("y1", yCurvePx)
        .attr("x2", xPx)
        .attr("y2", yEndPx)
        .attr("stroke", mainStrokeColor)
        .attr("stroke-width", 2) 
        .attr("stroke-dasharray", mainStrokeDash);
      gHandle
        .select(".slider-line-border")
        .attr("x1", xPx)
        .attr("y1", yCurvePx)
        .attr("x2", xPx)
        .attr("y2", yEndPx)
        .attr("stroke", isOrAggregation ? groupColor : "#333")
        .attr("stroke-width", isOrAggregation ? 8 : 4) 
        .attr("stroke-opacity", isOrAggregation ? 0.6 : 0.5);

      gHandle
        .select(".slider-hit-area")
        .attr("x1", xPx)
        .attr("y1", yCurvePx)
        .attr("x2", xPx)
        .attr("y2", yEndPx);
    };

    drawHandle("left");
    drawHandle("right");

    const xStart = +slider.leftX;
    const xEnd = +slider.rightX;

    const curveSegment = ref.data.filter(
      (d) => +d[0] >= xStart && +d[0] <= xEnd
    );

    const startPoint = [xStart, getYAtX(ref, xStart)];
    const endPoint = [xEnd, getYAtX(ref, xEnd)];
    if (curveSegment.length === 0 || +curveSegment[0][0] > xStart) {
      curveSegment.unshift(startPoint);
    }
    if (
      curveSegment.length === 0 ||
      +curveSegment[curveSegment.length - 1][0] < xEnd
    ) {
      curveSegment.push(endPoint);
    }

    const lineGenerator = d3
      .line()
      .x((d) => overviewX(d[0]))
      .y((d) => overviewY(d[1]));

    const curvePathData = lineGenerator(curveSegment);

    const [yMin, yMax] = overviewY.domain();
    const topPx = overviewY(yMax);
    const bottomPx = overviewY(yMin);
    const x0p = overviewX(slider.leftX);
    const x1p = overviewX(slider.rightX);
    const yHorizontal = (slider.side === "above") ? topPx : bottomPx;
    
    gSlider.select(".slider-horizontal-border")
        .attr("x1", x0p)
        .attr("y1", yHorizontal)
        .attr("x2", x1p)
        .attr("y2", yHorizontal)
        .attr("stroke", notShadowColor)
        .attr("stroke-width", notShadowWidth)
        .attr("stroke-opacity", notShadowOpacity);

    gSlider.select(".slider-horizontal-main")
        .attr("x1", x0p)
        .attr("y1", yHorizontal)
        .attr("x2", x1p)
        .attr("y2", yHorizontal)
        .attr("stroke", mainStrokeColor)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", mainStrokeDash);

    gSlider.select(".slider-curve-border")
        .attr("d", curvePathData)
        .attr("stroke", notShadowColor)
        .attr("stroke-width", notShadowWidth)
        .attr("stroke-opacity", notShadowOpacity);
        
    gSlider.select(".slider-curve-main")
        .attr("d", curvePathData)
        .attr("stroke", mainStrokeColor)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", mainStrokeDash);
    let pathString;
    if (slider.side === "above") {
      pathString = `M ${x0p},${topPx} L ${x0p},${overviewY(
        startPoint[1]
      )} ${curvePathData.slice(1)} L ${x1p},${topPx} Z`;
    } else {
      pathString = `M ${x0p},${overviewY(
        startPoint[1]
      )} ${curvePathData.slice(
        1
      )} L ${x1p},${bottomPx} L ${x0p},${bottomPx} Z`;
    }

    gSlider
      .select(".slider-background")
      .attr("d", pathString)
      .attr("fill", groupColor)
      .attr("opacity", slider.negate ? 0.25 : 0.15);
  }

ts.printSliders = function () {
    if (!overviewX || !overviewY || !gProbes) return;

    const sliderData = Array.from(sliders.values()).filter((s) => {
        if (!s.enabled) return false;
        const ref = getRefCurveById(s.rcId);
        return ref && ref.isVisible !== false && !ref.isSimplePoints;
    });

    const sel = gProbes
        .selectAll("g.slider-group")
        .data(sliderData, (d) => d.id);

    sel.exit().remove();

    const enter = sel.enter().append("g").attr("class", "slider-group");
    
    enter.append("path")
         .attr("class", "slider-background")
         .attr("opacity", 0.15)
         .style("cursor", "grab");

    enter.append("line") 
        .attr("class", "slider-horizontal-border")
        .attr("stroke", "#333") 
        .attr("stroke-width", "4px") 
        .attr("stroke-opacity", 0.5)
        .style("pointer-events", "none");
    enter.append("line") 
        .attr("class", "slider-horizontal-main")
        .attr("stroke-width", "2px") 
        .style("pointer-events", "none");

    enter.append("path")
        .attr("class", "slider-curve-border")
        .attr("stroke", "#333") 
        .attr("stroke-width", "4px") 
        .attr("stroke-opacity", 0.5)
        .style("fill", "none")
        .style("pointer-events", "none");
    enter.append("path")
        .attr("class", "slider-curve-main")
        .attr("stroke-width", "2px") 
        .style("fill", "none")
        .style("pointer-events", "none");
    ["left", "right"].forEach((which) => {
        const gSide = enter.append("g").attr("class", `handle-${which}`);
        gSide.append("line")
            .attr("class", "slider-line-border")
            .attr("stroke", "#333") 
            .attr("stroke-width", "4px") 
            .attr("stroke-opacity", 0.5)
            .style("pointer-events", "none"); 

        gSide.append("line")
            .attr("class", "slider-line-main")
            .attr("stroke-width", "2px"); 

        gSide
            .append("line")
            .attr("class", "slider-hit-area")
            .style("stroke", "transparent")
            .style("stroke-width", 12)
            .style("cursor", "ew-resize");
        gSide
            .append("title")
            .text("Drag to move edge. Double-click to toggle side (above/below).");
    });

    const all = enter.merge(sel);

    const totalLines = groupedData ? groupedData.length : 0;
    const calculatedDelay = Math.min(300, 30 + Math.floor(totalLines / 20));
  ts.moveSelectedBrush = (selection) => {
    brushes.moveSelectedBrush(selection);
  };

  ts.selectBrush = (groupId, brushId) => {
    brushes.selectBrush(groupId, brushId);
  };

  ts.getBrushesGroup = () => {
    return brushes.getBrushesGroup();
  };
  
  ts.getBrushesColorScale = () => {
    return brushes.colorScale;
  };

  ts.recomputeSelection = () => {
    brushes.recomputeSelection();
  };
    const throttledRecompute = throttle(calculatedDelay, () => {
        brushes.recomputeSelection();
    });

    const handleDragComputation = () => {
        if (ts.autoUpdate) {
            throttledRecompute();
        }
    };

    all.each(function (slider) {
        const gSlider = d3.select(this);
        const ref = getRefCurveById(slider.rcId);
        gSlider.select(".slider-background")
            .style("pointer-events", "all") 
            .on("contextmenu", (sourceEvent) => {
                sourceEvent.preventDefault();
                const contextMenu = brushes.contextMenu;
                if (!contextMenu) return;
                const [px, py] = d3.pointer(sourceEvent); 
                contextMenu.__show(
                  slider.mode, 
                  slider.aggregation, 
                  slider.negate, 
                  px,  
                  py,  
                  slider
                );
            })
            .on("dblclick", (e) => {
                e.preventDefault();
                e.stopPropagation();
                slider.side = slider.side === "above" ? "below" : "above";
                updateSliderVisuals(gSlider, slider); 
                brushes.recomputeSelection(); 
            })
            .call(d3.drag()
                .on("start", function() {
                    d3.select(this).style("cursor", "grabbing");
                })
                .on("drag", (e) => {
                    if (!ref) return;
                    const dx = e.dx;
                    const currentLeftPx = overviewX(slider.leftX);
                    const currentRightPx = overviewX(slider.rightX);
                    const newLeftDomain = overviewX.invert(currentLeftPx + dx);
                    const newRightDomain = overviewX.invert(currentRightPx + dx);

                    const [minRefX, maxRefX] = d3.extent(ref.data, (d) => +d[0]);
                    
                    if (+newLeftDomain >= minRefX && +newRightDomain <= maxRefX) {
                        slider.leftX = newLeftDomain;
                        slider.rightX = newRightDomain;
                        
                        updateSliderVisuals(gSlider, slider);
                        updateSliderSpinBox(slider);
                        handleDragComputation();
                    }
                })
                .on("end", function() {
                    d3.select(this).style("cursor", "grab");
                    brushes.recomputeSelection(); 
                })
            );

        const minGap = domainDxFromPixels(5);

        const updateSingleEdge = (which, newXPixel) => {
            const xDom = overviewX.invert(newXPixel);
            if (!ref) return;

            const [minRefX, maxRefX] = d3.extent(ref.data, (d) => +d[0]);
            let clampedX = Math.max(minRefX, Math.min(maxRefX, +xDom));
            const isDate = ref.data[0][0] instanceof Date;

            if (which === "left") {
                const newLeftX = Math.min(clampedX, +slider.rightX - minGap);
                slider.leftX = isDate ? new Date(newLeftX) : newLeftX;
            } else {
                const newRightX = Math.max(clampedX, +slider.leftX + minGap);
                slider.rightX = isDate ? new Date(newRightX) : newRightX;
            }
            updateSliderVisuals(gSlider, slider);
        };

        ["left", "right"].forEach(which => {
            gSlider.select(`.handle-${which} .slider-hit-area`)
                .call(d3.drag()
                    .on("drag", (e) => {
                        updateSingleEdge(which, e.x);
                        updateSliderSpinBox(slider);
                        handleDragComputation();
                    })
                    .on("end", (e) => {
                        updateSingleEdge(which, e.x);
                        updateSliderSpinBox(slider);
                        brushes.recomputeSelection();
                    })
                )
                .on("dblclick", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    slider.side = slider.side === "above" ? "below" : "above";
                    updateSliderVisuals(gSlider, slider);
                    brushes.recomputeSelection();
                })
                .on("contextmenu", (sourceEvent) => {
                    sourceEvent.preventDefault();
                    sourceEvent.stopPropagation();
                    const contextMenu = brushes.contextMenu;
                    if (!contextMenu) return;
                    const xDom = which === "left" ? slider.leftX : slider.rightX;
                    const px = overviewX(xDom);
                    const ref = getRefCurveById(slider.rcId);
                    const yCurve = getYAtX(ref, +xDom);
                    const py = (yCurve !== null) ? overviewY(yCurve) : sourceEvent.pageY;

                    contextMenu.__show(
                      slider.mode, 
                      slider.aggregation, 
                      slider.negate, 
                      px, 
                      py, 
                      slider 
                    );
                });
        });
        
        updateSliderVisuals(gSlider, slider);
    });
};
 
  ts.getActiveSliderBoxes = function () {
    if (!overviewX || !overviewY) return [];
    const out = [];

    const activeSliders = Array.from(sliders.values()).filter((s) => s.enabled);

    for (const slider of activeSliders) {
      const ref = getRefCurveById(slider.rcId);
      if (!ref || ref.isVisible === false) continue;

      const [yMin, yMax] = overviewY.domain();
      const topPx = overviewY(yMax);
      const bottomPx = overviewY(yMin);

      const x0p = overviewX(slider.leftX);
      const x1p = overviewX(slider.rightX);

      let y0p = topPx; // Desde la parte superior del gráfico
      let y1p = bottomPx; // Hasta la parte inferior del gráfico

      out.push({
        groupId: slider.groupId,
        box: [
          [Math.min(x0p, x1p), Math.min(y0p, y1p)],
          [Math.max(x0p, x1p), Math.max(y0p, y1p)],
        ],
        sliderId: slider.id,
      });
    }
    return out;
  };
  function onSelectionChange(
    newDataSelected = dataSelected,
    newDataNotSelected = dataNotSelected,
    hasSelection = brushes.hasSelection()
  ) {
    dataSelected = newDataSelected;
    dataNotSelected = newDataNotSelected;

    // Filter data with active dataGroups
    if (color) {
      [renderSelected, renderNotSelected] = filterDatabyDataGroups(
        dataSelected,
        dataNotSelected
      );
    } else {
      renderSelected = dataSelected;
      renderNotSelected = dataNotSelected;
    }

    // Compute the medians if needed
    if (showGroupMedian) {
      getBrushGroupsMedians(renderSelected);
    }

    render(renderSelected, renderNotSelected, hasSelection); // Print the filtered data by active dataGroups

    renderBrushesControls();
    triggerValueUpdate(renderSelected);
  }

  // Called every time the brushGroups changes
  function onBrushGroupsChange() {
    render(renderSelected, renderNotSelected, brushes.hasSelection());

    const existingGroupIds = new Set(
      Array.from(brushes.getBrushesGroup().keys())
    );
    let slidersWereRemoved = false;
    for (const [sliderId, slider] of sliders.entries()) {
      if (!existingGroupIds.has(slider.groupId)) {
        sliders.delete(sliderId);
        slidersWereRemoved = true;
      }
    }

    let associationsWereRemoved = false;
    if (Array.isArray(referenceCurves)) {
        referenceCurves.forEach(curve => {
            if (curve.isSimplePoints && Array.isArray(curve.associations)) {
                const originalCount = curve.associations.length;
                curve.associations = curve.associations.filter(assoc => existingGroupIds.has(assoc.id));
                
                if (curve.associations.length < originalCount) {
                    associationsWereRemoved = true;
                }
            }
        });
    }
   

    renderBrushesControls();
    triggerValueUpdate();

    if (slidersWereRemoved || associationsWereRemoved) {
      ts.printSliders();
      if (associationsWereRemoved) {
          brushes.recomputeSelection();
      }
    }
  }

  function updateStatus() {
    let status = new Map();
    for (let [id, brushGroup] of brushes.getBrushesGroup()) {
      let Gstatus = {
        id: id,
        name: brushGroup.name,
        isActive: brushGroup.isActive,
        isEnable: brushGroup.isEnable,
        brushes: brushGroup.brushes,
      };
      status.set(brushGroup.name, Gstatus);
    }
    divOverview.value.status = status;
    divOverview.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Converts the brushes map into an array
  function convertBrushMapToArray(
    map,
    { getRepresentative = (v) => v[0], groupAttributeName = "tw_group" } = {}
  ) {
    return [...map.entries()]
      .map(([group, d]) => {
        const oneRepresentativePerObject = [...d.values()].map((v) => {
          const representative = getRepresentative(v);
          representative[groupAttributeName] = group;
          return representative;
        });
        return oneRepresentativePerObject;
      })
      .flat();
  }

  // Triggers the update of the selection calls callback and dispatches input event
  function triggerValueUpdate(sel = renderSelected) {
    let value = new Map();

    for (let [id, brushGroup] of brushes.getBrushesGroup()) {
      let groupMap = new Map();
      sel.get(id).forEach((d) => groupMap.set(d[0], d[1]));
      value.set(brushGroup.name, groupMap);
    }

    divOverview.value = value;
    divOverview.value.groupsColorScale = brushesColorScale;
    divOverview.value.nonSelectedIds = dataNotSelected.map((d) => d[0]);
    divOverview.value.selectedIds = dataSelected
      .get(brushes.getBrushGroupSelected())
      .map((d) => d[0]);
    divOverview.value.selectedGroup = brushes
      .getBrushesGroup()
      .get(brushes.getBrushGroupSelected()).name;
    divOverview.value.asArray = (params) =>
      convertBrushMapToArray(value, params);
    divOverview.extent = {
      x: overviewX.domain(),
      y: overviewY.domain(),
    };
    divOverview.brushGroups = brushes.getBrushesGroup();
    updateStatus();
  }

  /*function brushesToDomain(brushesGroup) {
      let selectedBrush = brushes.getSelectedBrush();
      let outMap = new Map();
      for (let brushGroup of brushesGroup.entries()) {
        let innerMap = new Map();
        for (let brush of brushGroup[1].entries()) {
          if (brush[1].selection !== null) {
            let nBrush = Object.assign({}, brush[1]);

            // pixels
            let [[x0, y0], [x1, y1]] = brush[1].selection;
            nBrush.selectionPixels = [
              [x0, y0],
              [x1, y1],
            ];

            // data domain
            let [[xi0, yi0], [xi1, yi1]] = brush[1].selection.map(([x, y]) => [
              overviewX.invert(x),
              overviewY.invert(y),
            ]);
            nBrush.selection = [
              [xi0, yi0],
              [xi1, yi1],
            ];

            nBrush.isActive = !!selectedBrush && selectedBrush[0] === brush[0];

            innerMap.set(brush[0], nBrush);
          }
        }
        outMap.set(brushGroup[0], innerMap);
      }
      return outMap;
    } */

  ts.addReferenceCurve = function (newCurves) {
    if (!newCurves || !Array.isArray(newCurves) || newCurves.length === 0)
      return;

    const processedNewCurves = generateCurvePoints(
      newCurves,
      overviewX.domain(),
      overviewY.domain()
    );

    const curvesForBVH = processedNewCurves.map((ref) => {
      const scaledData = ref.data.map((point) => [
        overviewX(point[0]),
        overviewY(point[1]),
      ]);
      return Object.assign({}, ref, { data: scaledData });
    });

    const bvh = brushes.getBvh();
    let collisionResults = [];
    if (bvh && typeof bvh.addReferenceCurves === "function") {
      collisionResults = bvh.addReferenceCurves(curvesForBVH) || [];
    } else {
      console.error(
        "BVH o la función addReferenceCurves no están disponibles."
      );
      return;
    }

    processedNewCurves.forEach((newCurve) => {
      const existingIndex = referenceCurves.findIndex(
        (c) => c.id === newCurve.id
      );
      const collisionData = collisionResults.find(
        (res) => res.refId === newCurve.id
      );

      if (collisionData) {
        newCurve.collisions = collisionData.collisions;
      }

      if (existingIndex !== -1) {
        referenceCurves[existingIndex] = newCurve;
      } else {
        referenceCurves.push(newCurve);
      }
    });

    brushes.recomputeSelection();

    renderBrushesControls();
    ts.printReferenceCurves(referenceCurves);
    ts.printSliders();
  };

 function generateCurvePoints(curves, domainX, domainY) {
    if (!Array.isArray(curves)) {
      throw new Error("The reference curves must be an array of Objects");
    }

    let unnamedCount = 1;
    curves.forEach((curve) => {
      if (!curve.id) {
        curve.id = `Reference Curve ${unnamedCount++}`;
      }
    });

    if (curves.length === 0) return []; // Nothing to process

    const isValidNumber = (n) => isFinite(n) && !isNaN(n);

    const processors = {
      function: (curve, numPoints) => {
        const xMin =
          curve.domain && curve.domain[0] !== undefined
            ? curve.domain[0]
            : domainX[0];
        const xMax =
          curve.domain && curve.domain[1] !== undefined
            ? curve.domain[1]
            : domainX[1];
        const step = (xMax - xMin) / numPoints;

        const points = [];
        for (let x = xMin; x <= xMax; x += step) {
          try {
            const y = curve.func(x);
            if (isValidNumber(y)) {
              points.push([x, y]);
            }
          } catch { /* noop */ }
        }
        return points;
      },

      parametric: (curve, numPoints) => {
        const tMin =
          curve.tRange && curve.tRange[0] !== undefined ? curve.tRange[0] : 0;
        const tMax =
          curve.tRange && curve.tRange[1] !== undefined
            ? curve.tRange[1]
            : 2 * Math.PI;
        const step = (tMax - tMin) / numPoints;

        const points = [];
        for (let t = tMin; t <= tMax; t += step) {
          try {
            const x = curve.xFunc(t);
            const y = curve.yFunc(t);
            if (isValidNumber(x) && isValidNumber(y)) {
              points.push([x, y]);
            }
          } catch { /* noop */ }
        }
        return points;
      },

      polynomial: (curve, numPoints) => {
        const xMin =
          curve.domain && curve.domain[0] !== undefined
            ? curve.domain[0]
            : domainX[0];
        const xMax =
          curve.domain && curve.domain[1] !== undefined
            ? curve.domain[1]
            : domainX[1];
        const step = (xMax - xMin) / numPoints;
        const coefficients = curve.coefficients;

        const points = [];
        for (let x = xMin; x <= xMax; x += step) {
          let y = 0;
          for (let i = coefficients.length - 1; i >= 0; i--) {
            y = y * x + coefficients[i];
          }
          if (isValidNumber(y)) {
            points.push([x, y]);
          }
        }
        return points;
      },
    };

    const processedCurves = curves
      .map((curve) => {
        // Usa curve.numPoints si existe y es válido, si no usa 10000 por defecto
        let numPoints =
          curve.numPoints && isFinite(curve.numPoints)
            ? curve.numPoints
            : 10000;
        curve.isVisible = true; // Add isVisible property to each curve
        const processedCurve = Object.assign({}, curve);
        processedCurve.collisionActive =
          typeof curve.collisionActive !== "undefined"
            ? curve.collisionActive
            : false;
        processedCurve.isSimplePoints =
          typeof curve.isSimplePoints !== "undefined"
            ? curve.isSimplePoints
            : true;
        processedCurve.epsilon =
          typeof curve.epsilon !== "undefined" ? curve.epsilon : 0;
        if (
          (processedCurve.color == null || processedCurve.color === "") &&
          ts &&
          typeof ts.brushesColorScale === "function"
        ) {
          processedCurve.color = ts.brushesColorScale(processedCurve.id);
        }
        if (typeof curve.collisions === "undefined") {
          processedCurve.collisions = null;
        }

        // Prioriza data existente (puntos simples o polilíneas) sobre generación de funciones
        if (curve.data && Array.isArray(curve.data) && curve.data.length > 0) {
          // Usa data existente sin generar nuevos puntosç
          processedCurve.data = curve.data;
        } else if (curve.func && typeof curve.func === "function") {
          processedCurve.data = processors.function(curve, numPoints);
        } else if (
          curve.xFunc &&
          curve.yFunc &&
          typeof curve.xFunc === "function" &&
          typeof curve.yFunc === "function"
        ) {
          processedCurve.data = processors.parametric(curve, numPoints);
        } else if (curve.coefficients && Array.isArray(curve.coefficients)) {
          processedCurve.data = processors.polynomial(curve, numPoints);
        } else {
          console.warn(
            "Curve without data or valid functions. Skipping.",
            curve
          );
          return null;
        }
        
        if (processedCurve.data && processedCurve.data.length === 1) {
          processedCurve.isSimplePoints = true;
        }

        return processedCurve;
      })
      .filter(Boolean);

    // Filtrar puntos por dominio (aplica a todos, ya sean generados o existentes)
    processedCurves.forEach((curve) => {
      if (
        !curve.data ||
        !Array.isArray(curve.data) ||
        curve.data.length === 0
      ) {
        curve.data = [];
        return;
      }
      curve.data = curve.data.filter((point) => {
        const [xVal, yVal] = point;
        return (
          xVal >= domainX[0] &&
          xVal <= domainX[1] &&
          yVal >= domainY[0] &&
          yVal <= domainY[1] &&
          isValidNumber(xVal) &&
          isValidNumber(yVal)
        );
      });

      curve.data.sort((a, b) => a[0] - b[0]);
    });

    return processedCurves;
  }
ts.printReferenceCurves = function (curves) {
    if (!overviewX) return;
    if (!Array.isArray(curves))
      throw new Error("The reference curves must be an array of Objects");

    // --- INICIO CÓDIGO NUEVO (1/2) ---
    // Creamos una copia de la escala Y pero sin la propiedad clamp.
    const unclampedY = overviewY.copy().clamp(false);
    // --- FIN CÓDIGO NUEVO (1/2) ---

    const visible = curves.filter((c) => c.isVisible !== false);

    const domainX = overviewX.domain();
    const domainY = overviewY.domain();
    visible.forEach((c) => {
      c.data.sort((a, b) => d3.ascending(a[0], b[0]));
      c.data = c.data.filter(
        (p) =>
          p[0] >= domainX[0] &&
          p[0] <= domainX[1] &&
          p[1] >= domainY[0] &&
          p[1] <= domainY[1]
      );
    });

    const lineCurves = visible.filter((c) => !c.isSimplePoints);
    const pointCurves = visible.filter((c) => c.isSimplePoints);


    const line2 = d3
      .line()
      .defined((d) => d[1] !== undefined && d[1] !== null)
      .x((d) => overviewX(d[0]))
      .y((d) => overviewY(d[1]));

    const lineSel = gReferences
      .selectAll("path.referenceCurve")
      .data(lineCurves, (d) => d.id);

    lineSel.exit().remove();

    lineSel
      .enter()
      .append("path")
      .attr("class", "referenceCurve")
      .merge(lineSel)
      .attr("d", (c) => line2(c.data))
      .attr("stroke-width", (c) => c.strokeWidth || 2)
      .style("fill", "none")
      .style("stroke", (c) => c.color)
      .style("opacity", (c) =>
        c.opacity !== undefined && c.opacity !== null ? c.opacity : 1
      );

    // --- LÓGICA PARA DIBUJAR PUNTOS Y SUS RADIOS DE TOLERANCIA ---
    const allPoints = [];
    pointCurves.forEach((c) => {
      c.data.forEach((p) => {
        allPoints.push({
          curveId: c.id,
          x: p[0],
          y: p[1],
          color: c.color,
          radius: c.pointRadius || 4,
          opacity:
            c.opacity !== undefined && c.opacity !== null ? c.opacity : 1,
          strokeColor: c.strokeColor || "#ffffff",
          strokeWidth: c.strokeWidth || 1,
          epsilon: c.epsilon || 0,
        });
      });
    });

    // Dibuja los círculos de tolerancia (el área de influencia)
    const toleranceSel = gReferences
      .selectAll("circle.referenceTolerance")
      .data(allPoints.filter(d => d.epsilon > 0), (d) => `${d.curveId}:${d.x},${d.y}`);

    toleranceSel.exit().remove();

    toleranceSel.enter()
      .append("circle")
      .attr("class", "referenceTolerance")
      .merge(toleranceSel)
      .attr("cx", (d) => overviewX(d.x))
      .attr("cy", (d) => overviewY(d.y))
      // --- INICIO CÓDIGO MODIFICADO (2/2) ---
      // Usamos la nueva escala "unclampedY" para que el radio pueda crecer fuera de los límites.
      .attr("r", d => Math.abs(unclampedY(0) - unclampedY(d.epsilon))) 
      // --- FIN CÓDIGO MODIFICADO (2/2) ---
      .style("fill", d => d.color)
      .style("stroke", d => d3.color(d.color).darker(0.5))
      .style("stroke-width", 1)
      .style("opacity", 0.2)
      .style("pointer-events", "none"); 

    // Dibuja los puntos de referencia (código original)
    const ptSel = gReferences
      .selectAll("circle.referencePoint")
      .data(allPoints, (d) => `${d.curveId}:${d.x},${d.y}`);

    ptSel.exit().remove();

    ptSel
      .enter()
      .append("circle")
      .attr("class", "referencePoint")
      .merge(ptSel)
      .attr("cx", (d) => overviewX(d.x))
      .attr("cy", (d) => overviewY(d.y))
      .attr("r", (d) => d.radius)
      .style("fill", (d) => d.color)
      .style("opacity", (d) => d.opacity)
      .style("stroke", (d) => d.strokeColor)
      .style("stroke-width", (d) => d.strokeWidth)
      .select(function () {
        return this;
      })
      .append("title")
      .text((d) => `${d.curveId}: (${d.x}, ${d.y})`);
  };

  ts.updateCallback = function (_) {
    return arguments.length ? ((updateCallback = _), ts) : updateCallback;
  };

  ts.statusCallback = function (_) {
    return arguments.length ? ((statusCallback = _), ts) : statusCallback;
  };

  ts.data = function (_data) {
    data = _data;
    log(" Processing data: ... ", data.length);
    // Ignore null values. Shouldn't be y(d) && x(d) because y(d) can be 0
    fData = data.filter(
      (d) =>
        y(d) !== undefined &&
        y(d) !== null &&
        x(d) !== undefined &&
        x(d) !== null
    );

    if (!fData || fData.length === 0) {
      divOverview.innerHTML = ''; 
      alert("No data available to display. Please load data.");
      return; 
    }

    let xDataType = typeof x(fData[0]);

    initDomains({ xDataType, fData });

    fData = fData.filter(
      (d) => !isNaN(overviewX(x(d))) && !isNaN(overviewY(y(d)))
    );

    groupedData = d3.groups(fData, id);

    groupedData.map((d) => [
      d[0],
      d[1].sort((a, b) => d3.ascending(x(a), x(b))),
    ]);

    ts.alphaScale.domain([0, groupedData.length]);

    // Limit the number of timelines
    if (maxTimelines) groupedData = groupedData.slice(0, maxTimelines);
    init();

    timelineOverview.setScales({
      scaleX: overviewX,
      scaleY: overviewY,
    });
    timelineOverview.data(groupedData);

    generateDataSelectionDiv();

    initDetails({ overviewX, overviewY });

    dataSelected.set(0, []);
    renderSelected = dataSelected;
    dataNotSelected = groupedData;
    renderNotSelected = dataNotSelected;

    if (_this) brushes.addFilters(_this.value.status, true);
    else if (filters) brushes.addFilters(filters, true);

    onSelectionChange();
  };

  // If we receive the data on initialization call ts.Data
  if (data && x && y && id) {
    ts.data(data);
  } else {
    overviewX = d3
      .scaleLinear()
      .range([0, width - ts.margin.right - ts.margin.left]);

    overviewY = d3
      .scaleLinear()
      .range([height - ts.margin.top - ts.margin.bottom, 0])
      .nice()
      .clamp(true);
    init();
  }

  if (referenceCurves) {
    ts.printReferenceCurves(referenceCurves);
    ts.printSliders();
  }

  // To allow a message from the outside to rerender
  ts.render = () => {
    // render(dataSelected, dataNotSelected);
    onSelectionChange();
  };

  // Renderizado directo: llama a render() con el estado cacheado, sin recalcular
  // medianas, reconstruir Maps ni disparar eventos. Usar solo para benchmarking.
  ts.renderDirect = () => {
    render(renderSelected, renderNotSelected, brushes.hasSelection());
  };

  // Espera sincronización GPU (WebGPU async). Canvas resuelve inmediatamente.
  // Necesario para medir tiempos reales de GPU en benchmarks.
  ts.syncGPU = () => timelineOverview.syncGPU();

  // Sincronización equitativa para comparación canvas vs webgpu:
  //   WebGPU → onSubmittedWorkDone()
  //   Canvas 2D → getImageData(0,0,1,1) fuerza flush de rasterización Skia
  ts.syncRenderer = () => timelineOverview.syncRenderer();

  // Remove possible previous event listener
  //target.removeEventListener("TimeWidget", onTimeWidgetEvent);

  // Make the ts object accessible
  divOverview.ts = ts;
  divOverview.details = detailsElement;
  divOverview.brushesCoordinates = brushesCoordinates;
  divOverview.groups = groupsElement;

  // Sistema de ayuda: abrir la documentación o la demo guiada desde fuera
  ts.showHelpPopup = () => helpSystem && helpSystem.showHelp();
  ts.startTour = () => helpSystem && helpSystem.startTour();

  // Exponer funciones para automatización
  ts.selectBrush = (groupId, brushId) => {
    brushes.selectBrush(groupId, brushId);
  };
  ts.getBrushesGroup = () => {
    return brushes.getBrushesGroup();
  };

  return divOverview;
}

export default TimeWidget;
