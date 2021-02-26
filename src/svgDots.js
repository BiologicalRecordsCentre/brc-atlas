import * as d3 from 'd3'
import { getCentroid, checkGr } from 'brc-atlas-bigr'
import { getRadiusPixels } from './svgCoords.js'

export function removeDots(svg) {
  svg.selectAll('.dotCircle').remove()
  svg.selectAll('.dotSquare').remove()
  svg.selectAll('.dotTriangle').remove()
}

export function drawDots(svg, captionId, transform, accessFunction, taxonIdentifier, proj) {
  function getCaption(d) {
    if (d.caption) {
      return d.caption
    } else {
      return ''
    }
  }

  return new Promise((resolve, reject) => {
    if(typeof accessFunction === 'function') {
      accessFunction(taxonIdentifier).then(data => {
        const radiusPixels = getRadiusPixels(transform, data.precision)
        // circles
        let recCircles
        if (data.shape && (data.shape === 'circle' || data.shape === 'bullseye')) {
          recCircles = data.records
        } else {
          recCircles = data.records.filter(d => d.shape && (d.shape === 'circle' || d.shape === 'bullseye'))
        }
        const circles = svg.selectAll('.dotCircle')
          .data(recCircles, d => d.gr)
        circles.enter()
          .append("circle")
          .classed('dotCircle dot', true)
          .attr("cx", d => transform(getCentroid(d.gr, proj).centroid)[0])
          .attr("cy", d => transform(getCentroid(d.gr, proj).centroid)[1]) 
          .attr("r", 0)
          .attr("opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour ? d.colour : data.colour)
        .merge(circles)
          .transition()  
            .ease(d3.easeCubic)   
            .duration(500)
          .attr("r", d => d.size ? radiusPixels * d.size : radiusPixels * data.size)
          .attr("opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour ? d.colour : data.colour)
          .attr("data-caption", d => getCaption(d))
        circles.exit()
          .transition()
            .ease(d3.easeCubic)
            .duration(500)
          .attr("r", 0)
          .remove()

        // bullseye
        let recBullseyes
        if (data.shape && data.shape === 'bullseye') {
          recBullseyes = data.records
        } else {
          recBullseyes = data.records.filter(d => d.shape && d.shape === 'bullseye')
        }
        const bullseyes = svg.selectAll('.dotBullseye')
          .data(recBullseyes, d => d.gr)
          bullseyes.enter()
          .append("circle")
          .classed('dotBullseye dot', true)
          .attr("cx", d => transform(getCentroid(d.gr, proj).centroid)[0])
          .attr("cy", d => transform(getCentroid(d.gr, proj).centroid)[1]) 
          .attr("r", 0)
          .attr("opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour2 ? d.colour2 : data.colour2)
        .merge(bullseyes)
          .transition()  
            .ease(d3.easeCubic)   
            .duration(500)
          .attr("r", d => d.size ? radiusPixels * d.size * 0.5 : radiusPixels * data.size * 0.5)
          .attr("opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour2 ? d.colour2 : data.colour2)
          .attr("data-caption", d => getCaption(d))
          bullseyes.exit()
          .transition()
            .ease(d3.easeCubic)
            .duration(500)
          .attr("r", 0)
          .remove()

        // squares
        let recSquares
        if (data.shape && data.shape === 'square') {
          recSquares = data.records
        } else {
          recSquares = data.records.filter(d => d.shape && d.shape === 'square')
        }
        const squares = svg.selectAll('.dotSquare')
          .data(recSquares, d => d.gr)
        squares.enter()
          .append("rect")
          .classed('dotSquare dot', true)
          .attr("x", d => transform(getCentroid(d.gr, proj).centroid)[0])
          .attr("y", d => transform(getCentroid(d.gr, proj).centroid)[1])
          .attr("width", 0)
          .attr("height", 0) 
          .attr("opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour ? d.colour : data.colour)
        .merge(squares)
          .transition()  
            .ease(d3.easeCubic)   
            .duration(500)
          .attr("width", d => d.size ? 2 * radiusPixels * d.size : 2 * radiusPixels * data.size)
          .attr("height", d => d.size ? 2 * radiusPixels * d.size : 2 * radiusPixels * data.size)
          .attr("transform", d => {
            if (checkGr(d.gr).projection === 'ir') {
              const x = transform(getCentroid(d.gr, proj).centroid)[0]
              const y = transform(getCentroid(d.gr, proj).centroid)[1]
              return `translate(${-radiusPixels},${-radiusPixels}) rotate(5 ${x} ${y})`
            } else {
              return `translate(${-radiusPixels},${-radiusPixels})`
            }
          })
          .attr("opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour ? d.colour : data.colour)
          .attr("data-caption", d => getCaption(d))
        squares.exit()
          .transition()
            .ease(d3.easeCubic)
            .duration(500)
          .attr("width", 0)
          .attr("height", 0)
          .attr("transform", `translate(0,0)`)
          .remove()

        // diamonds
        let recDiamonds
        if (data.shape && data.shape === 'diamond') {
          recDiamonds = data.records
        } else {
          recDiamonds = data.records.filter(d => d.shape && d.shape === 'diamond')
        }
        const diamonds = svg.selectAll('.dotDiamond')
          .data(recDiamonds, d => d.gr)
        diamonds.enter()
          .append("path")
          .classed('dotDiamond dot', true)
          .attr("d", d3.symbol().type(d3.symbolSquare ).size(0))
          .attr("opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour ? d.colour : data.colour)
          .attr("transform", d => {
            const x = transform(getCentroid(d.gr, proj).centroid)[0]
            const y = transform(getCentroid(d.gr, proj).centroid)[1]
            // TODO - only do this rotation for output projection gb
            if (checkGr(d.gr).projection === 'ir') {
              return `translate(${x},${y}) rotate(50)`
            } else {
              return `translate(${x},${y}) rotate(45)`
            }
          })
        .merge(diamonds)
          .transition()  
            .ease(d3.easeCubic)   
            .duration(500)
          .attr("d", d3.symbol().type(d3.symbolSquare ).size(radiusPixels * radiusPixels * 2))
          .attr("opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour ? d.colour : data.colour)
          .attr("data-caption", d => getCaption(d))
        diamonds.exit()
          .transition()
            .ease(d3.easeCubic)
            .duration(500)
          .attr("d", d3.symbol().type(d3.symbolSquare ).size(0))
          .remove()

        // up triangles
        let recTriangles
        if (data.shape && data.shape.startsWith('triangle')) {
          recTriangles = data.records
        } else {
          recTriangles = data.records.filter(d => d.shape && d.shape.startsWith('triangle'))
        }
        const triangle = svg.selectAll('.dotTriangle')
          .data(recTriangles, d => d.gr)
        triangle.enter()
          .append("path")
          .classed('dotTriangle dot', true)
          .attr("d", d3.symbol().type(d3.symbolTriangle).size(0))
          .attr("opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour ? d.colour : data.colour)
          .attr("transform", d => {
            const x = transform(getCentroid(d.gr, proj).centroid)[0]
            const y = transform(getCentroid(d.gr, proj).centroid)[1]
            let extraRotate, yOffset
            if (d.shape === 'triangle-up') {
              extraRotate=0
              yOffset=radiusPixels/3
            } else {
              extraRotate=180
              yOffset=-radiusPixels/3
            }
            // TODO - only do this rotation for output projection gb
            if (checkGr(d.gr).projection === 'ir') {
              return `translate(${x},${y + yOffset}) rotate(${5 + extraRotate})`
            } else {
              return `translate(${x},${y + yOffset}) rotate(${extraRotate})`
            }
          })
        .merge(triangle)
          .transition()  
            .ease(d3.easeCubic)   
            .duration(500)
          .attr("d", d3.symbol().type(d3.symbolTriangle).size(radiusPixels * radiusPixels * 1.7))
          .attr("opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour ? d.colour : data.colour)
          .attr("data-caption", d => getCaption(d))
        triangle.exit()
          .transition()
            .ease(d3.easeCubic)
            .duration(500)
          .attr("d", d3.symbol().type(d3.symbolTriangle).size(0))
          .remove()

        // Dot caption display
        svg.selectAll('.dot')
          .on('mouseover', d => {
            if (captionId) {
              if (d.caption) {
                d3.select(`#${captionId}`).html(d.caption)
              } else {
                d3.select(`#${captionId}`).html('')
              }
            }
          })
          
        return data
      }).then (data => {
        resolve(data)
      }).catch(() => {
        reject("Failed to read data", taxonIdentifier)
      })
    } else {
      reject("Data accessor not a function")
    }

  })
}