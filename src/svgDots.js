import * as d3 from 'd3'
import { getCentroid, checkGr } from 'brc-atlas-bigr'
import { getRadiusPixels } from './svgCoords.js'

export function removeDots(svg) {
  svg.selectAll('.dotCircle').remove()
  svg.selectAll('.dotSquare').remove()
  svg.selectAll('.dotTriangle').remove()
  svg.selectAll('.dotDiamond').remove()
}

export function drawDots(svg, captionId, onclick, transform, accessFunction, taxonIdentifier, proj) {
  function getCaption(d) {
    if (d.caption) {
      return d.caption
    } else {
      return ''
    }
  }

  const pTrans = []
  function addPromise(transition) {
    // If the transition has any elements in selection, then
    // create a promise that resolves when the transition of
    // the last element completes. We do the check because it
    // seems that with zero elements, the promise does not resolve
    // (remains pending).
    // The promise is created by
    // using the 'end' method on the transition.
    // The promise rejects if a transition is interrupted
    // so need to handle that. (https://www.npmjs.com/package/d3-transition)
    if (transition.size()) {
      const p = transition.end()
      p.catch(() => null)
      pTrans.push(p)
    }
  }

  return new Promise((resolve, reject) => {
    if(typeof accessFunction === 'function') {
      accessFunction(taxonIdentifier).then(data => {

        if (!data) return

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
        const circlesMerge = circles.enter()
          .append("circle")
          //.classed('dotCircle dot', true)
          .attr("cx", d => transform(getCentroid(d.gr, proj).centroid)[0])
          .attr("cy", d => transform(getCentroid(d.gr, proj).centroid)[1])
          .attr("r", 0)
          .attr("fill-opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour ? d.colour : data.colour)

        .merge(circles)
          // legendKey can change so this needs to be in merge
          .attr('class', d => {
            let c = 'dotCircle dot'
            if (d.legendKey) {
              c = `${c} legend-key-${d.legendKey}`
            }
            return c
          })
          .transition()
            .ease(d3.easeCubic)
            .duration(500)
          .attr("r", d => {
            const size = d.size ? d.size : data.size
            return size ? radiusPixels * size : radiusPixels
          })
          .attr("fill-opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour ? d.colour : data.colour)
          .attr("stroke", d => d.stroke ? d.stroke : data.stroke ? data.stroke : null )
          .attr('clip-path', 'circle()')
          .attr("data-caption", d => getCaption(d))

        addPromise(circlesMerge)

        const circlesExit = circles.exit()
          .transition()
            .ease(d3.easeCubic)
            .duration(500)
          .attr("r", 0)
          .remove()

        addPromise(circlesExit)


        // bullseye
        let recBullseyes
        if (data.shape && data.shape === 'bullseye') {
          recBullseyes = data.records
        } else {
          recBullseyes = data.records.filter(d => d.shape && d.shape === 'bullseye')
        }
        const bullseyes = svg.selectAll('.dotBullseye')
          .data(recBullseyes, d => d.gr)

        const bullseyesMerge =  bullseyes.enter()
          .append("circle")
          //.classed('dotBullseye dot', true)
          // .attr('clip-path', 'circle()')
          .attr("cx", d => transform(getCentroid(d.gr, proj).centroid)[0])
          .attr("cy", d => transform(getCentroid(d.gr, proj).centroid)[1])
          .attr("r", 0)
          .attr("fill-opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour2 ? d.colour2 : data.colour2)
        .merge(bullseyes)
          // legendKey can change so this needs to be in merge
          .attr('class', d => {
            let c = 'dotBullseye dot'
            if (d.legendKey) {
              c = `${c} legend-key-${d.legendKey}`
            }
            return c
          })
          .transition()
            .ease(d3.easeCubic)
            .duration(500)
          .attr("r", d => {
            const size = d.size ? d.size : data.size
            return radiusPixels * size * 0.5
          })
          .attr("fill-opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour2 ? d.colour2 : data.colour2)
          .attr("data-caption", d => getCaption(d))

        addPromise(bullseyesMerge)

        const bullseyesExit =  bullseyes.exit()
          .transition()
            .ease(d3.easeCubic)
            .duration(500)
          .attr("r", 0)
          .remove()

        addPromise(bullseyesExit)

        // squares
        let recSquares
        if (data.shape && data.shape === 'square') {
          recSquares = data.records
        } else {
          recSquares = data.records.filter(d => d.shape && d.shape === 'square')
        }
        const squares = svg.selectAll('.dotSquare')
          .data(recSquares, d => d.gr)
        const squaresMerge = squares.enter()
          .append("rect")
          //.classed('dotSquare dot', true)
          .attr("x", d => transform(getCentroid(d.gr, proj).centroid)[0])
          .attr("y", d => transform(getCentroid(d.gr, proj).centroid)[1])
          .attr("width", 0)
          .attr("height", 0)
          .attr("fill-opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour ? d.colour : data.colour)
        .merge(squares)
          // legendKey can change so this needs to be in merge
          .attr('class', d => {
            let c = 'dotSquare dot'
            if (d.legendKey) {
              c = `${c} legend-key-${d.legendKey}`
            }
            return c
          })
          .transition()
            .ease(d3.easeCubic)
            .duration(500)
          .attr("width", d => {
            const size = d.size ? d.size : data.size
            return 2 * radiusPixels * size
          })
          .attr("height", d => {
            const size = d.size ? d.size : data.size
            return 2 * radiusPixels * size
          })
          .attr("transform", d => {
            const size = d.size ? d.size : data.size
            if (checkGr(d.gr).projection === 'ir' && proj === 'gb') {
              const x = transform(getCentroid(d.gr, proj).centroid)[0]
              const y = transform(getCentroid(d.gr, proj).centroid)[1]
              return `translate(${-radiusPixels * size},${-radiusPixels * size}) rotate(5 ${x} ${y})`
            } else {
              return `translate(${-radiusPixels * size},${-radiusPixels * size})`
            }
          })
          .attr("fill-opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour ? d.colour : data.colour)
          .attr("stroke", d => d.stroke ? d.stroke : data.stroke ? data.stroke : null )
          .attr("data-caption", d => getCaption(d))

        addPromise(squaresMerge)

        const squaresExit = squares.exit()
          .transition()
            .ease(d3.easeCubic)
            .duration(500)
          .attr("width", 0)
          .attr("height", 0)
          .attr("transform", `translate(0,0)`)
          .remove()

        addPromise(squaresExit)

        // diamonds
        let recDiamonds
        if (data.shape && data.shape === 'diamond') {
          recDiamonds = data.records
        } else {
          recDiamonds = data.records.filter(d => d.shape && d.shape === 'diamond')
        }
        const diamonds = svg.selectAll('.dotDiamond')
          .data(recDiamonds, d => d.gr)

        const diamondsEnter =  diamonds.enter()
          .append("path")
          //.classed('dotDiamond dot', true)
          .attr("d", d3.symbol().type(d3.symbolSquare).size(0))
          .attr("fill-opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour ? d.colour : data.colour)
          .attr("transform", d => {
            const x = transform(getCentroid(d.gr, proj).centroid)[0]
            const y = transform(getCentroid(d.gr, proj).centroid)[1]
            if (checkGr(d.gr).projection === 'ir' && proj === 'gb') {
              return `translate(${x},${y}) rotate(50)`
            } else {
              return `translate(${x},${y}) rotate(45)`
            }
          })
        .merge(diamonds)
          // legendKey can change so this needs to be in merge
          .attr('class', d => {
            let c = 'dotDiamond dot'
            if (d.legendKey) {
              c = `${c} legend-key-${d.legendKey}`
            }
            return c
          })
          .transition()
            .ease(d3.easeCubic)
            .duration(500)
          .attr("d", d3.symbol().type(d3.symbolSquare).size(radiusPixels * radiusPixels * 2))
          .attr("transform", d => {
            const x = transform(getCentroid(d.gr, proj).centroid)[0]
            const y = transform(getCentroid(d.gr, proj).centroid)[1]
            const size = d.size ? d.size : data.size
            if (checkGr(d.gr).projection === 'ir' && proj === 'gb') {
              return `translate(${x},${y}) rotate(50) scale(${size})`
            } else {
              return `translate(${x},${y}) rotate(45) scale(${size})`
            }
          })
          .attr("fill-opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour ? d.colour : data.colour)
          .attr("stroke", d => d.stroke ? d.stroke : data.stroke ? data.stroke : null )
          .attr("data-caption", d => getCaption(d))

        addPromise(diamondsEnter)

        const diamondsExit = diamonds.exit()
          .transition()
            .ease(d3.easeCubic)
            .duration(500)
          .attr("d", d3.symbol().type(d3.symbolSquare).size(0))
          .remove()

        addPromise(diamondsExit)

        // triangles
        let recTriangles
        if (data.shape && data.shape.startsWith('triangle')) {
          recTriangles = data.records
        } else {
          recTriangles = data.records.filter(d => d.shape && d.shape.startsWith('triangle'))
        }
        const triangle = svg.selectAll('.dotTriangle')
          .data(recTriangles, d => d.gr)
        const triangleEnter = triangle.enter()
          .append("path")
          //.classed('dotTriangle dot', true)
          .attr("d", d3.symbol().type(d3.symbolTriangle).size(0))
          .attr("fill-opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour ? d.colour : data.colour)
          .attr("transform", d => {
            const x = transform(getCentroid(d.gr, proj).centroid)[0]
            const y = transform(getCentroid(d.gr, proj).centroid)[1]
            let extraRotate, yOffset
            const shape = d.shape ? d.shape : data.shape
            if (shape === 'triangle-up') {
              extraRotate=0
              yOffset=radiusPixels/3
            } else {
              extraRotate=180
              yOffset=-radiusPixels/3
            }
            if (checkGr(d.gr).projection === 'ir' && proj === 'gb') {
              return `translate(${x},${y + yOffset}) rotate(${5 + extraRotate})`
            } else {
              return `translate(${x},${y + yOffset}) rotate(${extraRotate})`
            }
          })
        .merge(triangle)
          // legendKey can change so this needs to be in merge
          .attr('class', d => {
            let c = 'dotTriangle dot'
            if (d.legendKey) {
              c = `${c} legend-key-${d.legendKey}`
            }
            return c
          })
          .transition()
            .ease(d3.easeCubic)
            .duration(500)
          .attr("d", d3.symbol().type(d3.symbolTriangle).size(radiusPixels * radiusPixels * 1.7))
          .attr("transform", d => {
            const x = transform(getCentroid(d.gr, proj).centroid)[0]
            const y = transform(getCentroid(d.gr, proj).centroid)[1]
            let extraRotate, yOffset
            const shape = d.shape ? d.shape : data.shape
            if (shape === 'triangle-up') {
              extraRotate=0
              yOffset=radiusPixels/3
            } else {
              extraRotate=180
              yOffset=-radiusPixels/3
            }
            const size = d.size ? d.size : data.size
            if (checkGr(d.gr).projection === 'ir' && proj === 'gb') {
              return `translate(${x},${y + yOffset}) rotate(${5 + extraRotate}) scale(${size})`
            } else {
              return `translate(${x},${y + yOffset}) rotate(${extraRotate}) scale(${size})`
            }
          })
          .attr("fill-opacity", d => d.opacity ? d.opacity : data.opacity)
          .style("fill", d => d.colour ? d.colour : data.colour)
          .attr("stroke", d => d.stroke ? d.stroke : data.stroke ? data.stroke : null )
          .attr("data-caption", d => getCaption(d))

        addPromise(triangleEnter)

        const triangleExit = triangle.exit()
          .transition()
            .ease(d3.easeCubic)
            .duration(500)
          .attr("d", d3.symbol().type(d3.symbolTriangle).size(0))
          .remove()

        addPromise(triangleExit)

        // Dot caption display
        svg.selectAll('.dot')
          .on('mouseover', (a1,a2) => {
            // D3 v5 passes d as first argument but v7 passes
            // d as second argument - event as first.
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
            // D3 v5 passes d as first argument but v7 passes
            // d as second argument - event as first.
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
          .on('click', (a1,a2) => {
            // D3 v5 passes d as first argument but v7 passes
            // d as second argument - event as first.
            let d
            if(a1.type === 'mouseout') {
              d=a2
            } else {
              d=a1
            }
            if (onclick) {
              onclick(d.gr, d.id ? d.id : null, d.caption ? d.caption : null)
            }
          })

        // Use Promise.all on pTrans to trigger code after
        // all transitions complete.
        Promise.allSettled(pTrans).then(() => {
          resolve(data)
        })
      //   return data
      // }).then (data => {
      //   resolve(data)
      }).catch(() => {
        reject("Failed to read data", taxonIdentifier)
      })
    } else {
      reject("Data accessor not a function")
    }

  })
}