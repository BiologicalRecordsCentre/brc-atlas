import * as d3 from 'd3'
import { getCentroid, checkGr } from 'brc-atlas-bigr'
import { transformFunction, widthFromHeight, namedTransOpts, getInsetDims } from './coordsToImage.js'
import { constants } from './constants.js'
import { optsDialog, showOptsDialog } from './optsDialog.js'
import { csvHectad } from './dataAccess.js'

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

  let width, path, transform, boundary, dataBoundary, grid, dataGrid, transOptsKey, mapTypesKey, taxonIdentifier

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

  // Create map SVG in given parent
  const mainDiv = d3.select(`#${id}`)
    .append("div")
    .style("position", "relative")
    .style("display", "inline")

  const svg = mainDiv.append("svg")
    .style("background-color", seaFill)

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
        showOptsDialog(mapTypesSel, mapTypesKey, transOptsSel, transOptsKey)
      })
      
    // Create to options dialog
    optsDialog(id, transOptsSel, transOptsKey, transOptsOpts, mapTypesSel, mapTypesKey, mapTypesOpts, userChangedOptions)
  }

  function getRadiusPixels(precision){
    return Math.abs(transform([300000,300000])[0]-transform([300000+precision/2,300000])[0])
  }

  function userChangedOptions(opts) {
    if (opts.transOptsKey && transOptsKey !== opts.transOptsKey){
      transOptsKey = opts.transOptsKey
      transformSet()
      drawBoundaryAndGrid()
      setSvgSize()
      drawInsetBoxes()
      refreshDots()
    }
    if (opts.mapTypesKey && mapTypesKey !== opts.mapTypesKey){
      mapTypesKey = opts.mapTypesKey
      drawDots()
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
      if (boundary) {
        boundary.selectAll("path").remove()
      } else {
        boundary = svg.append("g").attr("id", "boundary")
      }
      boundary.append("path")
        .datum(dataBoundary)
        .attr("d", path)
        .style("fill", boundaryFill)
        .style("stroke", boundaryColour)
    }
    if (dataGrid) {
      if (grid) {
        grid.selectAll("path").remove()
      } else {
        grid = svg.append("g").attr("id", "grid")
      }
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

  function refreshDots() {
    svg.selectAll('.dotCircle').remove()
    svg.selectAll('.dotSquare').remove()
    svg.selectAll('.dotTriangle').remove()
    drawDots()
  }

  function drawDots() {
    const mapFunctionName = mapTypesSel[mapTypesKey]
    if(typeof window[mapFunctionName] === 'function') {
      window[mapFunctionName](taxonIdentifier).then(data => {
        const radiusPixels = getRadiusPixels(data.precision)
        // circles
        let recCircles
        if (data.shape && (data.shape === 'circle' || data.shape === 'bullseye')) {
          recCircles = data.records
        } else {
          recCircles = data.records.filter(d => d.shape && (d.shape === 'circle' || d.shape === 'bullseye'))
        }
        const circles = svg.selectAll('.dotCircle')
          .data(recCircles, d => d.gr)
        circles.enter()
          .append("circle")
          .classed('dotCircle', true)
          .attr("cx", d => transform(getCentroid(d.gr, 'gb').centroid)[0])
          .attr("cy", d => transform(getCentroid(d.gr, 'gb').centroid)[1]) 
          .attr("r", 0)
          .attr("opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour ? d.colour : data.colour)
        .merge(circles)
          .transition()  
            .ease(d3.easeCubic)   
            .duration(500)
          .attr("r", d => d.size ? radiusPixels * d.size : radiusPixels * data.size)
          .attr("opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour ? d.colour : data.colour)
        circles.exit()
          .transition()
            .ease(d3.easeCubic)
            .duration(500)
          .attr("r", 0)
          .remove()

        // bullseye
        let recBullseyes
        if (data.shape && data.shape === 'bullseye') {
          recBullseyes = data.records
        } else {
          recBullseyes = data.records.filter(d => d.shape && d.shape === 'bullseye')
        }
        const bullseyes = svg.selectAll('.dotBullseye')
          .data(recBullseyes, d => d.gr)
          bullseyes.enter()
          .append("circle")
          .classed('dotBullseye', true)
          .attr("cx", d => transform(getCentroid(d.gr, 'gb').centroid)[0])
          .attr("cy", d => transform(getCentroid(d.gr, 'gb').centroid)[1]) 
          .attr("r", 0)
          .attr("opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour2 ? d.colour2 : data.colour2)
        .merge(bullseyes)
          .transition()  
            .ease(d3.easeCubic)   
            .duration(500)
          .attr("r", d => d.size ? radiusPixels * d.size * 0.5 : radiusPixels * data.size * 0.5)
          .attr("opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour2 ? d.colour2 : data.colour2)
          bullseyes.exit()
          .transition()
            .ease(d3.easeCubic)
            .duration(500)
          .attr("r", 0)
          .remove()

        // squares
        let recSquares
        if (data.shape && data.shape === 'square') {
          recSquares = data.records
        } else {
          recSquares = data.records.filter(d => d.shape && d.shape === 'square')
        }
        const squares = svg.selectAll('.dotSquare')
          .data(recSquares, d => d.gr)
        squares.enter()
          .append("rect")
          .classed('dotSquare', true)
          .attr("x", d => transform(getCentroid(d.gr, 'gb').centroid)[0])
          .attr("y", d => transform(getCentroid(d.gr, 'gb').centroid)[1])
          .attr("width", 0)
          .attr("height", 0) 
          .attr("opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour ? d.colour : data.colour)
        .merge(squares)
          .transition()  
            .ease(d3.easeCubic)   
            .duration(500)
          .attr("width", d => d.size ? 2 * radiusPixels * d.size : 2 * radiusPixels * data.size)
          .attr("height", d => d.size ? 2 * radiusPixels * d.size : 2 * radiusPixels * data.size)
          .attr("transform", d => {
            if (checkGr(d.gr).projection === 'ir') {
              const x = transform(getCentroid(d.gr, 'gb').centroid)[0]
              const y = transform(getCentroid(d.gr, 'gb').centroid)[1]
              return `translate(${-radiusPixels},${-radiusPixels}) rotate(5 ${x} ${y})`
            } else {
              return `translate(${-radiusPixels},${-radiusPixels})`
            }
          })
          .attr("opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour ? d.colour : data.colour)
        squares.exit()
          .transition()
            .ease(d3.easeCubic)
            .duration(500)
          .attr("width", 0)
          .attr("height", 0)
          .attr("transform", `translate(0,0)`)
          .remove()

         // up triangles
         let recTriangles
         if (data.shape && data.shape.startsWith('triangle')) {
          recTriangles = data.records
         } else {
          recTriangles = data.records.filter(d => d.shape && d.shape.startsWith('triangle'))
         }
         const triangle = svg.selectAll('.dotTriangle')
           .data(recTriangles, d => d.gr)
          triangle.enter()
           .append("path")
           .classed('dotTriangle', true)
           .attr("d", d3.symbol().type(d3.symbolTriangle).size(0))
           .attr("opacity", d => d.opacity ? d.opacity : data.opacity)
           .style("fill", d => d.colour ? d.colour : data.colour)
           .attr("transform", d => {
              const x = transform(getCentroid(d.gr, 'gb').centroid)[0]
              const y = transform(getCentroid(d.gr, 'gb').centroid)[1]
              let extraRotate, yOffset
              if (d.shape === 'triangle-up') {
                extraRotate=0
                yOffset=radiusPixels/3
              } else {
                extraRotate=180
                yOffset=-radiusPixels/3
              }
              if (checkGr(d.gr).projection === 'ir') {
                return `translate(${x},${y + yOffset}) rotate(${5 + extraRotate})`
              } else {
                return `translate(${x},${y + yOffset}) rotate(${extraRotate})`
              }
            })
         .merge(triangle)
           .transition()  
             .ease(d3.easeCubic)   
             .duration(500)
           .attr("d", d3.symbol().type(d3.symbolTriangle).size(radiusPixels * radiusPixels * 1.7))
           .attr("opacity", d => d.opacity ? d.opacity : data.opacity)
           .style("fill", d => d.colour ? d.colour : data.colour)
          triangle.exit()
           .transition()
             .ease(d3.easeCubic)
             .duration(500)
           .attr("d", d3.symbol().type(d3.symbolTriangle).size(0))
           .remove()

        // Legend
        if (legend) {
          svgLegend(data)
        }
      }).catch(function(){
        console.log("Failed to read data", taxonIdentifier)
      })
    }
  }

  function svgLegend(data) {

    svg.select('#legend').remove()
    if (!data.legend) return
  
    const radiusPixels = getRadiusPixels(data.precision) * 2
    const lineHeight = 20

    const gLegend = svg.append('g').attr('id','legend')
    gLegend.append('text')
      .attr('x', 0)
      .attr('y', lineHeight)
      .attr('font-weight', 'bold')
      .text(data.legend.title)
  
    data.legend.lines.forEach((l, i) => {
      
      let shape = l.shape ? l.shape : data.shape
      let size = l.size ? l.size : data.size
      let opacity = l.opacity ? l.opacity : data.opacity
      let colour = l.colour ? l.colour : data.colour
      let colour2 = l.colour2 ? l.colour2 : data.colour2
      let dot

      if (shape === 'circle') {
        dot = gLegend.append('circle')
          .attr("r", radiusPixels * size)
          .attr("cx", radiusPixels * 1)
          .attr("cy", lineHeight * (i + 2.5) - radiusPixels)
      } else if (shape === 'bullseye') {
        dot = gLegend.append('circle')
          .attr("r", radiusPixels * size)
          .attr("cx", radiusPixels * 1)
          .attr("cy", lineHeight * (i + 2.5) - radiusPixels)
        gLegend.append('circle')
          .attr("r", radiusPixels * size * 0.5)
          .attr("cx", radiusPixels * 1)
          .attr("cy", lineHeight * (i + 2.5) - radiusPixels)
          .style('fill', colour2)
          .style('opacity', opacity)
      } else if (shape === 'square') {
        dot = gLegend.append('rect')
          .attr ("width", radiusPixels * 2)
          .attr ("height", radiusPixels * 2)
          .attr("x", 0)
          .attr("y", lineHeight * (i + 2.5) - 2 * radiusPixels)
      } else if (shape === 'triangle-up') {
        dot = gLegend.append('path')
          .attr("d", d3.symbol().type(d3.symbolTriangle).size(radiusPixels * radiusPixels * 1.7))
          .attr("transform", `translate(${radiusPixels * 1},${lineHeight * (i + 2.5) - radiusPixels})`)
      } else if (shape === 'triangle-down') {
        dot = gLegend.append('path')
          .attr("d", d3.symbol().type(d3.symbolTriangle).size(radiusPixels * radiusPixels * 1.7))
          .attr("transform", `translate(${radiusPixels * 1},${lineHeight * (i + 2.5) - radiusPixels}) rotate(180)`)
      }
      dot.style('fill', colour).style('opacity', opacity)
    })
  
    data.legend.lines.forEach((l, i) => {
      gLegend.append('text')
        .attr('x', radiusPixels * 4)
        .attr('y', lineHeight * (i + 2.5))
        .text(l.text)
    })
  
    gLegend.attr("transform", `translate(${legendX},${legendY}) scale(${legendScale}, ${legendScale})`)
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
      refreshDots()
    },
    setIdentfier: function setIdentfier(identifier) {
      taxonIdentifier = identifier
      drawDots()
    },
    setMapType: function setMapType(newMapTypesKey) {
      mapTypesKey = newMapTypesKey
      drawDots()
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

