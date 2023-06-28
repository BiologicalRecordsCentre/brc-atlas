/** @module eSvgMap */

import * as d3 from 'd3'
import proj4 from 'proj4'
import { constants } from '../src/constants.js'

export function eSvgMap({
  // Default options in here
  selector = 'body',
  mapid = 'svgMap',
  outputWidth = 900,
  outputHeight = 700,
  mapBB = [1000000, 800000, 6600000, 5500000], // [minx, miny, maxx, maxy]
  //mapBB = [2740000, 2950000, 4060000, 4220000], // [minx, miny, maxx, maxy]
  fillEurope = 'black',
  fillWorld = 'rgb(50,50,50',
  fillOcean = 'rgb(100,100,100)',
  strokeEurope = 'rgb(100,100,100)',
}) {

  // Function level variables
  let dataGridded = []

  let countriesEbms = [
    'Austria',
    'Belgium',
    'Croatia',
    'Czechia',
    'Finland',
    'France',
    'Germany',
    'Hungary',
    'Ireland',
    'Italy',
    'Luxembourg',
    'Norway',
    'Portugal',
    'Slovenia',
    'Spain',
    'Sweden',
    'Switzerland',
    'Netherlands',
    'United Kingdom',
  ]

  // Create a parent div for the SVG within the parent element passed
  // as an argument. Allows us to style correctly for positioning etc.
  const mainDiv = d3.select(`${selector}`)
    .append("div")
    .attr('id', mapid)
    .style("position", "relative")
    .style("display", "inline")

  // Create the SVG.
  const svg = mainDiv.append("svg")
    .style("width", outputWidth)
    .style("height", outputHeight)
    .style("background-color", fillOcean)

  // Zoom g element
  const zoomG = svg.append("g")
  function handleZoom(e) {
    //console.log('e', e)
    zoomG.attr('transform', e.transform);
  }
  const zoom = d3.zoom()
    .on ('zoom', handleZoom)
  svg.call(zoom)

  // Group element for european boundary and world boundary
  const boundaryWorld = zoomG.append("g").attr("id", "boundaryWorld")
  //const boundaryEurope = svg.append("g").attr("id", "boundaryEurope")
  const boundaryEbms = zoomG.append("g").attr("id", "boundaryEbms")
  // Group element for dots
  const dotsWeek0= zoomG.append("g").attr("id", "dotsWeek0")
  const dotsWeek1= zoomG.append("g").attr("id", "dotsWeek1")
  const dotsWeek2= zoomG.append("g").attr("id", "dotsWeek2")

  // Load the boundary data
  const boundaryEuropeGjson=`${constants.thisCdn}/assets/european/european-countries-3035.geojson`
  const boundaryWorldGjson=`${constants.thisCdn}/assets/european/world-land-trimmed-3035.geojson`

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
  // Create the transformation function
  function transform(p) {
    const x = p[0]
    const y = p[1]
    let tX, tY
    const realWidth = maxxMap-minxMap
    const realHeight = maxyMap-minyMap
    tX = outputWidth * (x-minxMap)/realWidth
    tY = outputHeight - outputHeight * (y-minyMap)/realHeight
    return [tX, tY]
  }
  // Calculate the size in pixels of a 30km dot
  const d30 = transform([30000,0])[0] - transform([0,0])[0]
  // console.log('d30', d30)

  const trans = d3.geoPath()
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

  d3.json(boundaryEuropeGjson).then(data => {
    console.log('data', data)

    // const dataFeaturesEurope = data.features.filter(d => d.properties.SOVEREIGNT !== 'Russia')
    const dataFeaturesEbms = data.features.filter(d => countriesEbms.includes(d.properties.SOVEREIGNT))

    // data.features = dataFeaturesEurope

    // boundaryEurope.append("path")
    //   .datum(data)
    //   .attr("d", trans)
    //   .style("fill", 'yellow')
    //   .style("stroke", strokeEurope)

    data.features = dataFeaturesEbms

    boundaryEbms.append("path")
      .datum(data)
      .attr("d", trans)
      .style("fill", fillEurope)
      .style("stroke", strokeEurope)
  })

  d3.json(boundaryWorldGjson).then(data => {
    // console.log('data', data)
    boundaryWorld.append("path")
      .datum(data)
      .attr("d", trans)
      .style("fill", fillWorld)
  })

  function mapData(week, year) {

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
          .attr("fill", "red")
          .attr("cx", d => transform([d.x, d.y])[0])
          .attr("cy", d => transform([d.x, d.y])[1])
          .attr("r", d30/2)
      )
    dotsWeek1.selectAll(".dot1")
      .data(dWeek1, d => d.id)
      .join (
        enter => enter.append("circle")
          .classed("dot1", true)
          .attr("fill", "red")
          .attr("opacity", 0.6)
          .attr("cx", d => transform([d.x, d.y])[0])
          .attr("cy", d => transform([d.x, d.y])[1])
          .attr("r", 1.5*d30)
      )

    dotsWeek2.selectAll(".dot2")
      .data(dWeek2, d => d.id)
      .join (
        enter => enter.append("circle")
          .classed("dot2", true)
          .attr("fill", "red")
          .attr("opacity", 0.3)
          .attr("cx", d => transform([d.x, d.y])[0])
          .attr("cy", d => transform([d.x, d.y])[1])
          .attr("r", 3*d30)
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
      const gx = Math.floor(x/30000) * 30000 + 15000
      const gy = Math.floor(y/30000) * 30000 + 15000
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

  return ({
    loadData: loadData,
    mapData: mapData
  })
}
