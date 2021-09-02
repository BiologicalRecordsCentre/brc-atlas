/** @module svgMap */

import * as d3 from 'd3'
import { createTrans, namedTransOpts, getTweenTransOpts } from './svgCoords.js'
import { constants } from './constants.js'
import { optsDialog, showOptsDialog } from './svgOptsDialog.js'
import { dataAccessors } from './dataAccess.js'
import { showImage, setImagePriorities, transformImages } from './svgImages.js'
import { drawDots, removeDots } from './svgDots.js'
import { svgLegend } from './svgLegend.js'
import { rasterize, serialize } from './savesvg.js'

/** 
 * @param {Object} opts - Initialisation options.
 * @param {string} opts.selector - The CSS selector of the element which will be the parent of the SVG.
 * @param {string} opts.mapid - The id for the static map to be created.
 * @param {string} opts.proj - The projection of the map, should be 'gb', 'ir' or 'ci'. It should 
 * reflect the projection of boundary and grid data displayed on the map. It is used to generate the 'dots'
 * in the correct location.
 * @param {string} opts.captionId - The id of a DOM element into which feature-specific HTML will be displayed
 * as the mouse moves over a dot on the map. The HTML markup must be stored in an attribute called 'caption'
 * in the input data.
* @param {function} opts.onclick - A function that will be called if user clicks on a map
 * element. The function will be passed these attributes, in this order, if they exist on the
 * element: gr, id, caption. (Default - null.)
 * @param {number} opts.height - The desired height of the SVG.
 * @param {boolean} opts.expand - Indicates whether or not the map will expand to fill parent element.
 * @param {legendOpts} opts.legendOpts - Sets options for a map legend.
 * @param {module:svgCoords~transOptsSel} opts.transOptsSel - Sets a collection of map transformation options.
 * @param {string} opts.transOptsKey - Sets the key of the selected map transformation options. Must be
 * present in as a key in the opts.transOptsSel object.
 * @param {boolean} opts.transOptsControl - Indicates whether or not a control should be shown in the
 * bottom-right of the map that can be used display a dialog to change the transformation options.
 * @param {Object} opts.mapTypesSel - Sets an object whose properties are data access functions. The property
 * names are the 'keys' which should be human readable descriptiosn of the map types.
 * @param {string} opts.mapTypesKey - Sets the key of the selected data accessor function (map type).
 * @param {boolean} opts.mapTypesControl - Indicates whether or not a control should be shown in the
 * bottom-right of the map that can be used display a dialog to change the data accessor (map type) options.
 * @param {string} opts.boundaryGjson - The URL of a boundary geoJson file to display.
 * @param {string} opts.gridGjson - The URL of a grid geoJson file to display.
 * @param {string} opts.gridLineColour - Specifies the line colour of grid line geoJson.
 * @param {string} opts.boundaryColour - Specifies the line colour of the boundary geoJson.
 * @param {string} opts.boundaryFill - Specifies the fill colour of the boundary geoJson.
 * @param {string} opts.seaFill - Specifies the fill colour of the area outside the boundary geoJson.
 * @param {string} opts.insetColour - Specifies the line colour of map inset boxes.
 * @param {function} opts.callbackOptions - Specifies a callback function to be executed if user options dialog used.
 * @returns {module:svgMap~api} api - Returns an API for the map.
 */
export function svgMap({
  // Default options in here
  selector = 'body',
  mapid = 'svgMap',
  proj = 'gb',
  captionId = '',
  onclick = null,
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
  gridLineColour = '#7C7CD3',
  boundaryColour = '#7C7CD3',
  boundaryFill = 'white',
  seaFill = '#E6EFFF',
  insetColour = '#7C7CD3',
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

  // Map loading spinner
  const mapLoader = mainDiv.append("div")
    .classed('map-loader', true)
  const mapLoaderInner = mapLoader.append("div")
    .classed('map-loader-inner', true)
  mapLoaderInner.append("div")
    .classed('map-loader-spinner', true)
  mapLoaderInner.append("div").text("Loading map data...")
    .classed('map-loader-text', true)

  // Create the SVG.
  const svg = mainDiv.append("svg")
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
      //.attr("src", "../images/gear.png")
      .attr("src", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD8AAAA/CAYAAABXXxDfAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAAPlSURBVGhD7ZprT+pAEIYLKBrjDULiH+SjGo0kahQMASLGmBiF+Bf9YowEvOseXp1i4fQys93WYnkS425Ttvvuzu7sTJtRSllpJUv/U0mqxcdm9sfHx2p+fp5q7ry9vVnNZjND1ciJbeaDhAPOPSaZrfm0MhOvQ6VSYe+UNzc3kdwr6YMbYvHX19eqXq+rlZUVC//psi8PDw9UCoZ7r7QPbohc3dnZmXp+fqbaD4uLi9b+/r6ni6rVaiqXy1HNn8/PTwjybOv09FS9vr5S7Yd8Pm8dHh6K3CR75of+11U4wHX4caqO0e122cJBNuvdpWq16ioc4DoGhqosWDN/fn6uHh8fqebPycnJ1+hLZtsLpxVwzXttbc3a2dlhWQBLfJh19RvYExBEoNlPm3DA7bO2q/sLBIrnmlCSMGb2YJoGQNJXttnPzc1RKblIvQtb/NHRUQbxdlKBnx+eNUQWKtrwTCYaMJBeBxYdWq2WuG/iTE6n01F3d3dU48PJ0nCyPW4Ui0Vra2srevE6fl+6YcbxDCAyeykwa51O4Tdx7C8i8cNNjz0j6LzOOrTBEpEMgFdg5YdIPMJGLiY2R0kbOnvF2Jpvt9vq5eXFQgQHobq+vVAoWNvb26HFg4uLC9Xv96kmA5bz8fHxpWV9fd3a3d0d69PYzEM4WFpaCnWoMSUc7O3tabcFa0CiBTmCXq9HV38YiUeWhoqheH9/p5I5TLU5qXEk/unpiUrh2NjYoJI5Go2GEUsaDAZU+mYk3jb5sGxubhozedNg/TsR7fbTDtJiTkbi/RKHf5WpEI8MMBVDsbCwQKVvRoqXl5epFA6kl6lojNvbWyqFA27PyUi830sHCVEkPUy1WSqVqPTNmK3jJIRdP2ycjVMZFX8daME5AVmecrk8NsGikFYSaupEc25E+UzRLhd1lDWJpA2dEFgkXhplhRkAaVZHJ4oUiZeCzutkZfAbnRBVijiNdXV1pe7v76nGB2YZNDvS2bZJdA5vEuy+8CqZTCZU3sCJzgYrEq87M3GAAZVGf+w1j1g4qcIBrAeZKKqyYIv3+iojSUjDcpZ4E+s8LiR9DRQ/TcJtuH2O1M8nnUDxps7occLtM2vmkcrmggfjz0TGFW3Y7dGlQCZjdj/Yfn7oQ9VkDsyJ1wlO50To9TlZ0DkDh6ZarcYeKPaar1arw7bd20Ws7HV0xQuMyaypH7jX6zs6PMPrlRn8vEQ4EB9vLy8vlfP7WI5J2q/BOCDPdnBwENimc0dfXV3971UUB/Fuj1mxBXPXIjrHhXuvsw86woF45nXh+l7ugJpg5ufTykx8Woltw0siM7NPJ5b1D5gX4NZABY0OAAAAAElFTkSuQmCC")
      .style("width", "16px")
      .style("position", "absolute")
      .style("right", "5px")
      .style("bottom", "7px")
      .on("click", function(){
        showOptsDialog(mapid, mapTypesKey, transOptsSel, transOptsKey)
      })
    // Create options dialog
    optsDialog(mapid, transOptsSel, transOptsKey, transOptsControl, mapTypesSel, mapTypesKey, mapTypesControl, userChangedOptions)
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
    mapLoader.classed('map-loader-hidden', true)
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
    svg.select('#legend').remove() // Remove here to avoid legend resizing if inset options changed.
    drawDots(svg, captionId, onclick, trans.point, mapTypesSel[mapTypesKey], taxonIdentifier, proj)
      .then (data => {
        svg.select('#legend').remove() // Also must remove here to avoid some bad effects. 
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

/** @function setTransform
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

/** @function animateTransChange
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

/** @function setBoundaryColour
  * @param {string} c - a string specifying the colour which can be hex format, e.g. #FFA500, 
  * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red.
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * Sets the boundary colour to the specified colour.
  */
  function setBoundaryColour(c){
    boundary.style("stroke", c)
  }

/** @function setGridColour
  * @param {string} c - a string specifying the colour which can be hex format, e.g. #FFA500, 
  * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red.
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * Sets the grid colour to the specified colour.
  */
  function setGridColour(c){
    grid.style("stroke", c)
  }
  

/** @function setIdentfier
  * @param {string} identifier - a string which identifies some data to 
  * a data accessor function.
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * The data accessor function, specified elsewhere, will use this identifier to access
  * the correct data.
  */
  function setIdentfier(identifier) {
    taxonIdentifier = identifier
  }

/** @function setMapType
  * @param {string} newMapTypesKey - a string which a key used to identify a data accessor function. 
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * The data accessor is stored in the mapTypesSel object and referenced by this key.
  */
  function setMapType(newMapTypesKey) {
    mapTypesKey = newMapTypesKey
  }

/** @function basemapImage
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
    showImage(mapId, show, basemaps, imageFile, worldFile, trans)
  }
  
/** @function baseMapPriorities
  * @param {Array.<string>} mapIds - an array of strings which identify keys of basemap iamges.
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * The order the keys appear in the array specifies their priority when more than one is displayed
  * at the same time. Those at the start of the array have higher priority than those and the end.
  */
  function baseMapPriorities(mapIds) {
    setImagePriorities(basemaps, mapIds)
  }

/** @function setLegendOpts
  * @param {legendOpts} lo - a legend options object.
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * The legend options object can be used to specify properties of a legend and even the content
  * of the legend itself.
  */
  function setLegendOpts(lo) {
    legendOpts = lo
  }

/** @function redrawMap
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * Redraw the map, e.g. after changing map accessor function or map identifier.
  */
  function redrawMap(){
    drawMapDots()
  }

/** @function clearMap
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * Clear the map of dots and legend.
  */
  function clearMap(){
    svg.select('#legend').remove()
    removeDots(svg)
  }

/** @function getMapWidth
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * Return the width of the map.
  */
  function getMapWidth(){
    return trans.width
  }

/** @function saveMap
  * @param {boolean} asSvg - a boolean value that indicates whether to generate an SVG (if false, generates PNG image). 
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * Creates an image from the displayed map and downloads to user's computer.
  */
  function saveMap(asSvg) {

    const download = (data) => {

      console.log('data', data)

      const dataUrl = URL.createObjectURL(data)
      // Create a link element
      const link = document.createElement("a")
      // Set link's href to point to the data URL
      link.href = dataUrl
      link.download = asSvg ? 'map.svg' : 'map.png'

      // Append link to the body
      document.body.appendChild(link)

      // Dispatch click event on the link
      // This is necessary as link.click() does not work on the latest firefox
      link.dispatchEvent(
        new MouseEvent('click', { 
          bubbles: true, 
          cancelable: true, 
          view: window 
        })
      )
      // Remove link from body
      document.body.removeChild(link)
    }

    if (asSvg) {
      download(serialize(svg))
    } else {
      rasterize(svg).then(blob => {
        download(blob)
      })
    }
  }

  /**
   * @typedef {Object} api
   * @property {module:svgMap~setBoundaryColour} setBoundaryColour - Change the colour of the boundary. Pass a single argument
   * which is a string specifying the colour which can be hex format, e.g. #FFA500, 
   * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red.
   * @property {module:svgMap~setGridColour} setGridColour - Change the colour of the grid. Pass a single argument
   * which is a string specifying the colour which can be hex format, e.g. #FFA500, 
   * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red.
   * @property {module:svgMap~setTransform} setTransform - Set the transformation options object by passing a single argument
   * which is a string indicating the key of the transformation in the parent object.
   * @property {module:svgMap~getMapWidth} getMapWidth - Gets and returns the current width of the SVG map. 
   * @property {module:svgMap~animateTransChange} animateTransChange - Set the a new transormation object and animates the transition.
   * @property {module:svgMap~setIdentfier} setIdentfier - Identifies data to the data accessor function.
   * @property {module:svgMap~setMapType} setMapType - Set the key of the data accessor function.
   * @property {module:svgMap~basemapImage} basemapImage - Specifies an image and world file for a basemap.
   * @property {module:svgMap~baseMapPriorities} baseMapPriorities - Identifies the display order of the basemap images.
   * @property {module:svgMap~setLegendOpts} setLegendOpts - Sets options for the legend.
   * @property {module:svgMap~redrawMap} redrawMap - Redraw the map.
   * @property {module:svgMap~clearMap} clearMap - Clear the map.
   * @property {module:svgMap~saveMap} saveMap - Save and download the map as an image.
   */
  return {
    setBoundaryColour: setBoundaryColour,
    setGridColour: setGridColour,
    setTransform: setTransform,
    getMapWidth: getMapWidth,
    animateTransChange: animateTransChange,
    setIdentfier: setIdentfier,
    setMapType: setMapType,
    basemapImage: basemapImage,
    baseMapPriorities: baseMapPriorities,
    setLegendOpts: setLegendOpts,
    redrawMap: redrawMap,
    clearMap: clearMap,
    saveMap: saveMap
  }
}