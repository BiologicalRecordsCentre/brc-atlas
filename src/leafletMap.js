/** @module slippyMap */

import * as L from 'leaflet'
import * as d3 from 'd3'
import { getCentroid, getGjson } from 'brc-atlas-bigr'
import { dataAccessors } from './dataAccess.js'
import { svgLegend } from './svgLegend.js'
import { constants } from './constants.js'
import { downloadCurrentData } from './download.js'

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
 * @param {boolean} opts.showCountries - Indicates whether or not the map will display Country boundaries.
 * @param {boolean} opts.showVcs - Indicates whether or not the map will display Vice County boundaries.
 * @param {boolean} opts.showVcsTooltips - Indicates whether or not the name and number of the VC should be shown on click.
 * Note that you will need to ensure that the VC has 'fill' style property set to true if you want users to be able to click
 * anywhere within a VC boundary. You can also set the 'fillOpacity' property to 0 if you don't want the fill to be visible.
 * (Note that the default styleVcs properties include these values.)
 * @param {Array.<object>} opts.styleVcs - An array of objects defining styles for VCs at different zoom levels. The properties
 * of each can be any that are meaningful to a path object in Leaflet (https://leafletjs.com/reference.html#path-option). Each
 * object also has an property called 'zoom' which can be set to an array of Leaflet zoom levels. The style properties will
 * only be applied if the map zoom level is in the array. A shortcut to indicating all zoom levels not included in other
 * array members is an empty array. If the property includes only one style object, with the zoom property set to an empty
 * array, then the style properties will be applied at all zoom levels.
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
 * @param {Array.<function>} opts.callbacks - An array of callbacks that can be used during data loading/display.
 * Typically these can be used to display/hide busy indicators.
 * <br/>callbacks[0] is fired at the start of data redraw.
 * <br/>callbacks[1] is fired at the end of data redraw.
 * <br/>callbacks[2] is fired at the start of data download.
 * <br/>callbacks[3] is fired at the end of data download.
 * @returns {module:slippyMap~api} Returns an API for the map.
 */

export function leafletMap({
  // Default options in here
  selector = 'body',
  mapid = 'leafletMap',
  showCountries=false,
  showVcs = false,
  showVcsTooltips = true,
  styleVcs = [
    {zoom: [], color: 'black', fill: true, weight: 2, opacity: 0.4, fillOpacity: 0},
    {zoom: [7,6,5,4,3,2,1], color: 'black', fill: true, weight: 1, opacity: 0.3, fillOpacity: 0}
  ],
  captionId = '',
  clusterZoomThreshold = 19,
  onclick = null,
  height = 500,
  width = 300,
  basemapConfigs = [],
  mapTypesKey = 'Standard hectad',
  mapTypesSel = dataAccessors,
  legendOpts = {display: false},
  callbacks = []
} = {}) {
  let taxonIdentifier, precision
  let dots = {}
  const geojsonLayers = {}
  let markers = null
  const vcs = {mbrs: null, vcs1000: null, vcs100: {}, vcs10: {}, vcsFull: {}}
  const countries = {countries1000: null, countries100: null, countries10: null, countriesFull: null}

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

  map.on("viewreset", redraw) // Not firing on current version - seems to be a bug
  map.on("zoomstart", () => {
    //console.log("zoom start")
    svg.style('display', 'none')
  })
  map.on("zoomend", () => {
    //console.log("zoom end")
    redrawCountries()
    redraw()
  })
  map.on("moveend", () => {
    //console.log("move end")
    redrawVcs()
    redraw()
  })
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

  map.createPane('atlaspane')
  map.getPane('atlaspane').style.zIndex = 650
  const svg = d3.select(map.getPane('atlaspane')).append("svg")
  svg.attr('id', 'atlas-leaflet-svg')
  // Added overflow visible to svg (02/09/2021) because it was found to fix a very odd problem - svg graphics not
  // visible in ESB atlas but only on Firefox on Windows.
  svg.style('overflow', 'visible')
  //const svg = d3.select(map.getPanes().overlayPane).append("svg")

  // Necessary to set SVG pointer events to none otherwise pointer events
  // do not propagate to layers below (e.g. VCs). This does not interfer if a onclick config
  // is used to set an event on feature click.
  svg.style('pointer-events', 'none')

  // Dont use the leaflet class leaflet-zoom-hide because we are handling
  // the hide/display of SVG layer ourselves so that it is only redisplayed
  // once dots have been regenerated (because it is quite slow)
  const g = svg.append("g") //.attr("class", "leaflet-zoom-hide")

  // Create pane for Vice Counties
  map.createPane('vcpane')
  map.getPane('vcpane').style.zIndex = 649

  // Initiate VC and Country display
  redrawVcs()
  redrawCountries()

  function pointMarkers() {
    // Hide the SVG (atlas elements)
    d3.select(`#${mapid}`).select('.legendDiv').style('display', 'none')
    svg.style('display', 'none')

    // Remove any previous
    if (markers) {
      map.removeLayer(markers)
      //console.log('removing')
    }

    //console.log('remaking', clusterZoomThreshold)

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

  function redraw() {

    // redraw and yieldRedraw are separated into two separate
    // functions so that callbacks[0] can be called before
    // called the rest of the code asynchronously. This is
    // required in order to yield control to event queue so that
    // if callbacks[0] updates gui (e.g. to show busy indicator)
    // it happens before rest of code executed.

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

    legendOpts.accessorData = data.legend
    if (!(legendOpts.display && (legendOpts.data || legendOpts.accessorData))) {
    //if (!legendOpts || !legendOpts.data || !legendOpts.data.lines || !legendOpts.data.lines.length) {
      d3.select(`#${mapid}`).select('.legendDiv').style('display', 'none')
    } else {
      if (legendOpts.display) {
        d3.select(`#${mapid}`).select('.legendDiv').style('display', 'block')
      } else {
        d3.select(`#${mapid}`).select('.legendDiv').style('display', 'none')
      }
    }

    if (!data) {
      data = {}
    }
    if (!data.records) {
      data.records = []
    }
    if (callbacks[0]) callbacks[0]()
    setTimeout(() => yieldRedraw(data, buffer), 50)
  }

  function yieldRedraw(data, buffer) {

    // Hide point markers
    if (markers && precision!==0) {
      map.removeLayer(markers)
    }

    const view = map.getBounds()

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

    //console.log(filteredData)

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

      if (isFinite(topLeft) && isFinite(bottomRight)) {
        // These values are not finite if no data specified
        svg.attr("width", bottomRight[0] - topLeft[0])
          .attr("height", bottomRight[1] - topLeft[1])
          .style("left", topLeft[0] + "px")
          .style("top", topLeft[1] + "px")

        g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")")
      }
      // I can't find a way of dealing with paths and circles in the same
      // enter/update statement. (There may be a way using d3 symbols for
      // creating the circles, but sizing would need work.) So instead
      // we do two enter/update statements - one for circles and one for
      // paths, but it means that we have to repeat all the common code
      // for setting properties, event handlers etc.

      // Separate data rendered with path and data rendered with Circle
      const filteredDataPath = filteredData.filter(d => {
        const shape = d.shape ? d.shape : data.shape
        return shape!=='circlerad'
      })
      const filteredDataCircle = filteredData.filter(d => {
        const shape = d.shape ? d.shape : data.shape
        return shape==='circlerad'
      })

      // Create promises to be resolved when the circles and paths
      // have been redrawn.
      let pRedrawPath, pRedrawCircle
      const up = g.selectAll("path")
        .data(filteredDataPath, function(d) {
          return d.gr
        })
      up.exit()
        .remove()

      if (filteredDataPath.length) {

        pRedrawPath = up.enter()
          .append("path")
          .style("pointer-events", "all")
          .style("cursor", () => {
            if (onclick) {
              return 'pointer'
            }
          })
          .on('click', (a1,a2) => {
            let d
            if(a1.type === 'click') {
              d=a2
            } else {
              d=a1
            }
            if (onclick) {
              onclick(d.gr, d.id ? d.id : null, d.caption ? d.caption : null)
            }
          })
          .on('mouseover', (a1,a2) => {
            let d
            if(a1.type === 'mouseover') {
              d=a2
            } else {
              d=a1
            }
            if (captionId) {
              if (d.caption) {
                d3.select(`#${captionId}`).html(d.caption)
              } else {
                d3.select(`#${captionId}`).html('')
              }
            }
          })
          .on('mouseout', (a1,a2) => {
            let d
            if(a1.type === 'mouseout') {
              d=a2
            } else {
              d=a1
            }
            if (captionId) {
              d3.select(`#${captionId}`).html(d.noCaption ? d.noCaption : '')
            }
          })
        .merge(up)
          .transition().duration(0) // Required in order to use .end promise
          .attr("d", d => {
            return path(d.geometry)
          })
          .attr("fill-opacity", d => d.opacity ? d.opacity : data.opacity)
          .attr("fill", d => d.colour ? d.colour : data.colour)
          .attr("stroke", 'black')
          .end().catch(() => null) // Catch error which comes from interrupted transition
      } else {
        pRedrawPath = Promise.resolve()
      }

      const uc = g.selectAll("circle")
        .data(filteredDataCircle, function(d) {
          return d.gr
        })
      uc.exit()
        .remove()

      if (filteredDataCircle.length) {
        // Because of projection, the radii of the circles can end up
        // with several values which looks wrong, so we set all to the
        // maximum value.
        let rad = filteredDataCircle.reduce((max, d) => {
          const c0 = d.geometry.coordinates[0][0]
          const c1 = d.geometry.coordinates[0][1]
          const x0 = map.latLngToLayerPoint(new L.LatLng(c0[1], c0[0])).x
          const x1 = map.latLngToLayerPoint(new L.LatLng(c1[1], c1[0])).x
          const rad = Math.floor(Math.abs(x1 - x0))
          return rad > max ? rad : max
        }, 0)
        if (rad === 0) rad=1

        // Update the features

        pRedrawCircle = uc.enter()
          .append("circle")
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
        .merge(uc)
          .transition().duration(0) // Required in order to use .end promise
          .attr("cx", d => {
            return  map.latLngToLayerPoint(new L.LatLng(d.lat, d.lng)).x
          })
          .attr("cy", d => {
            return map.latLngToLayerPoint(new L.LatLng(d.lat, d.lng)).y
          })
          .attr("r", d => rad * d.size)
          .attr("fill-opacity", d => d.opacity ? d.opacity : data.opacity)
          .attr("fill", d => d.colour ? d.colour : data.colour)
          .attr("stroke", 'black')
          .end().catch(() => null) // Catch error which comes from interrupted transition
      } else {
        pRedrawCircle = Promise.resolve()
      }

      pRedrawPath.then(() => {
        //console.log("Paths complete")
      })

      pRedrawCircle.then(() => {
        //console.log("Circles complete")
      })

      Promise.allSettled([pRedrawPath, pRedrawCircle]).then(() => {
        //console.log("Paths and circles complete")
        // callback[1] is fired at the end of data display
        // can be used to hide a busy indicator.
        if (callbacks[1]) callbacks[1]()

        // Redisplay the SVG
        if (precision===0) {
          svg.style('display', 'none')
        } else {
          svg.style('display', 'block')
        }
      })
    }
  }

  function redrawCountries() {

    //console.log('showCountries', showCountries, countries)

    const zoom = map.getZoom()
    const root = constants.thisCdn

    if (showCountries && zoom < 7) {
      if (!countries.countries1000) {
        countries.countries1000 = 'loading'
        d3.json(`${root}/assets/country/countries-4326-2.geojson`)
          .then(data => {
            countries.countries1000 = geojsonCountries(data)
          })
      } else if (countries.countries1000 !== 'loading') {
        if (!map.hasLayer(countries.countries1000)) {
          countries.countries1000.addTo(map)
        }
      }
    } else if (countries.countries1000 !== 'loading') {
      if (map.hasLayer(countries.countries1000)) {
        map.removeLayer(countries.countries1000)
      }
    }

    if (showCountries && zoom >= 7 && zoom < 10)  {
      if (!countries.countries100) {
        countries.countries100 = 'loading'
        d3.json(`${root}/assets/country/countries-4326-5.geojson`)
          .then(data => {
            countries.countries100 = geojsonCountries(data)
          })
      } else if (countries.countries100 !== 'loading') {
        if (!map.hasLayer(countries.countries100)) {
          countries.countries100.addTo(map)
        }
      }
    } else if (countries.countries100 !== 'loading') {
      if (map.hasLayer(countries.countries100)) {
        map.removeLayer(countries.countries100)
      }
    }

    if (showCountries && zoom >= 10 && zoom < 12)  {
      if (!countries.countries10) {
        countries.countries10 = 'loading'
        d3.json(`${root}/assets/country/countries-4326-25.geojson`)
          .then(data => {
            countries.countries10 = geojsonCountries(data)
          })
      } else if (countries.countries10 !== 'loading') {
        if (!map.hasLayer(countries.countries10)) {
          countries.countries10.addTo(map)
        }
      }
    } else if (countries.countries10 !== 'loading') {
      if (map.hasLayer(countries.countries10)) {
        map.removeLayer(countries.countries10)
      }
    }

    if (showCountries && zoom >= 12)  {
      if (!countries.countriesFull) {
        countries.countriesFull = 'loading'
        d3.json(`${root}/assets/country/countries-4326-80.geojson`)
          .then(data => {
            countries.countriesFull = geojsonCountries(data)
          })
      } else if (countries.countriesFull !== 'loading') {
        if (!map.hasLayer(countries.countriesFull)) {
          countries.countriesFull.addTo(map)
        }
      }
    } else if (countries.countriesFull !== 'loading') {
      if (map.hasLayer(countries.countriesFull)) {
        map.removeLayer(countries.countriesFull)
      }
    }

    function geojsonCountries(data) {

      return L.geoJSON(data,
        {
          pane: 'vcpane',
          style: getStyle()
        }
      ).addTo(map)
    }
  }

  function redrawVcs() {

    //console.log(map.getZoom())
    const root = constants.thisCdn

    // Load the VC mbr file if not already
    if (showVcs) {
      if (!vcs.mbrs) {
        const mbrFile = `${root}/assets/vc/mbrs.csv`
        d3.csv(mbrFile, vc => {
          return {
            vc: vc.vc,
            _southWest: {
              lat: Number(vc.lllat),
              lng: Number(vc.lllon),
            },
            _northEast: {
              lat: Number(vc.urlat),
              lng: Number(vc.urlon),
            }
          }
        }).then(data => {
          vcs.mbrs = data
          displayVcs()
        })
      } else {
        displayVcs()
      }
    } else {
      // Remove any VCs currently displayed
      if (map.hasLayer(vcs.vcs1000)) {
        map.removeLayer(vcs.vcs1000)
      }
      Object.keys(vcs.vcs100).forEach(vc => {
        if (map.hasLayer(vcs.vcs100[vc])) {
          map.removeLayer(vcs.vcs100[vc])
        }
      })
      Object.keys(vcs.vcs10).forEach(vc => {
        if (map.hasLayer(vcs.vcs10[vc])) {
          map.removeLayer(vcs.vcs10[vc])
        }
      })
      Object.keys(vcs.vcsFull).forEach(vc => {
        if (map.hasLayer(vcs.vcsFull[vc])) {
          map.removeLayer(vcs.vcsFull[vc])
        }
      })
    }

    function displayVcs() {
      const zoom = map.getZoom()

      // Because the d3.json load is asynchronous, can be
      // kicked off more than once for same file so we
      // use the 'loading' flag to prevent this.

      if (zoom < 7) {
        if (!vcs.vcs1000) {
          vcs.vcs1000 = 'loading'
          d3.json(`${root}/assets/vc/vcs-4326-1000.geojson`)
            .then(data => {
              vcs.vcs1000 = geojsonVcs(data)
            })
        } else if (vcs.vcs1000 !== 'loading') {
          if (!map.hasLayer(vcs.vcs1000)) {
            vcs.vcs1000.addTo(map)
          }
        }
      } else if (vcs.vcs1000 !== 'loading') {
        if (map.hasLayer(vcs.vcs1000)) {
          map.removeLayer(vcs.vcs1000)
        }
      }

      if (zoom >= 7 && zoom < 10)  {

        vcsInView().forEach(vc => {
          if (!vcs.vcs100[vc]) {
            vcs.vcs100[vc] = 'loading'
            d3.json(`${root}/assets/vc/100/${vc}.geojson`)
              .then(data => {
                vcs.vcs100[vc] = geojsonVcs(data)
              })
          } else if (vcs.vcs100[vc] !== 'loading'){
            if (!map.hasLayer(vcs.vcs100[vc])) {
              vcs.vcs100[vc].addTo(map)
            }
          }
        })
      } else {
        Object.keys(vcs.vcs100).forEach(vc => {
          if (vcs.vcs100[vc] !== 'loading') {
            if (map.hasLayer(vcs.vcs100[vc])) {
              map.removeLayer(vcs.vcs100[vc])
            }
          }
        })
      }

      if (zoom >= 10 && zoom < 12)  {
        //console.log('VCs simpified ten')
        vcsInView().forEach(vc => {
          if (!vcs.vcs10[vc]) {
            vcs.vcs10[vc] = 'loading'
            d3.json(`${root}/assets/vc/10/${vc}.geojson`)
              .then(data => {
                vcs.vcs10[vc] = geojsonVcs(data)
              })
          } else if (vcs.vcs10[vc] !== 'loading') {
            if (!map.hasLayer(vcs.vcs10[vc])) {
              vcs.vcs10[vc].addTo(map)
            }
          }
        })
      } else {
        Object.keys(vcs.vcs10).forEach(vc => {
          if (vcs.vcs10[vc] !== 'loading') {
            if (map.hasLayer(vcs.vcs10[vc])) {
              map.removeLayer(vcs.vcs10[vc])
            }
          }
        })
      }

      if (zoom >= 12)  {
        //console.log('VCs full res')
        vcsInView().forEach(vc => {
          if (!vcs.vcsFull[vc]) {
            vcs.vcsFull[vc] = 'loading'
            d3.json(`${root}/assets/vc/full/${vc}.geojson`)
              .then(data => {
                vcs.vcsFull[vc] = geojsonVcs(data)
              })
          } else if (vcs.vcsFull[vc] !== 'loading') {
            if (!map.hasLayer(vcs.vcsFull[vc])) {
              vcs.vcsFull[vc].addTo(map)
            }
          }
        })
      } else {
        Object.keys(vcs.vcsFull).forEach(vc => {
          if (vcs.vcsFull[vc] !== 'loading') {
            if (map.hasLayer(vcs.vcsFull[vc])) {
              map.removeLayer(vcs.vcsFull[vc])
            }
          }
        })
      }

      // Reset styles depending on zoom level
      if (vcs.vcs1000 !== 'loading' && map.hasLayer(vcs.vcs1000)) {
        vcs.vcs1000.setStyle(getStyle())
      }
      Object.keys(vcs.vcs100).forEach(vc => {
        if (vcs.vcs100[vc] !== 'loading' && map.hasLayer(vcs.vcs100[vc])) {
          vcs.vcs100[vc].setStyle(getStyle())
        }
      })
      Object.keys(vcs.vcs10).forEach(vc => {
        if (vcs.vcs10[vc] !== 'loading' && map.hasLayer(vcs.vcs10[vc])) {
          vcs.vcs10[vc].setStyle(getStyle())
        }
      })
      Object.keys(vcs.vcsFull).forEach(vc => {
        if (vcs.vcsFull[vc] !== 'loading' && map.hasLayer(vcs.vcsFull[vc])) {
          vcs.vcsFull[vc].setStyle(getStyle())
        }
      })
    }

    function geojsonVcs(data) {
      let fn = null
      if (showVcsTooltips) {
        fn = (f, l) => {
          return l.bindPopup(`VC: <b>${f.properties['CODE']}</b> ${f.properties['NAME']}`)
        }
      }
      return L.geoJSON(data,
        {
          pane: 'vcpane',
          style: getStyle(),
          interactive: showVcsTooltips,
          onEachFeature: fn
        }
      ).addTo(map)
    }
    function vcsInView() {
      return vcs.mbrs.filter(vc => overlaps(vc, map.getBounds())).map(vc => vc.vc)
    }
    function overlaps(v1, v2) {

      //console.log(v1, v2)

      const v1minx = v1._southWest.lng
      const v1maxx = v1._northEast.lng
      const v1miny = v1._southWest.lat
      const v1maxy = v1._northEast.lat

      const v2minx = v2._southWest.lng
      const v2maxx = v2._northEast.lng
      const v2miny = v2._southWest.lat
      const v2maxy = v2._northEast.lat

      // Bottom left corner of v1 overlaps v2
      if (v1minx > v2minx && v1minx < v2maxx && v1miny > v2miny && v1miny < v2maxy) return true

      // Bottom right corner of v1 overlaps v2
      if (v1maxx > v2minx && v1maxx < v2maxx && v1miny > v2miny && v1miny < v2maxy) return true

      // Top right corner of v1 overlaps v2
      if (v1maxx > v2minx && v1maxx < v2maxx && v1maxy > v2miny && v1maxy < v2maxy) return true

      // Top left corner of v1 overlaps v2
      if (v1minx > v2minx && v1minx < v2maxx && v1maxy > v2miny && v1maxy < v2maxy) return true

      // Bottom left corner of v2 overlaps v1
      if (v2minx > v1minx && v2minx < v1maxx && v2miny > v1miny && v2miny < v1maxy) return true

      // Bottom right corner of v2 overlaps v1
      if (v2maxx > v1minx && v2maxx < v1maxx && v2miny > v1miny && v2miny < v1maxy) return true

      // Top right corner of v2 overlaps v1
      if (v2maxx > v1minx && v2maxx < v1maxx && v2maxy > v1miny && v2maxy < v1maxy) return true

      // Top left corner of v2 overlaps v1
      if (v2minx > v1minx && v2minx < v1maxx && v2maxy > v1miny && v2maxy < v1maxy) return true

      // No overlap
      return false
    }
  }

  function getStyle() {
    // Get style where zoom explicity named in one of the
    // style objects zoom arrays.
    let style = styleVcs.find(s => s.zoom.indexOf(map.getZoom())>-1)
    // If not found, then find the style with empty zoom array
    if (!style) {
      style = styleVcs.find(s => s.zoom.length===0)
    }
    return style
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

    // callback[2] is fired as start of data download and
    // can be used to show a busy indicator. As data is
    // loaded asychronously, the gui should be updated okay.
    if (callbacks[2]) callbacks[2]()

    const accessFunction = mapTypesSel[mapTypesKey]
    return accessFunction(taxonIdentifier).then(data => {
      if (data && data.records) {
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
      }

      // callback[3] is fired at the end of data download and
      // can be used to hide a busy indicator.
      if (callbacks[3]) callbacks[3]()

      if (precision===0){
        pointMarkers()
      } else {
        redraw()
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

/** @function setShowVcs
  * @description <b>This function allows you to change whether or not Vice County boundaries are displayed.</b>.
  * @param {boolean} show - Indicates whether or not to display VCs.
  */
    function setShowVcs(show) {
      showVcs = show
      redrawVcs()
    }

/** @function setShowCountries
  * @description <b>This function allows you to change whether or not Country boundaries are displayed.</b>.
  * @param {boolean} show - Indicates whether or not to display Countries.
  */
 function setShowCountries(show) {
  showCountries = show
  redrawCountries()
}

/** @function downloadData
  * @param {boolean} asGeojson - a boolean value that indicates whether to generate GeoJson (if false, generates CSV).
  * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
  */
  function downloadData(asGeojson){

    const accessFunction = mapTypesSel[mapTypesKey]
    downloadCurrentData(accessFunction(taxonIdentifier), precision, asGeojson)
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
   * @property {module:slippyMap~setShowVcs} setShowVcs - Set the boolean flag which indicates whether or not to display VCs.
   * @property {module:slippyMap~setShowCountries} setShowCountries - Set the boolean flag which indicates whether or not to display Countries.
   * @property {module:slippyMap~downloadData} downloadData - Download a the map data as a CSV or GeoJson file.
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
    setShowVcs: setShowVcs,
    setShowCountries: setShowCountries,
    downloadData: downloadData,
    lmap: map
  }
}