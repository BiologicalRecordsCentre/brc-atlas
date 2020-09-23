import * as d3 from 'd3'
import { createTrans, namedTransOpts, getTweenTransOpts } from './svgCoords.js'
import { constants } from './constants.js'
import { optsDialog, showOptsDialog } from './svgOptsDialog.js'
import { dataAccessors } from './dataAccess.js'
import { showImage, setImagePriorities, transformImages } from './svgImages.js'
import { drawDots, removeDots } from './svgDots.js'
import { svgLegend } from './svgLegend.js'

/**
 * @typedef {Object} transOptsSel
 * @property {transOpts} key - there must be at least one, but potentially more, properties
 * on this object, each describing a map 'transformation'.
 */

/**
 * @typedef {Object} transOpts - A 'transformation' object simply defines the extents of the
 * map, potentially with insets too.
 * @property {string} id - this must match the key by which the object is accessed through
 * the parent object.
 * @property {string} caption - a human readable name for this transformation options object.
 * @property {transOptsBounds} bounds - an object defining the extents of the map.
 * @property {Array.<transOptsInset>} insets - an array of objects defining the inset portions of the map. 
 */

/**
 * @typedef {Object} transOptsInset - an object defining an inset for a map, i.e. part of a map
 * which will be displayed in a different location to that in which it is actually found 
 * @property {transOptsBounds} bounds - an object defining the extents of the inset.
 * @property {number} imageX - a value defining where the inset will be displayed
 * (displaced) on the SVG. If the number is positive it represents the number of 
 * pixels the left boundary of the inset will be positioned from the left margin of
 * the SVG. If it is negative, it represents the number of pixels the right boundary
 * of the inset will be positioned from the right boundary of the SVG.
 * @property {number} imageY - a value defining where the inset will be displayed
 * (displaced) on the SVG. If the number is positive it represents the number of 
 * pixels the botton boundary of the inset will be positioned from the bottom margin of
 * the SVG. If it is negative, it represents the number of pixels the top boundary
 * of the inset will be positioned from the top boundary of the SVG.
 */

 /**
 * @typedef {Object} transOptsBounds - an object defining the extents of the map, 
 * or portion of a mpa, in the projection system
 * you want to use (either British Nation Gid, Irish National Grid or UTM 30 N for Channel Islands).
 * properties on this element are xmin, ymin, xmax and ymax.
 * @property {number} xmin - the x value for the lower left corner.
 * @property {number} ymin - the y value for the lower left corner.
 * @property {number} xmax - the x value for the top right corner.
 * @property {number} ymax - the y value for the top right corner.
 */

/**
 * @typedef {Object} api
 * @property {function} setBoundaryColour - change the colour of the boundary. Pass a single argument
 * which is a string specifying the colour which can be hex format, e.g. #FFA500, 
 * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red.
 * @property {function} setTransform - set the transformation options object by passing a single argument
 * which is a string indicating the key of the transformation in the parent object.
 * @property {function} getMapWidth - gets and returns the current width of the SVG map. 
 * @property {function} animateTransChange - set the a new transormation object and animates the transition.
 * @property {function} setIdentfier - identifies data to the data accessor function.
 * @property {function} setMapType - set the key of the data accessor function.
 * @property {function} basemapImage - specifies an image and world file for a basemap.
 * @property {function} baseMapPriorities - identifies the display order of the basemap images.
 * @property {function} setLegendOpts - sets options for the legend.
 * @property {function} redrawMap - redraw the map.
 * @property {function} clearMap - clear the map.
 */

/**
 * @param {Object} opts - initialisation options.
 * @param {string} opts.selector - the CSS selector of the element which will be the parent of the SVG.
 * @param {string} opts.mapid - the id for the static map to be created.
 * @param {string} opts.proj - the projection of the map, should be 'gb', 'ir' or 'ci'. It should 
 * reflect the projection of boundary and grid data displayed on the map. It is used to generate the 'dots'
 * in the correct location.
 * @param {number} opts.captionId - the id of a DOM element into which feature-specific HTML will be displayed
 * as the mouse moves over a dot on the map. The HTML markup must be stored in an attribute called 'caption'
 * in the input data.
 * @param {number} opts.height - the desired height of the SVG.
 * @param {boolean} opts.expand - indicates whether or not the map will expand to fill parent element.
 * @param {legendOpts} opts.legendOpts - sets options for a map legend.
 * @param {transOptsSel} opts.transOptsSel - sets a collection of map transformation options.
 * @param {string} opts.transOptsKey - sets the key of the selected map transformation options. Must be
 * present in as a key in the opts.transOptsSel object.
 * @param {boolean} opts.transOptsControl - indicates whether or not a control should be shown in the
 * bottom-right of the map that can be used display a dialog to change the transformation options.
 * @param {Object} opts.mapTypesSel - sets an object whose properties are data access functions. The property
 * names are the 'keys' which should be human readable descriptiosn of the map types.
 * @param {string} opts.mapTypesKey - sets the key of the selected data accessor function (map type).
 * @param {boolean} opts.mapTypesControl - indicates whether or not a control should be shown in the
 * bottom-right of the map that can be used display a dialog to change the data accessor (map type) options.
 * @param {string} opts.boundaryGjson - the URL of a boundary geoJson file to display.
 * @param {string} opts.gridGjson - the URL of a grid geoJson file to display.
 * @param {string} opts.gridLineColour - specifies the line colour of grid line geoJson.
 * @param {string} opts.boundaryColour - specifies the line colour of the boundary geoJson.
 * @param {string} opts.boundaryFill - specifies the fill colour of the boundary geoJson.
 * @param {string} opts.seaFill - specifies the fill colour of the area outside the boundary geoJson.
 * @param {string} opts.insetColour - specifies the line colour of map inset boxes.
 * @param {function} opts.callbackOptions - specifies a callback function to be executed if user options dialog used.
 * @returns {api} api - returns an API for the map.
 */
export function svgMap({
  // Default options in here
  selector = 'body',
  mapid = 'svgMap',
  proj = 'gb',
  captionId = '',
  height = 500,
  expand = false,
  legendOpts = {display: false},
  transOptsKey = 'BI1',
  transOptsSel = namedTransOpts,
  transOptsControl = true,
  mapTypesKey = 'Standard hectad',
  mapTypesSel = dataAccessors,
  mapTypesControl = false,
  boundaryGjson = `${constants.cdn}/assets/GB-I-CI-27700-reduced.geojson`,
  gridGjson = `${constants.cdn}/assets/GB-I-grid-27700-reduced.geojson`,
  gridLineColour = '7C7CD3',
  boundaryColour = '7C7CD3',
  boundaryFill = 'white',
  seaFill = 'E6EFFF',
  insetColour = '7C7CD3',
  callbackOptions=null
} = {}) {

  let trans, basemaps, boundary, boundaryf, dataBoundary, grid, dataGrid, taxonIdentifier

  // Create a parent div for the SVG within the parent element passed
  // as an argument. Allows us to style correctly for positioning etc.
  const mainDiv = d3.select(`${selector}`)
    .append("div")
    .attr('id', mapid)
    .style("position", "relative")
    .style("display", "inline")

  // Create the SVG.
  const svg = mainDiv.append("svg")
    //.attr('id', mapid)
    .style("background-color", seaFill)
  svg.append('defs')

  // Create the SVG graphic objects that store the major map elements.
  // The order these is created is important since it affects the order
  // in which they are rendered (i.e. what is drawn over what).
  boundaryf = svg.append("g").attr("id", "boundaryf")
  basemaps = svg.append("g").attr("id", "backimage")
  boundary = svg.append("g").attr("id", "boundary")
  grid = svg.append("g").attr("id", "grid")

  // Options dialog. 
  if ((transOptsControl && Object.keys(transOptsSel).length > 1) || 
    (mapTypesControl && Object.keys(mapTypesSel).length > 1)) {
    // Add gear icon to invoke options dialog
    mainDiv.append("img")
      .attr("src", "../images/gear.png")
      .style("width", "16px")
      .style("position", "absolute")
      .style("right", "5px")
      .style("bottom", "7px")
      .on("click", function(){
        showOptsDialog(mapTypesKey, transOptsSel, transOptsKey)
      })
    // Create options dialog
    optsDialog(selector, transOptsSel, transOptsKey, transOptsControl, mapTypesSel, mapTypesKey, mapTypesControl, userChangedOptions)
  }

  // Initialise the display
  trans = createTrans(transOptsSel[transOptsKey], height)
  setSvgSize()
  drawInsetBoxes()

  // Load boundary data
  let pBoundary, pGrid
  if (boundaryGjson){
    pBoundary = d3.json(boundaryGjson).then(data => {
      dataBoundary = data
    })
  } else {
    pBoundary = Promise.resolve()
  }

  // Load grid data
  if (gridGjson){
    pGrid = d3.json(gridGjson).then(data => {
      dataGrid = data
    })
  } else {
    pGrid = Promise.resolve()
  }

  // Once loaded, draw booundary and grid
  Promise.all([pBoundary, pGrid]).then(() => {
    drawBoundaryAndGrid()
  })

  // End of initialisation

  function userChangedOptions(opts) {
    if (opts.transOptsKey && transOptsKey !== opts.transOptsKey){
      transOptsKey = opts.transOptsKey
      trans = createTrans(transOptsSel[transOptsKey], height)
      drawBoundaryAndGrid()
      setSvgSize()
      drawInsetBoxes()
      refreshMapDots()
      transformImages(basemaps, trans)
    }
    if (opts.mapTypesKey && mapTypesKey !== opts.mapTypesKey){
      mapTypesKey = opts.mapTypesKey
      drawMapDots()
    }
    if (callbackOptions) {
      callbackOptions()
    }
  }

  function setSvgSize(){
    if (svg) {
      // Set width/height or viewbox depending on required behaviour
      if (expand) {
        svg.attr("viewBox", "0 0 " + trans.width + " " +  trans.height)
      } else {
        svg.attr("width", trans.width)
        svg.attr("height", trans.height)
      }
    }
  }

  function drawBoundaryAndGrid() {
    if (dataBoundary) {
      boundaryf.selectAll("path").remove()
      boundaryf.append("path")
        .datum(dataBoundary)
        .attr("d", trans.d3Path)
        .style("stroke-opacity", 0)
        .style("fill", boundaryFill)
      boundary.selectAll("path").remove()
      boundary.append("path")
        .datum(dataBoundary)
        .attr("d", trans.d3Path)
        .style("fill-opacity", 0)
        .style("stroke", boundaryColour)
    }
    if (dataGrid) {
      grid.selectAll("path").remove()
      grid.append("path")
        .datum(dataGrid)
        .attr("d", trans.d3Path)
        .style("fill-opacity", 0)
        .style("stroke", gridLineColour)
    }
  }

  function drawInsetBoxes() {
    svg.selectAll('.inset').remove()
    trans.insetDims.forEach(function(i){
      const margin = 10 
      svg.append('rect')
        .classed('inset', true)
        .attr('x', i.x - margin)
        .attr('y', i.y - margin)
        .attr('width', i.width + 2 * margin)
        .attr('height', i.height + 2 * margin)
        .style('fill', 'transparent')
        .style('stroke', insetColour)
    })
  }

  function drawMapDots() {
    drawDots(svg, captionId, trans.point, mapTypesSel[mapTypesKey], taxonIdentifier, proj)
      .then (data => {
        svg.select('#legend').remove()
        legendOpts.accessorData = data.legend
        if (legendOpts.display && (legendOpts.data || legendOpts.accessorData)) {
          svgLegend(svg, legendOpts)
        }  
    })
  }

  function refreshMapDots() {
    removeDots(svg)
    drawMapDots()
  }

/** @function - setTransform
  * @param {string} newTransOptsKey - specifies the key of the transformation object in the parent object.
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * The method sets a map transforamation by selecting the one with the passed in key. It also
  * redisplays the map 
  */
  function setTransform (newTransOptsKey) {
    transOptsKey = newTransOptsKey
    trans = createTrans(transOptsSel[transOptsKey], height)
    drawBoundaryAndGrid()
    setSvgSize()
    drawInsetBoxes()
    refreshMapDots()
    transformImages(basemaps, trans)
  }

/** @function - animateTransChange
  * @param {string} newTransOptsKey - specifies the key of the transformation object in the parent object.
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * The method sets a map transformation by selecting the one with the passed in key. It also
  * redisplays the map but animates the transition between the new transformation object and the
  * previous.
  */
  function animateTransChange(newTransOptsKey) {
    const lastTransOptsKey = transOptsKey
    svg.selectAll('.inset').remove() // remove inset boxes
    removeDots(svg)  // remove dots
    const incr = 10
    for (let i=1; i<=incr + 1; i++){
      const tto = getTweenTransOpts(lastTransOptsKey, newTransOptsKey, height, i/incr)
      setTimeout(() => {
        trans = createTrans(tto, height)
        drawBoundaryAndGrid()
        setSvgSize()
        transformImages(basemaps, trans)
        if (i > incr) {
          setTransform(newTransOptsKey)
        }
      }, 1000 * i / incr)
    }
  }

/** @function - setBoundaryColour
  * @param {string} c - a string specifying the colour which can be hex format, e.g. #FFA500, 
  * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red.
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * The method sets a map transformation by selecting the one with the passed in key. 
  * Sets the boundary colour to the specified colour.
  */
  function setBoundaryColour(c){
    boundary.style("stroke", c)
  }

/** @function - setIdentfier
  * @param {string} identifier - a string which identifies some data to 
  * a data accessor function.
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * The data accessor function, specified elsewhere, will use this identifier to access
  * the correct data.
  */
  function setIdentfier(identifier) {
    taxonIdentifier = identifier
  }

/** @function - setMapType
  * @param {string} newMapTypesKey - a string which a key used to identify a data accessor function. 
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * The data accessor is stored in the mapTypesSel object and referenced by this key.
  */
  function setMapType(newMapTypesKey) {
    mapTypesKey = newMapTypesKey
  }

/** @function - basemapImage
  * @param {string} mapId - a string which should specify a unique key by which the image can be referenced. 
  * @param {boolean} show - a boolean value that indicates whether or not to display this image. 
  * @param {string} imageFile - a string identifying an image file. 
  * @param {string} worldFile - a string identifying a 'world' file. 
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * The image and world files together make a raster file that can be displayed in GIS. GIS, such as
  * QGIS can be used to create the image and world file. If you do this, make sure that the image
  * is created with the same projection as used for the SVG map - i.e. same projection as the vector
  * data for boundary and/or grid files.
  */
  function basemapImage(mapId, show, imageFile, worldFile) {
    // API
    showImage(mapId, show, basemaps, imageFile, worldFile, trans)
  }
  
/** @function - baseMapPriorities
  * @param {Array.<string>} mapIds - an array of strings which identify keys of basemap iamges.
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * The order the keys appear in the array specifies their priority when more than one is displayed
  * at the same time. Those at the start of the array have higher priority than those and the end.
  */
  function baseMapPriorities(mapIds) {
    // API
    setImagePriorities(basemaps, mapIds)
  }

/** @function - setLegendOpts
  * @param {legendOpts} lo - a legend options object.
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * The legend options object can be used to specify properties of a legend and even the content
  * of the legend itself.
  */
  function setLegendOpts(lo) {
    // API
    legendOpts = lo
  }

/** @function - redrawMap
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * Redraw the map, e.g. after changing map accessor function or map identifier.
  */
  function redrawMap(){
    // API
    drawMapDots()
  }

/** @function - clearMap
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * Clear the map of dots and legend.
  */
  function clearMap(){
    // API
    svg.select('#legend').remove()
    removeDots(svg)
  }

/** @function - getMapWidth
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * Return the width of the map.
  */
 function getMapWidth(){
  // API
  return trans.width
}

  // Return the publicly accessible API
  return {
    setBoundaryColour: setBoundaryColour,
    setTransform: setTransform,
    getMapWidth: getMapWidth,
    animateTransChange: animateTransChange,
    setIdentfier: setIdentfier,
    setMapType: setMapType,
    basemapImage: basemapImage,
    baseMapPriorities: baseMapPriorities,
    setLegendOpts: setLegendOpts,
    redrawMap: redrawMap,
    clearMap: clearMap
  }
}