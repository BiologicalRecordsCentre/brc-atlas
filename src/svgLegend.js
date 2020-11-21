/** @module svgLegend */

import * as d3 from 'd3'

/**
 * @typedef module:svgLegend.legendOpts
 * @type {Object}
 * @property {boolean} display - indicates whether or not a legend is to be drawn.
 * @property {number} scale - a number between 0 and 1 which scales the size of the legend.
 * @property {number} x - an offset of the top-left corner of the legend from the left margin of the SVG.
 * @property {number} y - an offset of the top-left corner of the legend from the top margin of the SVG.
 * @property {number} width - can be used to specify a width (for leaflet legend).
 * @property {number} height - can be used to specify a height (for leaflet legend).
 * @property {legendDefintion} data - a legend defition.
 */

/**
 * @typedef {Object} legendDefintion
 * @property {string} title - a title caption for the legend.
 * @property {number} size - a number between 0 and 1.
 * This is one factor taken into account to calculate the size of the legend dots.
 * @property {number} precision - should match the precision (in metres) of the map dot, e.g. 2000 for tetrads.
 * This is one factor taken into account to calculate the size of the legend dots.
 * @property {number} opacity - a number between 0 and 1 indicating the opacity of the legend symbol. 0 is completely
 * transparent and 1 is completely opaque.
 * @property {Array.<legendLine>} lines - an arry of objects representing lines in a legend.
 */

/**
 * @typedef {Object} legendLine
 * @property {string} color - a colour for the legend symbol which can be hex format, e.g. #FFA500, 
 * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red.
 * @property {string} shape - describes symbol shape for the legend line.
 * Valid values are: circle, square, diamond, triangle-up, triangle-down.
 * @property {string} text - specifies the text for the legend line.
 */

export function svgLegend(svg, legendOpts) {

  const legendData = legendOpts.data ? legendOpts.data : legendOpts.accessorData
  const legendX = legendOpts.x
  const legendY = legendOpts.y
  const legendScale = legendOpts.scale
  const lineHeight = 20
  const swatchPixels = lineHeight / 3

  const gLegend = svg.append('g').attr('id','legend')
  gLegend.append('text')
    .attr('x', 0)
    .attr('y', lineHeight)
    .attr('font-weight', 'bold')
    .text(legendData.title)

  legendData.lines.forEach((l, i) => {
    
    let shape = l.shape ? l.shape : legendData.shape
    let size = l.size ? l.size : legendData.size
    let opacity = l.opacity ? l.opacity : legendData.opacity
    let colour = l.colour ? l.colour : legendData.colour
    let colour2 = l.colour2 ? l.colour2 : legendData.colour2
    let dot

    if (shape === 'circle') {
      dot = gLegend.append('circle')
        .attr("r", swatchPixels * size)
        .attr("cx", swatchPixels * 1)
        .attr("cy", lineHeight * (i + 2.5) - swatchPixels)
    } else if (shape === 'bullseye') {
      dot = gLegend.append('circle')
        .attr("r", swatchPixels * size)
        .attr("cx", swatchPixels * 1)
        .attr("cy", lineHeight * (i + 2.5) - swatchPixels)
      gLegend.append('circle')
        .attr("r", swatchPixels * size * 0.5)
        .attr("cx", swatchPixels * 1)
        .attr("cy", lineHeight * (i + 2.5) - swatchPixels)
        .style('fill', colour2)
        .style('opacity', opacity)
    } else if (shape === 'square') {
      dot = gLegend.append('rect')
        .attr ("width", swatchPixels * 2)
        .attr ("height", swatchPixels * 2)
        .attr("x", 0)
        .attr("y", lineHeight * (i + 2.5) - 2 * swatchPixels)
    } else if (shape === 'triangle-up') {
      dot = gLegend.append('path')
        .attr("d", d3.symbol().type(d3.symbolTriangle).size(swatchPixels * swatchPixels * 1.7))
        .attr("transform", `translate(${swatchPixels * 1},${lineHeight * (i + 2.5) - swatchPixels})`)
    } else if (shape === 'triangle-down') {
      dot = gLegend.append('path')
        .attr("d", d3.symbol().type(d3.symbolTriangle).size(swatchPixels * swatchPixels * 1.7))
        .attr("transform", `translate(${swatchPixels * 1},${lineHeight * (i + 2.5) - swatchPixels}) rotate(180)`)
    }
    dot.style('fill', colour).style('opacity', opacity)
  })

  legendData.lines.forEach((l, i) => {
    gLegend.append('text')
      .attr('x', swatchPixels * 4)
      .attr('y', lineHeight * (i + 2.5))
      .text(l.text)
  })

  gLegend.attr("transform", `translate(${legendX},${legendY}) scale(${legendScale}, ${legendScale})`)
}