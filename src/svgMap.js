import * as d3 from 'd3'
import { transformFunction, widthFromHeight, namedTransOpts, getInsetDims } from './coordsToImage.js'
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
  height = 500,
  expand = false,
  legend = false,
  legendScale = 1,
  legendX = 10,
  legendY = 5,
  transOptsInit = '',
  transOptsSel = {'No insets': 'BI1'},
  transOptsOpts = true,
  mapTypesInit = 'Standard hectad',
  mapTypesSel = {'Standard hectad': csvHectad},
  mapTypesOpts = true,
  boundaryGjson = `${constants.cdn}/assets/GB-I-CI-27700-reduced.geojson`,
  gridGjson = `${constants.cdn}/assets/GB-I-grid-27700-reduced.geojson`,
  gridLineColour = '7C7CD3',
  boundaryColour = '7C7CD3',
  boundaryFill = 'white',
  seaFill = 'E6EFFF',
  insetColour = '7C7CD3'
} = {}) {

  let width, path, transform, basemaps, boundary, dataBoundary, grid, dataGrid, transOptsKey, mapTypesKey, taxonIdentifier

  // Set the initial transformation key
  if (transOptsInit && transOptsSel[transOptsInit]) {
    transOptsKey = transOptsInit
  } else {
    transOptsKey = Object.keys(transOptsSel)[0]
  }

  // Set the initial map type key
  if (mapTypesInit && mapTypesSel[mapTypesInit]) {
    mapTypesKey = mapTypesInit
  } else {
    mapTypesKey = Object.keys(mapTypesSel)[0]
  }

  // Create a parent div for the SVG within the parent element passed
  // as an argument. Allows us to style correctly for positioning etc.
  const mainDiv = d3.select(`#${id}`)
    .append("div")
    .style("position", "relative")
    .style("display", "inline")

  // Create the SVG.
  const svg = mainDiv.append("svg")
    .style("background-color", seaFill)

  // Create the SVG graphic objects that store the major map elements.
  // The order these is created is important since it affects the order
  // in which they are rendered (i.e. what is drawn over what).
  boundary = svg.append("g").attr("id", "boundary")
  basemaps = svg.append("g").attr("id", "backimage")
  grid = svg.append("g").attr("id", "grid")

  // Options dialog. 
  if ((transOptsOpts && Object.keys(transOptsSel).length > 1) || 
    (mapTypesOpts && Object.keys(mapTypesSel).length > 1)) {
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
    optsDialog(id, transOptsSel, transOptsKey, transOptsOpts, mapTypesSel, mapTypesKey, mapTypesOpts, userChangedOptions)
  }

  function userChangedOptions(opts) {
    if (opts.transOptsKey && transOptsKey !== opts.transOptsKey){
      transOptsKey = opts.transOptsKey
      transformSet()
      drawBoundaryAndGrid()
      setSvgSize()
      drawInsetBoxes(svg)
      refreshDots(svg, transform, mapTypesSel[mapTypesKey], taxonIdentifier)
      transformImages(basemaps, transform)
    }
    if (opts.mapTypesKey && mapTypesKey !== opts.mapTypesKey){
      mapTypesKey = opts.mapTypesKey
      drawDots(svg, transform, mapTypesSel[mapTypesKey], taxonIdentifier)
        .then (data => {
          svgLegend(svg, data, legend, legendX, legendY, legendScale)
      })
    }
  }

  function transformSet(){
    let transOpts = transOptsSel[transOptsKey]
    if (typeof transOpts === 'string') {
      transOpts = namedTransOpts[transOpts]
    }
    transform = transformFunction(transOpts, height)
    path = d3.geoPath()
      .projection(
        d3.geoTransform({
          point: function(x, y) {
            const tP = transform([x,y])
            const tX = tP[0]
            const tY = tP[1]
            this.stream.point(tX, tY)
          }
        })
      )
    width = widthFromHeight(transOpts, height)
  }

  function setSvgSize(){
    if (svg) {
      // Set width/height or viewbox depending on required behaviour
      if (expand) {
        svg.attr("viewBox", "0 0 " + width + " " +  height)
      } else {
        svg.attr("width", width)
        svg.attr("height", height)
      }
    }
  }

  function drawBoundaryAndGrid() {
    if (dataBoundary) {
      boundary.selectAll("path").remove()
      boundary.append("path")
        .datum(dataBoundary)
        .attr("d", path)
        .style("fill", boundaryFill)
        .style("stroke", boundaryColour)
    }
    if (dataGrid) {
      grid.selectAll("path").remove()
      grid.append("path")
        .datum(dataGrid)
        .attr("d", path)
        .style("stroke", gridLineColour)
    }
  }

  function drawInsetBoxes() {
    svg.selectAll('.inset').remove()
    let transOpts = transOptsSel[transOptsKey]
    if (typeof transOpts === 'string') {
      transOpts = namedTransOpts[transOpts]
    }
    getInsetDims(transOpts, height).forEach(function(i){
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
      transformSet()
      drawBoundaryAndGrid()
      setSvgSize()
      drawInsetBoxes()
      refreshDots(svg, transform, mapTypesSel[mapTypesKey], taxonIdentifier)
      transformImages(basemaps, transform)
    },
    setIdentfier: function setIdentfier(identifier) {
      taxonIdentifier = identifier
      drawDots(svg, transform, mapTypesSel[mapTypesKey], taxonIdentifier)
        .then (data => {
          svgLegend(svg, data, legend, legendX, legendY, legendScale)
      })
    },
    setMapType: function setMapType(newMapTypesKey) {
      mapTypesKey = newMapTypesKey
      drawDots(svg, transform, mapTypesSel[mapTypesKey], taxonIdentifier)
        .then (data => {
          svgLegend(svg, data, legend, legendX, legendY, legendScale)
      })
    },
    basemapImage: function basemapImage(mapId, show, imageFile, worldFile) {
      showImage(mapId, show, basemaps, imageFile, worldFile, transform)
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
  transformSet()
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