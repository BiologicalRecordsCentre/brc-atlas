import * as d3 from 'd3'
import { getGjson, getCentroid } from 'brc-atlas-bigr'

// See https://observablehq.com/@mbostock/saving-svg 

export function saveMapImage(svg, asSvg) {

  if (asSvg) {
    download(serialize(svg))
  } else {
    rasterize(svg).then(blob => {
      download(blob)
    })
  }

  function download(data) {
    const dataUrl = URL.createObjectURL(data)
    const file = asSvg ? 'map.svg' : 'map.png'
    downloadLink(dataUrl, file)
  }

  function serialize(svg) {
    const xmlns = "http://www.w3.org/2000/xmlns/"
    const xlinkns = "http://www.w3.org/1999/xlink"
    const svgns = "http://www.w3.org/2000/svg"
  
    const domSvg = svg.node()
    const cloneSvg = domSvg.cloneNode(true)
    const d3Clone = d3.select(cloneSvg)
    // Delete all hidden items (backrop images) from clone
    d3Clone.selectAll('.hidden').remove()
  
    cloneSvg.setAttributeNS(xmlns, "xmlns", svgns)
    cloneSvg.setAttributeNS(xmlns, "xmlns:xlink", xlinkns)
    const serializer = new window.XMLSerializer
    const string = serializer.serializeToString(cloneSvg)
    return new Blob([string], {type: "image/svg+xml"})
  }
  
  function rasterize(svg) {
    let resolve, reject
    const domSvg = svg.node()
    const promise = new Promise((y, n) => (resolve = y, reject = n))
    const image = new Image
    image.onerror = reject
    image.onload = () => {
      const rect = domSvg.getBoundingClientRect()
      // Create a canvas element
      let canvas = document.createElement('canvas')
      canvas.width = rect.width
      canvas.height = rect.height
      let context = canvas.getContext('2d')
      context.drawImage(image, 0, 0, rect.width, rect.height)
      context.canvas.toBlob(resolve)
    }
    image.src = URL.createObjectURL(serialize(svg))
    return promise
  }
}

export function downloadCurrentData(pData, precision, asGeojson){

  pData.then(data => {
    const ftrs = data.records.map(function(d){
      if (asGeojson) {
        // GeoJson
        if (precision!==0) {
          const shape = d.shape ? d.shape : data.shape
          const size = d.size ? d.size : data.size
          return {
            type: 'Feature',
            geometry: getGjson(d.gr, 'wg', shape, size)
          }
        } else {
          // ToDo point data
        }
      } else {
        // CSV
        if (precision!==0) {
          const c = getCentroid(d.gr, 'wg')
          return `${d.gr},${c.proj},${c.centroid[1]},${c.centroid[0]}`
        } else {
          // ToDo point data
        }
      }
    })

    if (asGeojson) {
      // GeoJson
      const outData = {
        "type": "FeatureCollection",
        "name": "BRC Atlas download",
        "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
        "features": ftrs
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(outData))
      downloadLink(dataStr, "data.geojson")
    } else {
      // CSV
      const dataStr = `data:text/csv;charset=utf-8,gr,gr-projection,lat,lon\r\n${ftrs.join("\r\n")}`
      downloadLink(dataStr, "data.csv")
    }
  })
}

function downloadLink(dataUrl, file) {

  // Create a link element
  const link = document.createElement("a")
  // Set link's href to point to the data URL
  link.href = dataUrl
  link.download = file

  // Append link to the body
  document.body.appendChild(link)

  // Dispatch click event on the link
  // This is necessary as link.click() does not work on the latest firefox
  link.dispatchEvent(
    new MouseEvent('click', { 
      bubbles: true, 
      cancelable: true, 
      view: window 
    })
  )
  // Remove link from body
  document.body.removeChild(link)
}