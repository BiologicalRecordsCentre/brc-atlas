/** @module eSvgMap */

import * as d3 from 'd3'
import { constants } from '../src/constants.js'

export function eSvgMap({
  // Default options in here
  selector = 'body',
  mapid = 'svgMap',
}) {

  // Create a parent div for the SVG within the parent element passed
  // as an argument. Allows us to style correctly for positioning etc.
  const mainDiv = d3.select(`${selector}`)
    .append("div")
    .attr('id', mapid)
    .style("position", "relative")
    .style("display", "inline")

  // Create the SVG.
  mainDiv.append("svg")
    .style("width", 700)
    .style("height", 500)
    .style("background-color", 'green')

  // Load the boundary data
  const boundaryGjson=`${constants.thisCdn}/assets/european/EEA-grid-area-countries-3035.geojson`
  let dataBoundary
  const pBoundary = d3.json(boundaryGjson).then(data => {
    dataBoundary = data
  })

  pBoundary.then(() => {
    console.log(dataBoundary)
  })
  
}

