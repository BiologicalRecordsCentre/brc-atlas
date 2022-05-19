import * as d3 from 'd3'
import { getGjson, getCentroid } from 'brc-atlas-bigr'

// See https://observablehq.com/@mbostock/saving-svg 

let infoHeight=0

export function saveMapImage(svg, trans, expand, asSvg, svgInfo, filename) {

  const pInfoAdded = addInfo(svg, trans, expand, svgInfo)
 
  return new Promise((resolve) => {

    pInfoAdded.then(() => {
      if (asSvg) {
        const blob1 =  serialize(svg)
        if(filename) {
          download(blob1, filename)
        }
        removeInfo(svg, trans, expand)
        resolve(blob1)
      } else {
        rasterize(svg).then(blob2 => {
          if(filename) {
            download(blob2, filename)
          }
          removeInfo(svg, trans, expand)
          resolve(blob2)
        })
      }
    })
  })

  function download(data, filename) {
    const dataUrl = URL.createObjectURL(data)
    const file = asSvg ? `${filename}.svg` : `${filename}.png`
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

          const attrs = {...d}
          delete attrs.gr

          const shape = d.shape ? d.shape : data.shape
          const size = d.size ? d.size : data.size
          return {
            type: 'Feature',
            geometry: getGjson(d.gr, 'wg', shape, size),
            properties: attrs
          }
        } else {
          // ToDo point data
        }
      } else {
        // CSV
        if (precision!==0) {

          let attrs = ''
          Object.keys(d).forEach(k => {
            if (k !== 'gr') {
              attrs = `${attrs},"${d[k]}"`
            }
          })
          const c = getCentroid(d.gr, 'wg')
          return `${d.gr},${c.proj},${c.centroid[1]},${c.centroid[0]}${attrs}`
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
      let attrs = ''
      Object.keys(data.records[0]).forEach(k => {
        if (k !== 'gr') {
          attrs = `${attrs},"${k}"`
        }
      })

      const dataStr = `data:text/csv;charset=utf-8,gr,gr-projection,lat,lon${attrs}\r\n${ftrs.join("\r\n")}`
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

function addInfo(svg, trans, expand, svgInfo) {

  if (!svgInfo) return Promise.resolve()
  
  const infoText = svgInfo.text ? svgInfo.text.split(' ') : []
  const margin = svgInfo.margin ? svgInfo.margin : 0
  const fontSize = svgInfo.fontSize ? svgInfo.fontSize : 12

  // Current dimensions of map SVG
  //const height = Number(svg.attr("height"))
  //const width = Number(svg.attr("width"))

  // Create svg g and text objects and positions


  const gInfo = svg.append('g')
  gInfo.attr('id', 'svgInfo')
  gInfo.attr('transform', `translate(0 ${trans.height})`)

  let mask = gInfo.append('rect').attr('x', 0).attr('y', 0).attr('width', trans.width)
    .style('fill', 'white')
  
  let tInfo = gInfo.append('text').attr('x', margin).attr('y', margin)
  let yLastLine = margin
  
  infoText.forEach((w,i) => {
    const ts = tInfo.append('tspan').style('font-size', fontSize).style('font-family', 'Arial').style('alignment-baseline', 'hanging')
    let word
    if (w.startsWith('<i>')) {
      ts.style('font-style', 'italic')
      word = w.replace('<i>', '').replace('</i>', '')
    } else {
      word = w
    }
    if (i) {
      ts.text(` ${word}`)
    } else {
      ts.text(word)
    }

    if (tInfo.node().getBBox().width > trans.width - 2 * margin) {
      // If the latest word has caused the text element
      // to exceed the width of the SVG, remove it and
      // create a new line for it.
      ts.remove()
      const lineHeight = tInfo.node().getBBox().height
      tInfo = gInfo.append('text')
      yLastLine = yLastLine + lineHeight
      tInfo.attr('x', margin)
      tInfo.attr('y', yLastLine)
      const tsn = tInfo.append('tspan').style('font-size', fontSize).style('font-family', 'Arial').style('alignment-baseline', 'hanging')
      tsn.html(ts.html())
    }
  })

  infoHeight = yLastLine + tInfo.node().getBBox().height + margin
  const h = trans.height+infoHeight
  
  //svg.attr('height', h)
  if (expand) {
    svg.attr("viewBox", "0 0 " + trans.width + " " +  h)
  } else {
    svg.attr("height", h)
  }

  if (svgInfo.img) {
    // Image
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = function() {

        let scale = 1
        if (this.width > trans.width - 2 * margin) {
          scale = (trans.width - 2 * margin) / this.width
        }
        const imgWidth = scale * this.width
        const imgHeight = scale * this.height

        const iInfo = gInfo.append('image')
        iInfo.attr('x', margin)
        iInfo.attr('y', infoHeight)
        iInfo.attr('width', imgWidth)
        iInfo.attr('height', imgHeight)
        // Use dataURL rather than file path URL so that image can be 
        // serialised when using the saveMap method
        iInfo.attr('href', getDataUrl(this))

        infoHeight = infoHeight + margin + imgHeight
        //svg.attr('height', height + infoHeight)
        if (expand) {
          svg.attr("viewBox", "0 0 " + trans.width + " " +  (trans.height  + infoHeight))
        } else {
          svg.attr("height", trans.height + infoHeight)
        }

        mask.style("height", infoHeight)

        resolve()
      }
      img.src = svgInfo.img
    })
  } else {
    // No image - return resolved promise
    return Promise.resolve()
  }

  function getDataUrl(img) {
    // Create canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    // Set width and height
    canvas.width = img.width
    canvas.height = img.height
    // Draw the image - use png format to support background transparency
    ctx.drawImage(img, 0, 0)
    return canvas.toDataURL('image/png')
  }
}

function removeInfo(svg, trans, expand) {
  //const height = Number(svg.attr("height"))
  svg.select('#svgInfo').remove()
  //svg.attr('height', height-infoHeight)

  if (expand) {
    svg.attr("viewBox", "0 0 " + trans.width + " " +  trans.height)
  } else {
    svg.attr("height", trans.height)
  }
}
