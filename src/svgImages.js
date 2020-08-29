import * as d3 from 'd3'

/**
 * #TODO - description and full parameter list.
 * @param {SVG g element} g - the SVG g element that hosts the basemap images.
 * @returns {null} - there is no return object.
 */

export function showImage(mapId, show, gBasemaps, imageFile, worldFile, transform) {

  // If show is false, hide basemap layer
  if (!show) {
    // Hide the basemap layer if g element exists
    if (gBasemaps.select(`#basemap-${mapId}`).node()) {
      gBasemaps.select(`#basemap-${mapId}`).classed('baseMapHidden', true)
    }
    return
  }

  // Ensure g element exists for this mapId. If already exists, display it
  if (!gBasemaps.select(`#basemap-${mapId}`).node()) {
    gBasemaps.append('g', `#basemap-${mapId}`)
  } else {
    gBasemaps.select(`#basemap-${mapId}`).classed('baseMapHidden', false)
  }

  // If there is no image in the g element for this mapId, then add it

  if (!gBasemaps.select(`#basemap-${mapId} image`).node()) {
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

          const topLeft = transform([minEasting, maxNorthing])
          const topRight = transform([maxEasting, maxNorthing])
          const bottomLeft = transform([minEasting, minNorthing])

          gBasemaps.select(`#basemap-${mapId}`).append('image')
            .attr('data-xResolution', xResolution)
            .attr('data-yResolution', yResolution)
            .attr('data-minEasting', minEasting)
            .attr('data-maxNorthing', maxNorthing)
            .attr('data-imageWidth', imageWidth)
            .attr('data-imageHeight', imageHeight)
            .attr('href', imageFile)
            .attr('x', topLeft[0])
            .attr('y', topLeft[1])
            .attr('width', topRight[0]-topLeft[0])
            .attr('height', bottomLeft[1]-topLeft[1])
        })
      })
      .catch(e => {
        console.log(worldFile, 'could not be opened.', e)
      })
    }
    img.src = imageFile
  }
}

export function transformImages(gBasemaps, transform) {

  gBasemaps.selectAll('image')
    .each(function(){
      // Don't use fat arrow above because this needs to
      // resolve correctly below.
      const img = d3.select(this)

      const minEasting = Number(img.attr('data-minEasting'))
      const maxNorthing = Number(img.attr('data-maxNorthing'))
      const imageWidth = Number(img.attr('data-imageWidth'))
      const imageHeight = Number(img.attr('data-imageHeight'))
      const xResolution = Number(img.attr('data-xResolution'))
      const yResolution = Number(img.attr('data-yResolution'))

      const maxEasting = minEasting + imageWidth * xResolution
      const minNorthing = maxNorthing + imageHeight * yResolution

      const topLeft = transform([minEasting, maxNorthing])
      const topRight = transform([maxEasting, maxNorthing])
      const bottomLeft = transform([minEasting, minNorthing])

      img
        .attr('x', topLeft[0])
        .attr('y', topLeft[1])
        .attr('width', topRight[0]-topLeft[0])
        .attr('height', bottomLeft[1]-topLeft[1])
    })
}

export function setImagePriorities(gBasemaps, mapIds){
  mapIds.reverse().forEach(mapId => {
    gBasemaps.append('g')
      .attr('id', `basemap-${mapId}`)
      .classed('baseMapHidden', true)
  })
}