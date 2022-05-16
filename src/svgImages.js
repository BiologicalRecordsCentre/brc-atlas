import * as d3 from 'd3'

const basemaps = {}

export function showImage(mapId, show, gBasemaps, imageFile, worldFile, trans) {

  // Save the map source details for use with transformImages
  if (!basemaps[mapId] && show) {
    basemaps[mapId] = {
      mapId: mapId,
      imageFile: imageFile,
      worldFile: worldFile
    }
  } 

  const transId = trans.params.id

  // Ensure g element exists for this mapId.
  if (gBasemaps.select(`#basemap-${mapId}`).size() === 0) {
    gBasemaps.append('g').attr('id', `basemap-${mapId}`)
  }

  // Hide/show main g element for mapId appropriately
  if (show) {
    gBasemaps.select(`#basemap-${mapId}`).classed('hidden', false)
  } else {
    gBasemaps.select(`#basemap-${mapId}`).classed('hidden', true)
    return
  }

  // Ensure g element exists for this mapId & transId
  if (gBasemaps.select(`#basemap-${mapId}-${transId}`).size() === 0) {
    gBasemaps.select(`#basemap-${mapId}`).append('g').attr('id', `basemap-${mapId}-${transId}`) 
  }

  // Hide all g elements corresponding to different transitions within main mapId g elment
  // except that corresponding to this transID
  gBasemaps.select(`#basemap-${mapId}`).selectAll('g').classed('hidden', true)
  gBasemaps.select(`#basemap-${mapId}-${transId}`).classed('hidden', false)
  
  // Add the images to the map/trans g element if none there already
  if (gBasemaps.select(`#basemap-${mapId}-${transId} Image`).size() === 0) {
    const img = new Image()
    img.onerror = function(e) {
      console.log(imageFile, 'could not be opened.', e)
    }
    img.onload = function() {
      const imageWidth = this.width
      const imageHeight = this.height

      fetch(worldFile)
        .then(response => {
          response.text().then(text => {
            const aWrld = text.split('\n')

            const xResolution = Number(aWrld[0])
            const yResolution = Number(aWrld[3]) //negative value
            const minEasting = Number(aWrld[4])
            const maxNorthing = Number(aWrld[5])

            const maxEasting = minEasting + imageWidth * xResolution
            const minNorthing = maxNorthing + imageHeight * yResolution

            const topLeft = trans.point([minEasting, maxNorthing])
            const topRight = trans.point([maxEasting, maxNorthing])
            const bottomLeft = trans.point([minEasting, minNorthing])

            const iInsets = trans.params.insets ? trans.params.insets.length : 0
            for (let i=0; i <= iInsets; i++) {
              let xShift = 0, yShift = 0
              if (i > 0) {
                // Inset
                const bounds = trans.params.insets[i-1].bounds
                const dims = trans.insetDims[i-1]
                const xmid = bounds.xmin + (bounds.xmax - bounds.xmin)/2
                const ymid = bounds.ymin + (bounds.ymax - bounds.ymin)/2
                const xyWithInset = trans.point([xmid, ymid])
                const xyWithNoInset = trans.point([xmid, ymid], true)
                xShift = xyWithInset[0] - xyWithNoInset[0] 
                yShift = xyWithInset[1] - xyWithNoInset[1]

                //console.log(dims)
                const clippath = d3.select('svg defs')
                  .append('clipPath').attr('id', `clippath-${mapId}-${transId}-${i}`)
                clippath.append('rect')
                    .attr('x', dims.x)
                    .attr('y', dims.y)
                    .attr('width', dims.width)
                    .attr('height', dims.height)
              }

              // Changed to use dataURL rather than file path URL so that image can be 
              // serialised when using the saveMap method.
              const img = gBasemaps.select(`#basemap-${mapId}-${transId}`).append('image')
                //.attr('xmlns:xlink', "http://www.w3.org/1999/xlink")
                .attr('xlink:href', getDataUrl(this)) // xlink:href required to properly use image data URLs in SVG file
                //.attr('href', getDataUrl(this))
                .attr('x', topLeft[0] + xShift)
                .attr('y', topLeft[1] + yShift) 
                .attr('width', topRight[0]-topLeft[0])
                .attr('height', bottomLeft[1]-topLeft[1])

              if (i > 0) {
                img.attr('clip-path', `url(#clippath-${mapId}-${transId}-${i})`)
              }
            }
          })
        })
        .catch(e => {
          console.log(worldFile, 'could not be opened.', e)
        })  
    }
    // Load the image into image object so that we can get
    // its dimensions.
    img.src = imageFile
  }
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

export function transformImages(gBasemaps, trans) {

  Object.keys(basemaps).forEach(k => {
    const b = basemaps[k]
    if (b.imageFile) {
      const hidden = gBasemaps.select(`#basemap-${b.mapId}`).classed('hidden')
      //console.log(b.mapId, !hidden)
      showImage(b.mapId, !hidden, gBasemaps, b.imageFile, b.worldFile, trans)
    }
  })
}

export function setImagePriorities(gBasemaps, mapIds){
  mapIds.reverse().forEach(mapId => {
    gBasemaps.append('g')
      .attr('id', `basemap-${mapId}`)
      .classed('baseMapHidden', true)
  })
}