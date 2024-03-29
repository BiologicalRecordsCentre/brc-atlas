/** @module svgMap */

import * as d3 from 'd3'
import { createTrans, namedTransOpts, getTweenTransOpts } from './svgCoords.js'
import { constants } from './constants.js'
import { optsDialog, showOptsDialog } from './svgOptsDialog.js'
import { dataAccessors } from './dataAccess.js'
import { showImage, setImagePriorities, transformImages } from './svgImages.js'
import { drawDots, removeDots } from './svgDots.js'
import { svgLegend } from './svgLegend.js'
import { saveMapImage, downloadCurrentData } from './download.js'

/** 
 * @param {Object} opts - Initialisation options.
 * @param {string} opts.selector - The CSS selector of the element which will be the parent of the SVG.
 * @param {string} opts.mapid - The id for the static map to be created.
 * @param {string} opts.proj - The projection of the map, should be 'gb', 'ir' or 'ci'. It should 
 * reflect the projection of boundary and grid data displayed on the map. It is used to generate the 'dots'
 * in the correct location.
 * @param {string} opts.captionId - The id of a DOM element into which feature-specific HTML will be displayed
 * as the mouse moves over a dot on the map. The HTML markup must be stored in an attribute called 'caption'
 * in the input data.boundaryFill
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
 * @param {string} opts.boundaryColour - Specifies the line colour of the boundary geoJson.
 * @param {string} opts.boundaryFill - Specifies the fill colour of the boundary geoJson.
 * @param {string} opts.boundaryShadowColour - Specifies the colour of a 'glowing' border.
 * @param {string} opts.boundaryShadowWidth - Species the width of the glowing border in pixels.
 * @param {string | number} opts.boundaryLineWidth - Specifies the width of the line to use for boundary geoJson lines. Can use any valid units for SVG stroke-width. (Default - 1.)
 * @param {string} opts.seaFill - Specifies the fill colour of the area outside the boundary geoJson.
 * @param {string} opts.insetColour - Specifies the line colour of map inset boxes.
 * @param {string} opts.gridGjson - The URL of a grid geoJson file to display.
 * @param {string} opts.gridLineColour - Specifies the line colour of grid line geoJson.
 * @param {string} opts.gridLineStyle - Specifies the line style of the grid line geoJson. Can be solid, dashed or none. (Default solid.)
 * @param {string | number} opts.gridLineWidth - Specifies the width of the line to use for grid lines geoJson. Can use any valid units for SVG stroke-width. (Default - 1.)
 * @param {string} opts.vcGjson - The URL of a vice county geoJson file to display.
 * @param {string} opts.vcColour - Specifies the line colour of the vice county geoJson.
 * @param {string} opts.vcLineStyle - Specifies the line style of the vice county line geoJson. Can none or something else (which gives solid line). (Default none.)
 * @param {string | number} opts.vcLineWidth - Specifies the width of the line to use for vice counties geoJson. Can use any valid units for SVG stroke-width. (Default - 1.)
 * @param {string} opts.countryGjson - The URL of a country geoJson file to display.
 * @param {string} opts.countryColour - Specifies the line colour of the country geoJson.
 * @param {string} opts.countryLineStyle - Specifies the line style of the country geoJson. Can none or something else (which gives solid line). (Default none.)
 * @param {string | number} opts.countryLineWidth - Specifies the width of the line to use for country lines geoJson. Can use any valid units for SVG stroke-width. (Default - 1.)
 * @param {string} opts.legendFont - Specifies the font to use for the legend. (Default - 'sans-serif'.)
 * @param {string} opts.legendFontSize - Specifies the font size to use for the legend. (Default - 14px.)
 * @param {string} opts.legendInteractivity - Indicates the behaviour of legend interactivity, can be 'mousemove', 'mouseclick' or 'none'. (Default - 'none'.)
 * @param {string} opts.highlightClass - For legend interactivity, specify a unique name to use for the highlight class. (Default - ''.)
 * @param {string} opts.highlightStyle - For legend interactivity, specify a string of css property and value pairs for highlight style. Separate pairs with semi-colon and property from value with colon. (Default - ''.)
 * @param {string} opts.lowlightStyle - For legend interactivity, specify a string of css property and value pairs for lowlight style. Separate pairs with semi-colon and property from value with colon. (Default - ''.)
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
  legendFontSize = '14px',
  legendFont = 'sans-serif',
  transOptsKey = 'BI1',
  transOptsSel = namedTransOpts,
  transOptsControl = true,
  mapTypesKey = 'Standard hectad',
  mapTypesSel = dataAccessors,
  mapTypesControl = false,
  boundaryGjson = `${constants.thisCdn}/assets/GB-I-CI-27700-reduced.geojson`,
  gridGjson = `${constants.thisCdn}/assets/GB-I-grid-27700-reduced.geojson`,
  vcGjson = `${constants.thisCdn}/assets/GB-I-vcs-27700-reduced.geojson`,
  countryGjson = `${constants.thisCdn}/assets/GB-I-countries-27700-reduced.geojson`,
  gridLineColour = '#7C7CD3',
  gridLineStyle = 'solid',
  gridLineWidth = 1,
  vcLineStyle = 'none',
  vcColour = '#7C7CD3',
  vcLineWidth = 1,
  countryLineStyle = 'none',
  countryColour = '#7C7CD3',
  countryLineWidth = 1,
  boundaryColour = '#7C7CD3',
  boundaryFill = 'white',
  boundaryLineWidth = 1,
  boundaryShadowColour = '#E6EFFF',
  boundaryShadowWidth = 0,
  seaFill = '#E6EFFF',
  insetColour = '#7C7CD3',
  insetLineWidth = 1,
  callbackOptions=null,
  legendInteractivity='none',
  highlightClass='',
  highlightStyle='',
  lowlightStyle='',
} = {}) {

  // Make a new style sheet from highlight/lowlight styles
  // Make separate ones for text with fill style removed
  // so that colour of legend text is not affected. 
  // Add !important to all styles in order to override
  // values set on elements.
  if (highlightClass) {
    const sheet = document.createElement('style')
    document.body.appendChild(sheet)
    sheet.innerHTML = `
      .${highlightClass} {${createStyle(highlightStyle)}}
      .${highlightClass}-low {${createStyle(lowlightStyle)}}
      .${highlightClass}-text {${createStyle(highlightStyle, true)}}
      .${highlightClass}-text-low {${createStyle(lowlightStyle, true)}}
    `
  }
  function createStyle(str, forText) {
    const styles = str.split(';')
    const styleStr = styles.reduce((a,s) => {
      const els = s.split(':')
      if (forText && els[0].trim() === 'fill') {
        return a
      } else {
        return `${a} ${els[0]}: ${els[1]} !important;`
      }
    }, '')
    return styleStr
  }

  let trans, basemaps, boundary, boundaryf, dataBoundary, grid, dataGrid, vc, dataVc, country, dataCountry, taxonIdentifier, title

  // Create a parent div for the SVG within the parent element passed
  // as an argument. Allows us to style correctly for positioning etc.
  const mainDiv = d3.select(`${selector}`)
    .append("div")
    .attr('id', mapid)
    .style("position", "relative")
    .style("display", "inline")

  // Map loading spinner
  let mapLoaderShowExplicit = false
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
   //svg.append('defs')
   const defs = svg.append('defs')
   const shadow = defs.append('filter').attr('id', 'shadow')
   shadow.append('feDropShadow').attr('dx', 0).attr('dy', 0).attr('stdDeviation', boundaryShadowWidth).attr('flood-color', boundaryShadowColour)

  // Create the SVG graphic objects that store the major map elements.
  // The order these is created is important since it affects the order
  // in which they are rendered (i.e. what is drawn over what).
  boundaryf = svg.append("g").attr("id", "boundaryf")
  basemaps = svg.append("g").attr("id", "backimage")
  boundary = svg.append("g").attr("id", "boundary")
  vc = svg.append("g").attr("id", "vc")
    .style("display", vcLineStyle === "none" ? "none" : "")
  country = svg.append("g").attr("id", "country")
    .style("display", countryLineStyle === "none" ? "none" : "")
  grid = svg.append("g").attr("id", "grid")
    .style("stroke-dasharray", gridLineStyle === "dashed" ? "3,2" : "")
    .style("display", gridLineStyle === "none" ? "none" : "")
  title = svg.append("g").attr("id", "title")

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
  let pBoundary, pGrid, pVc, pCountry
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

  // Load country data
  if (countryGjson) {
    pCountry = d3.json(countryGjson).then(data => {
      dataCountry = data
    })
  } else {
    pCountry = Promise.resolve()
  }

  // Load VC data
  if (vcGjson) {
    pVc = d3.json(vcGjson).then(data => {
      dataVc = data
    })
  } else {
    pVc = Promise.resolve()
  }

  // Once loaded, draw boundary and grid
  Promise.allSettled([pBoundary, pGrid, pVc, pCountry]).then(() => {
    drawBoundaryAndGrid()
    if (!mapLoaderShowExplicit) {
      mapLoader.classed('map-loader-hidden', true)
    }
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
      transformImages(basemaps, trans, seaFill)
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
    boundaryf.selectAll("path").remove()
    boundary.selectAll("path").remove()
    if (dataBoundary) {
      boundaryf.append("path")
        .datum(dataBoundary)
        .attr("d", trans.d3Path)
        .style("stroke-opacity", 0)
        .style("fill", boundaryFill)
        .style("filter", "url(#shadow)")
      boundary.append("path")
        .datum(dataBoundary)
        .classed('svg-map-boundary', true)
        .attr("d", trans.d3Path)
        .style("fill-opacity", 0)
        .style("stroke", boundaryColour)
        .style('stroke-width', boundaryLineWidth)
    }
    grid.selectAll("path").remove()
    if (dataGrid) {
      grid.append("path")
        .datum(dataGrid)
        .classed('svg-map-grid', true)
        .attr("d", trans.d3Path)
        .style("fill-opacity", 0)
        .style("stroke", gridLineColour)
        .style('stroke-width', gridLineWidth)
    }
    vc.selectAll("path").remove()
    if (dataVc) {
      vc.append("path")
        .datum(dataVc)
        .classed('svg-map-vcs', true)
        .attr("d", trans.d3Path)
        .style("fill-opacity", 0)
        .style("stroke", vcColour)
        .style('stroke-width', vcLineWidth)
    }
    country.selectAll("path").remove()
    if (dataCountry) {
      country.append("path")
        .datum(dataCountry)
        .classed('svg-map-countries', true)
        .attr("d", trans.d3Path)
        .style("fill-opacity", 0)
        .style("stroke", countryColour)
        .style('stroke-width', countryLineWidth)
    }
  }

  function drawInsetBoxes() {
    svg.selectAll('.svg-map-inset').remove()
    trans.insetDims.forEach(function(i){
      const margin = 10 
      svg.append('rect')
        .classed('svg-map-inset', true)
        .attr('x', i.x - margin)
        .attr('y', i.y - margin)
        .attr('width', i.width + 2 * margin)
        .attr('height', i.height + 2 * margin)
        .style('fill', 'none')
        .style('stroke', insetColour)
        .style('stroke-width', insetLineWidth)
    })
  }


  function drawMapDots() {
    // Returns a promise so that caller knows when data is loaded and transitions complete
    // (drawDots returns a promise which resolves when transitions complete)
    svg.select('#legend').remove() // Remove here to avoid legend resizing if inset options changed.
    return drawDots(svg, captionId, onclick, trans.point, mapTypesSel[mapTypesKey], taxonIdentifier, proj)
      .then (data => {
        if (data) {
          svg.select('#legend').remove() // Also must remove here to avoid some bad effects. 
          legendOpts.accessorData = data.legend
          if (legendOpts.display && (legendOpts.data || legendOpts.accessorData)) {
            svgLegend(svg, legendOpts, legendFontSize, legendFont, legendInteractivity, highlightClass)
          }  
        }
      })    
  }

  function refreshMapDots() {
    removeDots(svg)
    drawMapDots().catch(e => {
      //if (e !== "Data accessor not a function") {
        console.warn (e)
      //}
    })
  }

/** @function setTransform
  * @param {string} newTransOptsKey - specifies the key of the transformation object in the parent object.
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * The method sets a map transformation by selecting the one with the passed in key. It also
  * redisplays the map 
  */
  function setTransform (newTransOptsKey) {
    transOptsKey = newTransOptsKey
    trans = createTrans(transOptsSel[transOptsKey], height)
    drawBoundaryAndGrid()
    setSvgSize()
    drawInsetBoxes()
    refreshMapDots()
    transformImages(basemaps, trans, seaFill)
  }

/** @function setHeight
  * @param {string} newHeight - specifies the height of the SVG object.
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * The method resets the height of the main map SVG. 
  */
  function setHeight (newHeight) {
    height = newHeight
    // Removed the stuff below because the transformations
    // interferred with transformations triggered by other
    // methods when called straight afterwards. It is envisaged
    // that other methods would normally be called straight
    // after this one.

    // trans = createTrans(transOptsSel[transOptsKey], height)
    // drawBoundaryAndGrid()
    // setSvgSize()
    // drawInsetBoxes()
    // refreshMapDots()
    // transformImages(basemaps, trans, seaFill)
  }

/** @function setBoundary
  * @param {string} newGeojson - specifies the path of a geojson object.
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * The method replaces any existing map boundary geojson with the geojson in the file passed. It also
  * redisplays the map.
  */
  function setBoundary(newGeojson) {
    if (newGeojson) {
      pBoundary = d3.json(newGeojson).then(data => {
        dataBoundary = data
        drawBoundaryAndGrid()
      })
    } else {
      dataBoundary = null
      drawBoundaryAndGrid()
    }
  }


/** @function setGrid
  * @param {string} newGeojson - specifies the path of a geojson object.
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * The method replaces any existing grid geojson with the geojson in the file passed. It also
  * redisplays the map.
  */
  function setGrid(newGeojson) {
    if (newGeojson) {
      pBoundary = d3.json(newGeojson).then(data => {
        dataGrid = data
        drawBoundaryAndGrid()
      })
    } else {
      dataGrid = null
      drawBoundaryAndGrid()
    }
  }

/** @function setProj
  * @param {string} newProj - specifies a new projection for the map.
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * The method replaces any existing map projection so that, for example, a map can be switched between
  * British and Irish grid projections.
  */
  function setProj(newProj) {
    proj = newProj
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
    svg.selectAll('.svg-map-inset').remove() // remove inset boxes
    removeDots(svg)  // remove dots
    const incr = 10
    for (let i=1; i<=incr + 1; i++){
      const tto = getTweenTransOpts(lastTransOptsKey, newTransOptsKey, height, i/incr)
      setTimeout(() => {
        trans = createTrans(tto, height)
        drawBoundaryAndGrid()
        setSvgSize()
        transformImages(basemaps, trans, seaFill)
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
    boundary.selectAll('path').style("stroke", c)
  }

/** @function setGridColour
  * @param {string} c - a string specifying the colour which can be hex format, e.g. #FFA500, 
  * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red.
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * Sets the grid colour to the specified colour.
  */
  function setGridColour(c){
    grid.style("stroke", c)
    grid.selectAll('path').style("stroke", c)
  }

/** @function setGridLineStyle
  * @param {string} c - a string specifying the style which can be set to either solid, dashed or none. 
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * Sets the grid style to the specified value.
  */
  function setGridLineStyle(c){
    grid.style("stroke-dasharray", c === "dashed" ? "3,2" : "1,0")
    grid.style("display", c === "none" ? "none" : "")
  }

/** @function setVcLineStyle
  * @param {string} c - a string specifying the style which can be set to either none or something else (which will create solid). 
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * Sets the line style of the Vice County lines to the specified value.
  */
  function setVcLineStyle(c){
    vc.style("display", c === "none" ? "none" : "")
  }

/** @function setVcColour
  * @param {string} c - a string specifying the colour which can be hex format, e.g. #FFA500, 
  * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red.
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * Sets the colour ov the vice count lines to the specified colour.
  */
  function setVcColour(c){
    vc.style("stroke", c)
    vc.selectAll('path').style("stroke", c)
  }

/** @function setCountryLineStyle
  * @param {string} c - a string specifying the style which can be set to either none or something else (which will create solid). 
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * Sets the line style of the countries to the specified value.
  */
  function setCountryLineStyle(c){
    country.style("display", c === "none" ? "none" : "")
  }

/** @function setCountryColour
  * @param {string} c - a string specifying the colour which can be hex format, e.g. #FFA500, 
  * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red.
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * Sets the line colour of the countries to the specified colour.
  */
  function setCountryColour(c){
    country.style("stroke", c)
    country.selectAll('path').style("stroke", c)
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
    showImage(mapId, show, basemaps, imageFile, worldFile, trans, seaFill)
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
    return drawMapDots()
  }

/** @function clearMap
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * Clear the map of dots and legend.
  */
  function clearMap(){
    svg.select('#legend').remove()
    title.selectAll('*').remove()
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
  * @param {Object} svgInfo - Initialisation options. Whole arg can be set to null if no info options.
  * @param {string} svgInfo.text - A text string to be displayed at the foot of the map. 
  * This will be word-wrapped to the width of the image.
  * Some HTML tags, e.g. <i> are recognised, but in order to facilitate word wrapping, each word must be marked up
  * separately - there should be no white space within the tag.
  * @param {Array.<string>} svgInfo.textFormatted - An array of strings to be concatenated anddisplayed at the foot of the map. 
  * Each element in the array is preceded by one of the of the following tokens which indicates how it is to be formatted:
  * n# indicates no formatting; i# indicates italics and b# indicates emboldening.
  * This resultig string will be word-wrapped to the width of the image.
  * @param {string} svgInfo.img - The path of an image to be displayed at the foot of the map. If the image is wider
  * than the SVG, it is rescaled to the size of the SVG.
  * @param {number} svgInfo.fontSize - The size of the font to be used for the text string (defaults to 12)
  * @param {number} svgInfo.margin - The size of a margin, in pixels, to be placed around the text and/or image.
  * @param {string} filename - Name of the file (without extension) to generate and download.
  * Creates an image from the displayed map and downloads to user's computer. If
  * the filename is falsey (e.g. blank), it will not automatically download the
  * file. (Allows caller to do something else with the data URL which is returned
  * as the promises resolved value.)
  * @returns {Promise} promise object represents the data URL of the image.
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * 
  */
  function saveMap(asSvg, svgInfo, filename) {
    return saveMapImage(svg, trans, expand, asSvg, svgInfo, filename)
  }

/** @function downloadData
  * @param {boolean} asGeojson - a boolean value that indicates whether to generate GeoJson (if false, generates CSV). 
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  */
  function downloadData(asGeojson){
    const accessFunction = mapTypesSel[mapTypesKey]
    downloadCurrentData(accessFunction(taxonIdentifier), 10000, asGeojson)
  }

/** @function setMapTitle
  * @param {string} text - A text value for the map title (can include <b> and <i> tags). 
  * @param {number} fontSize - A number indicating font size in pixels.
  * @param {number} x - a number indicating origin x position of text in map svg.
  * @param {number} y - a number indicating origin y position of text in map svg.
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * Creates a title which can be positioned independently of the legend. This is useful when the legend needs
  * to be moved, but the title does not.
  */
  function setMapTitle(text, fontSize, x, y) {

    let tText = text
    tText = tText.replaceAll('<i>', '<tspan style="font-style: italic">' )
    tText = tText.replaceAll('</i>', '</tspan>' )
    tText = tText.replaceAll('<b>', '<tspan style="font-weight: bold">' )
    tText = tText.replaceAll('</b>', '</tspan>' )

    title.selectAll('*').remove()
    title.append('text').html(tText)
      .attr('x', x)
      .attr('y', y)
      .attr('font-size', fontSize + 'px')
      .style('font-family','Arial, Helvetica, sans-serif')
  }

 /** @function showBusy
  * @param {boolean} show - A boolean value to indicate whether or not to show map data loading. 
  * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
  * Allows calling application to display/hide an indicator showing the map data is loading.
  */
  function showBusy(show) {
    mapLoaderShowExplicit = show
    mapLoader.classed('map-loader-hidden', !mapLoaderShowExplicit)
  }

  /**
   * @typedef {Object} api
   * @property {module:svgMap~setBoundary} setBoundary - Change the map boundary. Pass a single argument
   * which is the path of a geojson file.
   * @property {module:svgMap~setGrid} setGrid - Change the grid lines for the map. Pass a single argument
   * which is the path of a geojson file.
   * @property {module:svgMap~setBoundaryColour} setBoundaryColour - Change the colour of the boundary. Pass a single argument
   * which is a string specifying the colour which can be hex format, e.g. #FFA500, 
   * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red.
   * @property {module:svgMap~setGridColour} setGridColour - Change the colour of the grid. Pass a single argument
   * which is a string specifying the colour which can be hex format, e.g. #FFA500, 
   * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red.
   * @property {module:svgMap~setCountryColour} setCountryColour - Change the colour of the country boundaries. Pass a single argument
   * which is a string specifying the colour which can be hex format, e.g. #FFA500, 
   * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red.
   * @property {module:svgMap~setVcColour} setVcColour - Change the colour of the vice county lines. Pass a single argument
   * which is a string specifying the colour which can be hex format, e.g. #FFA500, 
   * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red.
   * @property {module:svgMap~setGridLineStyle} setGridLineStyle - Set the line style of the grid line geoJson. 
   * Can be solid, dashed or none.
   * @property {module:svgMap~setCountryLineStyle} setCountryLineStyle - Set the line style of the country boundaries geoJson. 
   * Can be none or something else (which will give solid line).
   * @property {module:svgMap~setVcLineStyle} setVcLineStyle - Set the line style of the Vice County line geoJson. 
   * Can be none or something else (which will give solid line).
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
   * @property {module:svgMap~downloadData} downloadData - Download a the map data as a CSV or GeoJson file.
   * @property {module:svgMap~setProj} setProj - Change the map projection. The argument is a string of the form 'gb', 'ir' or 'ci'.
   * @property {module:svgMap~setProj} setHeight - Reset the height of the main map SVG object.
   * @property {module:svgMap~showBusy} showBusy - Set a boolean value to indicate whether or not to show map data loading.
   */
  return {
    setBoundary: setBoundary,
    setGrid: setGrid,
    setBoundaryColour: setBoundaryColour,
    setGridColour: setGridColour,
    setGridLineStyle: setGridLineStyle,
    setVcLineStyle: setVcLineStyle,
    setVcColour: setVcColour,
    setCountryLineStyle: setCountryLineStyle,
    setCountryColour: setCountryColour,
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
    saveMap: saveMap,
    downloadData: downloadData,
    setProj: setProj,
    setHeight: setHeight,
    setMapTitle: setMapTitle,
    showBusy: showBusy
  }
}