/** @module eSvgMap */

import * as d3 from 'd3'
import proj4 from 'proj4'
import { constants } from './eConstants.js'

export function eSvgMap({
  // Default options in here
  selector = 'body',
  mapid = 'svgMap',
  outputWidth = 0,
  outputHeight = 0,
  mapBB = [1000000, 800000, 6600000, 5500000], // [minx, miny, maxx, maxy]
  fillEurope = 'black',
  fillWorld = 'rgb(50,50,50)',
  fillOcean = 'rgb(100,100,100)',
  strokeEurope = 'rgb(100,100,100)',
  fillDot = 'red',
  expand = false,
  highlightCountries = [],
  hightlightAllEurrope = false,
  dotSize1 = 1,
  dotSize2 = 3,
  dotSize3 = 6,
  dotOpacity1 = 1,
  dotOpacity2 = 0.4,
  dotOpacity3 = 0.1,
  showZoomControls = true,
  aggregate = true
}) {

  // Function level variables
  let dataGridded = [] // Transformed data
  let transform // Transformation function from EPSG 3505 to SVG coords
  let geoPath // D3 geopath transformation function from EPSG 3505 to SVG coords
  let d30 // Size of 30 km in pixels
  let currentWeek // Currently displayed week
  let currentYear // Currently displayed year

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

  // Zoom control
  const zoomControls = mainDiv.append("div")
    .classed('zoom-controls', true)
    .style('display', showZoomControls ? 'block' : 'none')
  const zoomIn = zoomControls.append("div").text("+")
    .classed('zoom-control-button', true)
    .classed('zoom-control-top-button', true)
  const zoomOut = zoomControls.append("div").html("&#8211;")
    .classed('zoom-control-button', true)

  // Create the SVG.
  const svg = mainDiv.append("svg")
    .style("background-color", fillOcean)

  sizeSvg()

  // Zoom g element
  const zoomG = svg.append("g")
  function handleZoom(e) {
    //console.log('e', e)
    zoomG.attr('transform', e.transform);
  }
  const zoom = d3.zoom()
    .on ('zoom', handleZoom)
  svg.call(zoom)

  // Attach actions to zoom buttons
  zoomIn.on('click', () => svg.transition().call(zoom.scaleBy, 2))
  zoomOut.on('click', () => svg.transition().call(zoom.scaleBy, 0.5))

  // Group element for european boundary and world boundary
  const boundaryWorld = zoomG.append("g").attr("id", "boundaryWorld")
  //const boundaryEurope = svg.append("g").attr("id", "boundaryEurope")
  const boundaryEurope = zoomG.append("g").attr("id", "boundaryEurope")
  // Group element for dots
  const dotsWeek0= zoomG.append("g").attr("id", "dotsWeek0")
  const dotsWeek1= zoomG.append("g").attr("id", "dotsWeek1")
  const dotsWeek2= zoomG.append("g").attr("id", "dotsWeek2")

  // Load the boundary data
  const boundaryEuropeGjson=`${constants.thisCdn}/assets/european/european-countries-3035.geojson`
  const boundaryWorldGjson=`${constants.thisCdn}/assets/european/world-land-trimmed-3035.geojson`

  // Create transformation and get dot size
  transform = getTransformation()
  geoPath = getGeoPath()
  d30 = transform([30000,0])[0] - transform([0,0])[0]
  displayMapBackground()

  function sizeSvg() {
    // Get dimensions of parent element
    if (!outputWidth) {
      outputWidth = document.querySelector(selector).clientWidth
    }
    if (!outputHeight) {
      outputHeight = document.querySelector(selector).clientHeight
    }

    console.log('outputHeight', outputHeight)
    console.log('outputWidth', outputWidth)

    if (expand) {
      svg.attr("viewBox", "0 0 " + outputWidth + " " +  outputHeight)
    } else {
      svg.attr("width", outputWidth)
      svg.attr("height", outputHeight)
    }
  }

  function getTransformation() {

    // Work out the extents for the transformation.
    // The full extent of the area denoted by opts.mapBB
    // must be visible in the SVG. Unless the SVG width/height
    // is exactly the same aspect ratio of mapBB, then that
    // means adjusting the real world mapBB.
    let minxMap = mapBB[0]
    let minyMap = mapBB[1]
    let maxxMap = mapBB[2]
    let maxyMap = mapBB[3]
    const xCentreMap = minxMap + (maxxMap-minxMap) / 2
    const yCentreMap = minyMap + (maxyMap-minyMap) / 2
    if (outputWidth / outputHeight > (maxxMap - minxMap) / (maxyMap - minyMap)) {
      const mapWidth = outputWidth / outputHeight * (maxyMap - minyMap)
      minxMap = xCentreMap - mapWidth / 2
      maxxMap = minxMap + mapWidth
    } else {
      const mapHeight = outputHeight / outputWidth * (maxxMap - minxMap)
      minyMap = yCentreMap - mapHeight / 2
      maxyMap = minyMap + mapHeight
    }
    // Return the transformation function
    return function(p) {
      const x = p[0]
      const y = p[1]
      let tX, tY
      const realWidth = maxxMap-minxMap
      const realHeight = maxyMap-minyMap
      tX = outputWidth * (x-minxMap)/realWidth
      tY = outputHeight - outputHeight * (y-minyMap)/realHeight
      return [tX, tY]
    }
  }

  function getGeoPath () {
    return  d3.geoPath()
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
  }

  function displayMapBackground() {

    d3.json(boundaryEuropeGjson).then(data => {

      const dataFeaturesHighlight = data.features.filter(d => hightlightAllEurrope || highlightCountries.includes(d.properties.SOVEREIGNT))

      data.features = dataFeaturesHighlight
      boundaryEurope.selectAll("path").remove()
      boundaryEurope.append("path")
        .datum(data)
        .attr("d", geoPath)
        .style("fill", fillEurope)
        .style("stroke", strokeEurope)
    })

    d3.json(boundaryWorldGjson).then(data => {
      // console.log('data', data)
      boundaryWorld.selectAll("path").remove()
      boundaryWorld.append("path")
        .datum(data)
        .attr("d", geoPath)
        .style("fill", fillWorld)
    })

    if (!mapLoaderShowExplicit) {
      mapLoader.classed('map-loader-hidden', true)
    }
  }

  // API functions

  function mapData(week, year) {

    currentWeek = week
    currentYear = year

    // First filter the gridded data based on week and, optionally, year.
    const dYear = dataGridded.filter(d => !year || d.year === year)
    let dWeek0 = dYear.filter(d => d.week === week)
    let dWeek1 = dYear.filter(d => d.week === week - 1)
    let dWeek2 = dYear.filter(d => d.week === week - 2)

    // Remove all duplicates
    dWeek0 = dWeek0.filter((v, i, self) => i === self.findIndex(d => d.id === v.id))
    dWeek1 = dWeek1.filter((v, i, self) => i === self.findIndex(d => d.id === v.id))
    dWeek2 = dWeek2.filter((v, i, self) => i === self.findIndex(d => d.id === v.id))

    //
    dotsWeek0.selectAll(".dot0")
      .data(dWeek0, d => d.id)
      .join (
        enter => enter.append("circle")
          .classed("dot0", true)
          .attr("fill", fillDot)
          .attr("opacity", dotOpacity1)
          .attr("cx", d => transform([d.x, d.y])[0])
          .attr("cy", d => transform([d.x, d.y])[1])
          .attr("r", d30/2*dotSize1)
      )
    dotsWeek1.selectAll(".dot1")
      .data(dWeek1, d => d.id)
      .join (
        enter => enter.append("circle")
          .classed("dot1", true)
          .attr("fill", fillDot)
          .attr("opacity", dotOpacity2)
          .attr("cx", d => transform([d.x, d.y])[0])
          .attr("cy", d => transform([d.x, d.y])[1])
          .attr("r", d30/2*dotSize2)
      )

    dotsWeek2.selectAll(".dot2")
      .data(dWeek2, d => d.id)
      .join (
        enter => enter.append("circle")
          .classed("dot2", true)
          .attr("fill", fillDot)
          .attr("opacity", dotOpacity3)
          .attr("cx", d => transform([d.x, d.y])[0])
          .attr("cy", d => transform([d.x, d.y])[1])
          .attr("r", d30/2*dotSize3)
      )
  }

  function loadData(data) {

    // console.log('data loaded', data)
    // The data arrives with these columns: year, week, lat, lon.
    const epsg3035 = '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs'

    dataGridded = data.map(d => {
      const xy = proj4(epsg3035,[d.lon,d.lat])
      const x = xy[0]
      const y = xy[1]
      let gx, gy
      if (aggregate) {
        gx = Math.floor(x/30000) * 30000 + 15000
        gy = Math.floor(y/30000) * 30000 + 15000
      } else {
        gx = x
        gy = y
      }
      return {
        year: d.year,
        week: d.week,
        x: gx,
        y: gy,
        id: `${gx}-${gy}`
      }
    })


    // console.log('dataGridded', dataGridded)
  }

  function getWeekDates (week, year) {
    // Given week number and a year, return start and end dates of week.
    // Where there's no year, assume a non-leap year.

    // Set up arrays
    const mnthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const mnthAbbrv = mnthNames.map(d => d.substring(0,3))

    const mnthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    if (year && year%4 === 0) mnthLengths[1] = 29
    let dsum = 0
    const mnthDays = mnthLengths.map(d => dsum += d)

    // Return variables
    let dds, dde, mms, mme
    // Convert week to start day
    const startDay = (week-1) * 7 + 1
    const endDay = startDay + 6
    for (let m=0; m<12; m++) {
      if (startDay <= mnthDays[m] && !dds) {
        dds = m ? startDay - mnthDays[m-1] : startDay
        mms = mnthAbbrv[m]
      }
      if (endDay <= mnthDays[m] && !dde) {
        dde = m ? endDay - mnthDays[m-1] : endDay
        mme = mnthAbbrv[m]
      }
    }

    if (mms === mme) {
      return `${dds} - ${dde} ${mme}`
    } else {
      return `${dds} ${mms} - ${dde} ${mme}`
    }
  }

  function resize(width, height) {
    outputWidth = width
    outputHeight = height
    sizeSvg()

    transform = getTransformation()
    geoPath = getGeoPath()
    d30 = transform([30000,0])[0] - transform([0,0])[0]
    displayMapBackground()

    console.log('Remap data')
    dotsWeek0.selectAll(".dot0").remove()
    dotsWeek1.selectAll(".dot1").remove()
    dotsWeek2.selectAll(".dot2").remove()
    mapData(currentWeek, currentYear)
  }

  function setDisplayOpts(opts) {
    if (opts.fillOcean) {
      fillOcean = opts.fillOcean
      svg.style("background-color", fillOcean)
    }
    if (opts.fillWorld) {
      fillWorld = opts.fillWorld
      boundaryWorld.selectAll("path").style("fill", fillWorld)
    }
    if (opts.fillEurope) {
      fillEurope = opts.fillEurope
      boundaryEurope.selectAll("path").style("fill", fillEurope)
    }
    if (opts.strokeEurope) {
      strokeEurope = opts.strokeEurope
      boundaryEurope.selectAll("path").style("stroke", strokeEurope)
    }
    if (opts.fillDot) {
      fillDot = opts.fillDot
      dotsWeek0.selectAll(".dot0").style("fill", fillDot)
      dotsWeek1.selectAll(".dot1").style("fill", fillDot)
      dotsWeek2.selectAll(".dot2").style("fill", fillDot)
    }
    if (opts.dotSize1) {
      dotSize1 = opts.dotSize1
      mapData(currentWeek, currentYear)
    }
    if (opts.dotSize2) {
      dotSize2 = opts.dotSize2
      mapData(currentWeek, currentYear)
    }
    if (opts.dotSize3) {
      dotSize3 = opts.dotSize3
      mapData(currentWeek, currentYear)
    }
    if (opts.dotOpacity1) {
      dotOpacity1 = opts.dotOpacity1
      mapData(currentWeek, currentYear)
    }
    if (opts.dotOpacity2) {
      dotOpacity2 = opts.dotOpacity2
      mapData(currentWeek, currentYear)
    }
    if (opts.dotOpacity3) {
      dotOpacity3 = opts.dotOpacity3
      mapData(currentWeek, currentYear)
    }
  }

   /** @function showBusy
  * @param {boolean} show - A boolean value to indicate whether or not to show map data loading.
  * @description <b>This function is exposed as a method on the API returned from the eSvgMap function</b>.
  * Allows calling application to display/hide an indicator showing the map data is loading.
  */
   function showBusy(show) {
    mapLoaderShowExplicit = show
    mapLoader.classed('map-loader-hidden', !mapLoaderShowExplicit)
  }

  return ({
    loadData: loadData,
    mapData: mapData,
    getWeekDates: getWeekDates,
    resize: resize,
    setDisplayOpts: setDisplayOpts,
    showBusy: showBusy,
  })
}

