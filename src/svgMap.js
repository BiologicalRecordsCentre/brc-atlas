import * as d3 from 'd3'
import { createTrans, namedTransOpts } from './coordsToImage.js'
import { constants } from './constants.js'
import { optsDialog, showOptsDialog } from './optsDialog.js'
import { csvHectad } from './dataAccess.js'
import { showImage, setImagePriorities, transformImages } from './svgImages.js'
import { drawDots, refreshDots } from './svgDots.js'
import { svgLegend } from './svgLegend.js'

/**
 * #TODO - description and full parameter list.
 * @param {Object} opts - initialisation options.
 * @param {string} opts.id - the id of the element which will be the parent of the SVG.
 * @param {number} opts.height - the height of the SVG.
 * @param {boolean} opts.expand - indicates whether or not the map will expand to fill parent element.
 * @param {Object or string} opts.transOptsInit - a transformation object or a string representing a pre-defined transformation.
 * @param {string} opts.boundaryGjson - the URL of a boundary geoJson file to display.
 * @param {string} opts.gridGjson - the URL of a grid geoJson file to display.
 * @returns {null} - there is no return object.
 */
export function svgMap({
  // Default options in here
  id = 'body',
  captionId = '',
  height = 500,
  expand = false,
  legend = false,
  legendScale = 1,
  legendX = 10,
  legendY = 5,
  transOptsKey = 'BI1',
  transOptsSel = namedTransOpts,
  transOptsControl = true,
  mapTypesKey = 'Standard hectad',
  mapTypesSel = {'Standard hectad': csvHectad},
  mapTypesControl = true,
  boundaryGjson = `${constants.cdn}/assets/GB-I-CI-27700-reduced.geojson`,
  gridGjson = `${constants.cdn}/assets/GB-I-grid-27700-reduced.geojson`,
  gridLineColour = '7C7CD3',
  boundaryColour = '7C7CD3',
  boundaryFill = 'white',
  seaFill = 'E6EFFF',
  insetColour = '7C7CD3'
} = {}) {

  let trans, basemaps, boundary, boundaryf, dataBoundary, grid, dataGrid, taxonIdentifier

  // Create a parent div for the SVG within the parent element passed
  // as an argument. Allows us to style correctly for positioning etc.
  const mainDiv = d3.select(`#${id}`)
    .append("div")
    .style("position", "relative")
    .style("display", "inline")

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
      .attr("src", "../images/gear.png")
      .style("width", "16px")
      .style("position", "absolute")
      .style("right", "5px")
      .style("bottom", "7px")
      .on("click", function(){
        showOptsDialog(mapTypesKey, transOptsSel, transOptsKey)
      })
    // Create options dialog
    optsDialog(id, transOptsSel, transOptsKey, transOptsControl, mapTypesSel, mapTypesKey, mapTypesControl, userChangedOptions)
  }

  function userChangedOptions(opts) {
    if (opts.transOptsKey && transOptsKey !== opts.transOptsKey){
      transOptsKey = opts.transOptsKey
      trans = createTrans(transOptsSel[transOptsKey], height)
      drawBoundaryAndGrid()
      setSvgSize()
      drawInsetBoxes()
      refreshDots(svg, captionId, trans.point, mapTypesSel[mapTypesKey], taxonIdentifier)
      transformImages(basemaps, trans)
    }
    if (opts.mapTypesKey && mapTypesKey !== opts.mapTypesKey){
      mapTypesKey = opts.mapTypesKey
      drawDots(svg, captionId, trans.point, mapTypesSel[mapTypesKey], taxonIdentifier)
        .then (data => {
          svgLegend(svg, data, legend, legendX, legendY, legendScale)
      })
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

  // TODO. Needs enlarging and documenting. 
  // Define the api that will be exposed.
  const api = {
    setBoundaryColour: function setBoundaryColour(c){
      boundary.style("stroke", c)
    },
    setTransform: function setTransform (newTransOptsKey) {
      transOptsKey = newTransOptsKey
      trans = createTrans(transOptsSel[transOptsKey], height)
      drawBoundaryAndGrid()
      setSvgSize()
      drawInsetBoxes()
      refreshDots(svg, captionId, trans.point, mapTypesSel[mapTypesKey], taxonIdentifier)
      transformImages(basemaps, trans)
    },
    setIdentfier: function setIdentfier(identifier) {
      taxonIdentifier = identifier
      drawDots(svg, captionId, trans.point, mapTypesSel[mapTypesKey], taxonIdentifier)
        .then (data => {
          svgLegend(svg, data, legend, legendX, legendY, legendScale)
      })
    },
    setMapType: function setMapType(newMapTypesKey) {
      mapTypesKey = newMapTypesKey
      drawDots(svg, captionId, trans.point, mapTypesSel[mapTypesKey], taxonIdentifier)
        .then (data => {
          svgLegend(svg, data, legend, legendX, legendY, legendScale)
      })
    },
    basemapImage: function basemapImage(mapId, show, imageFile, worldFile) {
      showImage(mapId, show, basemaps, imageFile, worldFile, trans)
      // If no base map images shown then set boundary opacity to 1 otherwise 0
      // const layers = basemaps.selectAll('g')._groups[0].length
      // const hidden = basemaps.selectAll('g.baseMapHidden')._groups[0].length
      // if (layers === hidden) {
      //   boundary.style('fill-opacity', 1)
      // } else {
      //   boundary.style('fill-opacity', 0)
      // }
    },
    baseMapPriorities: function setBaseMapPriorities(mapIds) {
      setImagePriorities(basemaps, mapIds)
    }
  }

  // Initialise the display
  trans = createTrans(transOptsSel[transOptsKey], height)
  setSvgSize()
  drawInsetBoxes()

  let pBoundary, pGrid
  if (boundaryGjson){
    pBoundary = d3.json(boundaryGjson).then(data => {
      dataBoundary = data
    })
  } else {
    pBoundary = Promise.resolve()
  }

  if (gridGjson){
    pGrid = d3.json(gridGjson).then(data => {
      dataGrid = data
    })
  } else {
    pGrid = Promise.resolve()
  }
  Promise.all([pBoundary, pGrid]).then(() => {
    drawBoundaryAndGrid()
  })

  // Return the publicly accessible API
  return api
}