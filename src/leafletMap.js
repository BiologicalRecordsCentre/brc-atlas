import * as L from 'leaflet'
import * as d3 from 'd3'
import { getCentroid, getGjson } from 'brc-atlas-bigr'
import { dataAccessors } from './dataAccess.js'
import { svgLegend } from './svgLegend.js'

/**
 * @typedef {Object} api
 * @property {function} setIdentfier - identifies data to the data accessor function.
 * @property {function} setMapType - set the key of the data accessor function.
 * @property {function} redrawMap - redraw the map.
 * @property {function} clearMap - clear the map.
 * @property {function} setSize - reset the size of the leaflet map.
 * @property {function} invalidateSize - invoke leaflet's invalidate size method.
 */

/**
 * @param {Object} opts - initialisation options.
 * @param {string} opts.selector - the CSS selector of the element which will be the parent of the leaflet map.
 * @param {string} opts.mapid - the id for the slippy map to be created.
 * @param {number} opts.captionId - the id of a DOM element into which feature-specific HTML will be displayed
 * as the mouse moves over a dot on the map. The HTML markup must be stored in an attribute called 'caption'
 * in the input data.
 * @param {number} opts.height - the desired height of the leaflet map.
 * @param {number} opts.width - the desired width of the leaflet map.
 * @param {Object} opts.mapTypesSel - sets an object whose properties are data access functions. The property
 * names are the 'keys' which should be human readable descriptiosn of the map types.
 * @param {string} opts.mapTypesKey - sets the key of the selected data accessor function (map type).
 * @param {legendOpts} opts.legendOpts - sets options for a map legend.
 * @returns {api} api - returns an API for the map.
 */

export function leafletMap({
  // Default options in here
  selector = 'body',
  mapid = 'leafletMap',
  captionId = '',
  height = 500,
  width = 300,
  mapTypesKey = 'Standard hectad',
  mapTypesSel = dataAccessors,
  legendOpts = {display: false},
} = {}) {

  let taxonIdentifier, precision
  let dots = {}

  d3.select(selector).append('div')
    .attr('id', mapid)
    .style('width', `${width}px`)
    .style('height', `${height}px`)
  const osm = new L.TileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png")
  const map = new L.Map(mapid, {center: [55, -4], zoom: 6, layers:[osm]})
  map.on("viewreset", reset) // Not firing on current version - seems to be a bug
  map.on("zoomend", reset)
  map.on("moveend", reset)

  // Legend custom control
  L.Control.Legend = L.Control.extend({
    onAdd: function() {
        const div = L.DomUtil.create('div', 'legendDiv leaflet-control leaflet-bar')
        return div
    },
    onRemove: function() {
    }
  });
  L.control.Legend = function(opts) {
      return new L.Control.Legend(opts)
  }
  L.control.Legend({ position: 'topleft' }).addTo(map)
  map.zoomControl.setPosition('topright')

  // Move zoom control to top right

  function projectPoint(x, y) {
    const point = map.latLngToLayerPoint(new L.LatLng(y, x))
    this.stream.point(point.x, point.y)
  }
  const transform = d3.geoTransform({point: projectPoint})
  const path = d3.geoPath().projection(transform)
  const svg = d3.select(map.getPanes().overlayPane).append("svg")
  const g = svg.append("g").attr("class", "leaflet-zoom-hide")

  // 
  function reset() { 
    const symbolOutline = true
    const zoomThreshold = 7
    const zoomThreshold2 = 9
    const view = map.getBounds()
    const deg5km = 0.0447
    let data, buffer

    if (precision===10000 || (precision===0 && map.getZoom() <= zoomThreshold)) {
      data = dots.p10000
      buffer = deg5km * 1.5
    } else if (precision===2000 || (precision===0 && map.getZoom() <= zoomThreshold2) || !dots.p1000 || !dots.p1000.length){
      data = dots.p2000
      buffer = deg5km / 4
    } else {
      data = dots.p1000
      buffer = deg5km / 2
    }

    if (!data || !data.records || !data.records.length) {
      d3.select('.legendDiv').style('display', 'none')
      svg.style('display', 'none')
      return
    } else {
      d3.select('.legendDiv').style('display', 'block')
      svg.style('display', 'block')
    }

    const filteredData = data.records.filter(function(d){
      if (d.lng  < view._southWest.lng - buffer ||
          d.lng > view._northEast.lng + buffer ||
          d.lat  < view._southWest.lat - buffer ||
          d.lat > view._northEast.lat + buffer) {
        return false
      } else {
        if (!d.geometry) {
          const shape = d.shape ? d.shape : data.shape
          d.geometry = getGjson(d.gr, 'wg', shape)
        }
        return true
      }
    })

    const bounds = path.bounds({
      type: "FeatureCollection",
      features: filteredData.map(d => {
        return {
          type: "Feature",
          geometry: d.geometry
        }
      })
    })

    const topLeft = bounds[0]
    const bottomRight = bounds[1]
    svg.attr("width", bottomRight[0] - topLeft[0])
      .attr("height", bottomRight[1] - topLeft[1])
      .style("left", topLeft[0] + "px")
      .style("top", topLeft[1] + "px")  

    g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")")

    // Update the features
    const u = g.selectAll("path")
      .data(filteredData, function(d) {
          return d.gr
      })
    u.enter()
      .append("path")
      .style("pointer-events", "all")
      .on('mouseover', d => {svg
        if (captionId) {
          if (d.caption) {
            d3.select(`#${captionId}`).html(d.caption)
          } else {
            d3.select(`#${captionId}`).html('')
          }
        }
      })
    .merge(u)
      .attr("d", d => {
        return path(d.geometry)
      })
      .attr("opacity", d => d.opacity ? d.opacity : data.opacity)
      .style("fill", d => d.colour ? d.colour : data.colour)
      .attr("fill", d => d.colour)
      .attr("stroke-width", () => {
        if (symbolOutline) {
          return '1'
        } else {
          return '0'
        }
      })
    u.exit()
      .remove()
  }

/** @function - setMapType
  * @param {string} newMapTypesKey - a string which a key used to identify a data accessor function. 
  * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
  * The data accessor is stored in the mapTypesSel object and referenced by this key.
  */
 function setMapType(newMapTypesKey) {
  mapTypesKey = newMapTypesKey
}

/** @function - setIdentfier
  * @param {string} identifier - a string which identifies some data to 
  * a data accessor function.
  * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
  * The data accessor function, specified elsewhere, will use this identifier to access
  * the correct data.
  */
  function setIdentfier(identifier) {
    taxonIdentifier = identifier
  }

/** @function - redrawMap
  * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
  * Redraw the map, e.g. after changing map accessor function or map identifier.
  */
  function redrawMap(){
    // API
    const accessFunction = mapTypesSel[mapTypesKey]
    accessFunction(taxonIdentifier).then(data => {
      data.records = data.records.map(d => {
        const ll = getCentroid(d.gr, 'wg').centroid
        d.lat = ll[1]
        d.lng = ll[0]
        return d
      })
      dots[`p${data.precision}`] = data
      precision = data.precision

      //Legend
      legendOpts.accessorData = data.legend
      if (legendOpts.display && (legendOpts.data || legendOpts.accessorData)) {
        const legendSvg = d3.select(selector).append('svg') //.style('display', 'none')
        svgLegend(legendSvg, legendOpts)
        const bbox = legendSvg.node().getBBox()
        const w = bbox.x + bbox.width + bbox.x
        const h = bbox.y + bbox.height + bbox.y
        d3.select('.legendDiv').html(`<svg width="${w}" height="${h}">${legendSvg.html()}</svg>`)
        legendSvg.remove()
      }  
      reset ()
    })
  }

/** @function - clearMap
  * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
  * Clear the map of dots and legend.
  */
 function clearMap(){
  // API
  d3.select('.legendDiv').style('display', 'none')
  svg.style('display', 'none')
}

/** @function - setSize
  * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
  * Change the size of the leaflet map.
  * @param {number} width - width of the map. 
  * @param {number} height - height of the map. 
  */
 function setSize(width, height){
  // API
  d3.select(`#${mapid}`)
    .style('width', `${width}px`)
    .style('height', `${height}px`)
  map.invalidateSize()
}

/** @function - invalidateSize
  * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
  * Expose the leaflet map invalidate size method.
  */
 function invalidateSize(){
  // API
  map.invalidateSize()
}

  // Return the publicly accessible API
  return {
    setIdentfier: setIdentfier,
    redrawMap: redrawMap,
    setMapType: setMapType,
    clearMap: clearMap,
    setSize: setSize,
    invalidateSize: invalidateSize
  }

}