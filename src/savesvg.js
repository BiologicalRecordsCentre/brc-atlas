import * as d3 from 'd3'

// See https://observablehq.com/@mbostock/saving-svg 

export function serialize(svg) {
  const xmlns = "http://www.w3.org/2000/xmlns/"
  const xlinkns = "http://www.w3.org/1999/xlink"
  const svgns = "http://www.w3.org/2000/svg"

  const domSvg = svg.node()
  const cloneSvg = domSvg.cloneNode(true)
  const d3Clone = d3.select(cloneSvg)
  // Delete all hidden items (backrop images) from clone
  d3Clone.selectAll('.hidden').remove()

  // I don't think this next loop is important in our situation
  // const fragment = window.location.href + "#"
  // const walker = document.createTreeWalker(svg, NodeFilter.SHOW_ELEMENT)
  // while (walker.nextNode()) {
  //   for (const attr of walker.currentNode.attributes) {
  //     if (attr.value.includes(fragment)) {
  //       attr.value = attr.value.replace(fragment, "#")
  //     }
  //   }
  // }

  cloneSvg.setAttributeNS(xmlns, "xmlns", svgns)
  cloneSvg.setAttributeNS(xmlns, "xmlns:xlink", xlinkns)
  const serializer = new window.XMLSerializer
  const string = serializer.serializeToString(cloneSvg)
  return new Blob([string], {type: "image/svg+xml"})
}

export function rasterize(svg) {
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
  //const data = new XMLSerializer().serializeToString(domSvg)
  //image.src = "data:image/svg+xml; charset=utf8, " + encodeURIComponent(data)
  return promise
}
