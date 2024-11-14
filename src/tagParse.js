import * as d3 from 'd3'
import { svgMap } from './svgMap.js'
import { leafletMap } from './leafletMap'

export function parseTags () {
  const divs = d3.selectAll("div.brcatlas")
  divs.each(function() {
    // Loop for each div of class brcatlas
    const el = d3.select(this)
    const id = el.attr("id")
    const csv = el.attr("data-csv")
    let valid = true
    if (!id) {
      console.log('Div tag of class "brcatlas" requires an id attribute.')
      valid = false
    }
    if (!csv) {
      console.log(`Div tag (id=${id}) of class "brcatlas" requires a data-csv attribute.`)
      valid = false
    }
    if (valid) {
      // Slippiness
      const slippy = el.attr("data-slippy") ? true : false
      // mapopts. Default true
      const mapopts = el.attr("data-opts") ? el.attr("data-opts") !== "false" : true
      // transopts. Default BI1
      const transopts = el.attr("data-trans") ? el.attr("data-trans") : 'BI1'
      // Precision. Default 10000
      const precision = el.attr("data-precision") ? parseInt(el.attr("data-precision")) : 10000
      // Map height.
      const height = el.attr("data-height") ? parseInt(el.attr("data-height")) : null
      // Map height.
      const width = el.attr("data-width") ? parseInt(el.attr("data-width")) : null

      let mapTypesKey
      switch(precision) {
        case 10000:
          mapTypesKey = 'Standard hectad'
          break
        case 2000:
          mapTypesKey = 'Standard tetrad'
          break
        case 1000:
          mapTypesKey = 'Standard monad'
          break
        default:
          mapTypesKey = 'Standard hectad'
      }

      const opts = {
        selector: `#${id}`,
        mapid: `${id}-map`,
        mapTypesKey: mapTypesKey,
        transOptsControl: mapopts,
        legendOpts: getLegendOpts (el, precision)
      }
      if (height) {
        opts.height = height
      }
      if (width) {
        opts.width = width
      }
      if (transopts) {
        opts.transOptsKey = transopts
      }
      let map
      if (slippy) {
        map = leafletMap(opts)
      } else {
        map = svgMap(opts)
      }
      map.setIdentfier(csv)
      map.redrawMap()
    }
  })
}

function getLegendOpts (el, precision){
  // display. Default true
  const display = el.attr("data-legend") ? el.attr("data-legend") === "true" : false
  // scale. Default 1
  const scale = el.attr("data-legend-scale") ? parseFloat(el.attr("data-legend-scale")) : 1
  // x. Default 0
  const x = el.attr("data-legend-x") ? parseInt(el.attr("data-legend-x")) : 0
  // y. Default 0
  const y = el.attr("data-legend-y") ? parseInt(el.attr("data-legend-y")) : 0
  // title. Default ''
  const title = el.attr("data-legend-title") ? el.attr("data-legend-title") : ''
  // size. Default 1
  const size = el.attr("data-legend-size") ? parseFloat(el.attr("data-legend-size")) : 1
  // opacity. Default 1
  const opacity = el.attr("data-legend-opacity") ? parseFloat(el.attr("data-legend-opacity")) : 1
  // lines. Default ''
  const linesOpts = el.attr("data-legend-lines") ? el.attr("data-legend-lines").split('|') : []
  const lines = linesOpts.map(l => {
    const parts = l.split(';')
    if (parts.length === 3) {
      return {
        colour: parts[2].trim(),
        shape: parts[1].trim(),
        text: parts[0].trim()
      }
    } else {
      return {
        colour: 'red',
        shape: 'circle',
        text: 'incorrect legend line elements'
      }
    }
  })

  const opts = {
    display: display,
    scale: scale,
    x: x,
    y: y,
    data: {
      title: title,
      size: size,
      precision: precision,
      opacity: opacity,
      lines: lines,
    }
  }

  if (display) {
    return opts
  } else {
    return {display: false}
  }
}