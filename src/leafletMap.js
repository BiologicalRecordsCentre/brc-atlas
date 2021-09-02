/** @module slippyMap */

import * as L from 'leaflet'
import * as d3 from 'd3'
import { getCentroid, getGjson } from 'brc-atlas-bigr'
import { dataAccessors } from './dataAccess.js'
import { svgLegend } from './svgLegend.js'

/**
 * @typedef {Object} basemapConfig
 * @property {string} name - name of layer to be displayer in layer control.
 * @property {string} type - either 'tileLayer' or 'wms'.
 * @property {boolean} selected - indicate whether or not this is to be the layer initially selected.
 * @property {string} url - the standard leaflet formatted URL for the layer.
 * @property {Object} opts - standard leaflet layer options.
 */

/**
 * @param {Object} opts - Initialisation options.
 * @param {string} opts.selector - The CSS selector of the element which will be the parent of the leaflet map.
 * @param {string} opts.mapid - The id for the slippy map to be created.
 * @param {string} opts.captionId - The id of a DOM element into which feature-specific HTML will be displayed
 * as the mouse moves over a dot on the map. The HTML markup must be stored in an attribute called 'caption'
 * in the input data.
 * @param {number} opts.clusterZoomThreshold - The leaflet zoom level above which clustering will be turned
 * off for point display (except for points in same location) (default 1 - i.e. clustering always one)
 * @param {function} opts.onclick - A function that will be called if user clicks on a map
 * element. The function will be passed these attributes, in this order, if they exist on the
 * element: gr, id, caption. (Default - null.)
 * @param {number} opts.height - The desired height of the leaflet map.
 * @param {number} opts.width - The desired width of the leaflet map.
 * @param {Array.<basemapConfig>} opts.basemapConfigs - An array of map layer configuration objects.
 * @param {Object} opts.mapTypesSel - Sets an object whose properties are data access functions. The property
 * names are the 'keys' which should be human readable descriptiosn of the map types.
 * @param {string} opts.mapTypesKey - Sets the key of the selected data accessor function (map type).
 * @param {legendOpts} opts.legendOpts - Sets options for a map legend.
 * @returns {module:slippyMap~api} Returns an API for the map.
 */


export function leafletMap({
  // Default options in here
  selector = 'body',
  mapid = 'leafletMap',
  captionId = '',
  clusterZoomThreshold = 19,
  onclick = null,
  height = 500,
  width = 300,
  basemapConfigs = [],
  mapTypesKey = 'Standard hectad',
  mapTypesSel = dataAccessors,
  legendOpts = {display: false},
} = {}) {
  let taxonIdentifier, precision
  let dots = {}
  const geojsonLayers = {}
  let markers = null

  d3.select(selector).append('div')
    .attr('id', mapid)
    .style('width', `${width}px`)
    .style('height', `${height}px`)

  // Create basemaps from config
  let selectedBaselayerName
  const baseMaps = basemapConfigs.reduce((bm, c) => {
    let lyrFn
    if (c.type === 'tileLayer') {
      lyrFn = L.tileLayer
    } else if (c.type === 'wms') {
      lyrFn = L.tileLayer.wms
    } else {
      return bm
    }
    bm[c.name] = lyrFn(c.url, c.opts)
    if (c.selected) {
      selectedBaselayerName = c.name
    }
    return bm
  }, {})
  // If no basemaps configured, provide a default
  if (basemapConfigs.length === 0) {
    baseMaps['OpenStreetMap'] = L.tileLayer ('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }
      )
  }
  // If no basemap selected, select the first
  if (!selectedBaselayerName) {
    selectedBaselayerName = Object.keys(baseMaps)[0]
  }

  const map = new L.Map(mapid, {center: [55, -4], zoom: 6, layers:[baseMaps[selectedBaselayerName]]})
  
  map.on("viewreset", reset) // Not firing on current version - seems to be a bug
  map.on("zoomend", reset)
  map.on("moveend", reset)
  map.zoomControl.setPosition('topright')

  // Record the currently selected basemap layer
  map.on('baselayerchange', function (e) {
    selectedBaselayerName = e.name
  })

  // Add layer selection control to map if there is more than one layer
  let mapLayerControl
  if (basemapConfigs.length > 0) {
    mapLayerControl = L.control.layers(baseMaps).addTo(map)
  }

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
  
  function projectPoint(x, y) {
    const point = map.latLngToLayerPoint(new L.LatLng(y, x))
    this.stream.point(point.x, point.y)
  }
  const transform = d3.geoTransform({point: projectPoint})
  const path = d3.geoPath().projection(transform)

  map.createPane('esbatlaspane')
  map.getPane('esbatlaspane').style.zIndex = 650
  const svg = d3.select(map.getPane('esbatlaspane')).append("svg")
  svg.attr('id', 'atlas-leaflet-svg')
  // Added overflow visible to svg (02/09/2021) because it was found to fix a very odd problem - svg graphics not
  // visible in ESB atlas but only on Firefox on Windows.
  svg.style('overflow', 'visible')
  //const svg = d3.select(map.getPanes().overlayPane).append("svg")
  const g = svg.append("g").attr("class", "leaflet-zoom-hide")

  function pointMarkers() {
    // Hide the SVG (atlas elements)
    d3.select(`#${mapid}`).select('.legendDiv').style('display', 'none')
    svg.style('display', 'none')

    // Remove any previous
    if (markers) {
      map.removeLayer(markers)
      console.log('removing')
    }

    console.log('remaking', clusterZoomThreshold)

    markers = L.markerClusterGroup({ maxClusterRadius: function (zoom) {
      return (zoom <= clusterZoomThreshold) ? 80 : 1; // radius in pixels
    }})
    dots.p0.records.forEach(f => {
      // Allowed colours: https://awesomeopensource.com/project/pointhi/leaflet-color-markers
      const iconColour=f.colour ? f.colour : dots.p0.colour
      const icon = new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${iconColour}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })
      const marker = L.marker(L.latLng(f.lat, f.lng), {icon: icon, id: f.id, gr: f.gr, caption: f.caption})
      markers.addLayer(marker)
    })
    map.addLayer(markers)
    if (onclick){
      markers.on("click", function (event) {
        const p = event.layer.options
        onclick(p.gr, p.id ? p.id : null, p.caption ? p.caption : null)
        //console.log(event.layer.options)
      })
    }
  }

  function reset() { 
    // Hide point markers
    if (markers && precision!==0) {
      map.removeLayer(markers)
    }

    console.log('zoom', map.getZoom())

    const symbolOutline = true
    const view = map.getBounds()
    const deg5km = 0.0447
    let data, buffer

    if (precision===10000) {
      data = dots.p10000
      buffer = deg5km * 1.5
    } else if (precision===5000) {
      data = dots.p5000
      buffer = deg5km * 0.75
    } else if (precision===2000) {
      data = dots.p2000
      buffer = deg5km / 4
    } else if (precision===1000) {
      data = dots.p1000
      buffer = deg5km / 2
    } else {
      data = []
      buffer = 0
    }

    if (!data || !data.records || !data.records.length) {
      d3.select(`#${mapid}`).select('.legendDiv').style('display', 'none')
      svg.style('display', 'none')
      return
    } else {
      if (legendOpts.display) {
        d3.select(`#${mapid}`).select('.legendDiv').style('display', 'block')
      } else {
        d3.select(`#${mapid}`).select('.legendDiv').style('display', 'none')
      }
      if (precision===0) {
        svg.style('display', 'none')
      } else {
        svg.style('display', 'block')
      }
    }

    const filteredData = data.records.filter(function(d){
      if (d.lng  < view._southWest.lng - buffer ||
          d.lng > view._northEast.lng + buffer ||
          d.lat  < view._southWest.lat - buffer ||
          d.lat > view._northEast.lat + buffer) {
        return false
      } else {
        if (!d.geometry) {
          if (precision!==0) {
            const shape = d.shape ? d.shape : data.shape
            const size = d.size ? d.size : data.size
            d.geometry = getGjson(d.gr, 'wg', shape, size)
          }
        }
        return true
      }
    })

    if (precision!==0) {
      // Atlas data - goes onto an SVG where D3 can work with it
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
        .style("cursor", () => {
          if (onclick) {
            return 'pointer'
          }
        })
        .on('click', d => {
          if (onclick) {
            onclick(d.gr, d.id ? d.id : null, d.caption ? d.caption : null)
          }
        })
        .on('mouseover', d => {
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
  }

/** @function setMapType
  * @param {string} newMapTypesKey - A string which a key used to identify a data accessor function. 
  * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
  * The data accessor is stored in the mapTypesSel object and referenced by this key.
  */
  function setMapType(newMapTypesKey) {
    mapTypesKey = newMapTypesKey
  }

/** @function setIdentfier
  * @param {string} identifier - A string which identifies some data to 
  * a data accessor function.
  * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
  * The data accessor function, specified elsewhere, will use this identifier to access
  * the correct data.
  */
  function setIdentfier(identifier) {
    taxonIdentifier = identifier
  }

/** @function redrawMap
  * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
  * Redraw the map, e.g. after changing map accessor function or map identifier.
  */
  function redrawMap(){

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
        const legendSvg = d3.select(selector).append('svg') 
        svgLegend(legendSvg, legendOpts)
        const bbox = legendSvg.node().getBBox()
        const w = legendOpts.width ? legendOpts.width : bbox.x + bbox.width + bbox.x
        const h = legendOpts.height ? legendOpts.height : bbox.y + bbox.height + bbox.y
        d3.select(`#${mapid}`).select('.legendDiv').html(`<svg class="legendSvg" width="${w}" height="${h}">${legendSvg.html()}</svg>`)
        legendSvg.remove()
      }

      if (precision===0){
        pointMarkers()
      } else {
        reset()
      }
     
    })
  }

/** @function setLegendOpts
  * @param {legendOpts} lo - a legend options object.
  * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
  * The legend options object can be used to specify properties of a legend and even the content
  * of the legend itself.
  */
 function setLegendOpts(lo) {
  legendOpts = lo
 }

/** @function clearMap
  * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
  * Clear the map of dots and legend.
  */
 function clearMap(){
  d3.select(`#${mapid}`).select('.legendDiv').style('display', 'none')
  svg.style('display', 'none')

  // Hide point markers
  if (markers) {
    map.removeLayer(markers)
  }
}

/** @function setSize
  * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
  * Change the size of the leaflet map.
  * @param {number} width - Width of the map. 
  * @param {number} height - Height of the map. 
  */
 function setSize(width, height){
  d3.select(`#${mapid}`)
    .style('width', `${width}px`)
    .style('height', `${height}px`)
  map.invalidateSize()
}

 /** @function invalidateSize
  * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
  * Expose the leaflet map invalidate size method.
  */
  function invalidateSize(){
    map.invalidateSize()
  }

 /** @function addBasemapLayer
  * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
  * Provides a method to add a basemap layer after the map is created.
  * @param {basemapConfig} config - a configuration object to define the new layer. 
  */
  function addBasemapLayer(config){
    if (!baseMaps[config.name]) {
      // Add config to baseMaps
      let lyrFn
      if (config.type === 'tileLayer') {
        lyrFn = L.tileLayer
      } else if (config.type === 'wms') {
        lyrFn = L.tileLayer.wms
      }
      if (lyrFn) {
        baseMaps[config.name] = lyrFn(config.url, config.opts)
        if (Object.keys(baseMaps).length === 2) {
          // This is the second base layer - create mapLayerControl
          mapLayerControl = L.control.layers(baseMaps).addTo(map)
        } else {
          mapLayerControl.addBaseLayer(baseMaps[config.name], config.name)
        }
        if (config.selected) {
          map.removeLayer(baseMaps[selectedBaselayerName])
          map.addLayer(baseMaps[config.name])
        }
      }
    }
  }

 /** @function removeBasemapLayer
  * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
  * Provides a method to remove a basemap layer after the map is created.
  * @param {string} mapName - the name by which the map layer is identified (appears in layer selection). 
  */
  function removeBasemapLayer(mapName){
    if (baseMaps[mapName] && Object.keys(baseMaps).length > 1) {
      map.removeLayer(baseMaps[mapName])
      mapLayerControl.removeLayer(baseMaps[mapName])
      delete baseMaps[mapName]
      if (selectedBaselayerName === mapName) {
        // If the removed layer was previously displayed, then
        // display first basemap.
        map.addLayer(baseMaps[Object.keys(baseMaps)[0]])
      }
      if (Object.keys(baseMaps).length === 1) {
        // Only one base layer - remove mapLayerControl
        mapLayerControl.remove()
      }
    }
  }

 /** @function addGeojsonLayer
  * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
  * Provides a method to add a geojson layer after the map is created.
  * @param {geojsonConfig} config - a configuration object to define the new layer. 
  */
  function addGeojsonLayer(config){
    
    if (!geojsonLayers[config.name]) {
      
      if (!config.style) {
        config.style = {
          "color": "blue",
          "weight": 5,
          "opacity": 0.65
        }
      }
      d3.json(config.url).then(data => {
        geojsonLayers[config.name] = L.geoJSON(data, {style: config.style}).addTo(map)
      })
    } else {
      console.log(`Geojson layer with the name ${config.name} is already loaded.`)
    }
  }

 /** @function removeGeojsonLayer
  * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
  * Provides a method to remove a geojson layer after the map is created.
  * @param {string} mapName - the name by which the map layer is identified. 
  */
  function removeGeojsonLayer(name){
    if (geojsonLayers[name]) {
      map.removeLayer(geojsonLayers[name])
      delete geojsonLayers[name]
    } else {
      console.log(`Geojson layer with the name ${name} not found.`)
    }
  }


 /** @function showOverlay
  * @description <b>This function allows you to show/hide the leaflet overlay layer (atlas layer)</b>.
  * Provides a method to show/hide the leaflet overlay layer used to display atlas data.
  * @param {boolean} show - Set to true to display the layer, or false to hide it. 
  */
  function showOverlay(show) {
    if (show) {
      if (legendOpts.display) {
        d3.select(`#${mapid}`).select('.legendDiv').style('display', 'block')
      } else {
        d3.select(`#${mapid}`).select('.legendDiv').style('display', 'none')
      }
      svg.style('display', 'block')
    } else {
      d3.select(`#${mapid}`).select('.legendDiv').style('display', 'none')
      svg.style('display', 'none')
    }
  }

 /** @function changeClusterThreshold
  * @description <b>This function allows you to change the clustering threshold zoom level for point maps</b>.
  * @param {number} clusterZoomThreshold - The leaflet zoom level above which clustering will be turned off.
  */
  function changeClusterThreshold(level) {
    clusterZoomThreshold = level
    if (precision===0){
      pointMarkers()
    } 
  }

  /**
   * @typedef {Object} api
   * @property {module:slippyMap~setIdentfier} setIdentfier - Identifies data to the data accessor function.
   * @property {module:slippyMap~setMapType} setMapType - Set the key of the data accessor function.
   * @property {module:slippyMap~setLegendOpts} setLegendOpts - Sets options for the legend.
   * @property {module:slippyMap~redrawMap} redrawMap - Redraw the map.
   * @property {module:slippyMap~clearMap} clearMap - Clear the map.
   * @property {module:slippyMap~setSize} setSize - Reset the size of the leaflet map.
   * @property {module:slippyMap~invalidateSize} invalidateSize - Access Leaflet's invalidateSize method.
   * @property {module:slippyMap~addBasemapLayer} addBasemapLayer - Add a basemap to the map.
   * @property {module:slippyMap~removeBasemapLayer} removeBasemapLayer - Remove a basemap from the map.
   * @property {module:slippyMap~addGeojsonLayer} addGeojsonLayer - Add a geojson layer to the map.
   * @property {module:slippyMap~removeGeojsonLayer} removeGeojsonLayer - Remove a geojson layer from the map.
   * @property {module:slippyMap~showOverlay} showOverlay - Show/hide the overlay layer.
   * @property {module:slippyMap~changeClusterThreshold} changeClusterThreshold - Change the zoom cluster threshold for points.
   * @property {module:slippyMap~map} lmap - Returns a reference to the leaflet map object.
   */
  return  {
    setIdentfier: setIdentfier,
    setLegendOpts: setLegendOpts,
    redrawMap: redrawMap,
    setMapType: setMapType,
    clearMap: clearMap,
    setSize: setSize,
    invalidateSize: invalidateSize,
    addBasemapLayer: addBasemapLayer,
    removeBasemapLayer: removeBasemapLayer,
    addGeojsonLayer: addGeojsonLayer,
    removeGeojsonLayer: removeGeojsonLayer,
    showOverlay: showOverlay,
    changeClusterThreshold: changeClusterThreshold,
    lmap: map
  }
}