// function serialize(svg) {
//   const xmlns = "http://www.w3.org/2000/xmlns/"
//   const xlinkns = "http://www.w3.org/1999/xlink"
//   const svgns = "http://www.w3.org/2000/svg"

//   svg = svg.cloneNode(true)
//   const fragment = window.location.href + "#"
//   const walker = document.createTreeWalker(svg, NodeFilter.SHOW_ELEMENT)
//   while (walker.nextNode()) {
//     for (const attr of walker.currentNode.attributes) {
//       if (attr.value.includes(fragment)) {
//         attr.value = attr.value.replace(fragment, "#")
//       }
//     }
//   }
//   svg.setAttributeNS(xmlns, "xmlns", svgns)
//   svg.setAttributeNS(xmlns, "xmlns:xlink", xlinkns)
//   const serializer = new window.XMLSerializer
//   const string = serializer.serializeToString(svg)
//   return new Blob([string], {type: "image/svg+xml"})
// }

export function rasterize(d3Svg) {
  let resolve, reject
  const svg = d3Svg.node()
  const promise = new Promise((y, n) => (resolve = y, reject = n))
  const image = new Image
  image.onerror = reject
  image.onload = () => {
    const rect = svg.getBoundingClientRect()
    // Create a canvas element
    var canvas = document.createElement('canvas')
    canvas.width = rect.width
    canvas.height = rect.height
    var context = canvas.getContext('2d')
    context.drawImage(image, 0, 0, rect.width, rect.height)
    context.canvas.toBlob(resolve)
  }
  //image.src = URL.createObjectURL(serialize(svg))
  const data = new XMLSerializer().serializeToString(svg)
  image.src = "data:image/svg+xml; charset=utf8, " + encodeURIComponent(data)
  return promise
}
