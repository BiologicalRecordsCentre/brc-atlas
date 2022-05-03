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
 * @property {string} colour - a colour for the legend symbols which can be hex format, e.g. #FFA500, 
 * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red. (Can be overriden by individual legend lines.)
 * @property {string} colour2 - second colour for legend symbols of bullseye shape which can be hex format, e.g. #FFA500, 
 * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red. (Can be overriden by individual legend lines.)
 * @property {string} stroke - a colour for the border of the legend symbols which can be hex format, e.g. #FFA500, 
 * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red. (Can be overriden by individual legend lines.)
 * If not specified, no border is drawn.
 * @property {string} shape - describes symbol shapes for the legend.
 * Valid values are: circle, bullseye, square, diamond, triangle-up, triangle-down. (Can be overriden by individual legend lines.)
 * @property {number} size - a number between 0 and 1.
 * This can be used to scale the size of the legend dots. (Can be overriden by individual legend lines.)
 * @property {number} opacity - a number between 0 and 1 indicating the opacity of the legend symbols for the whole legend. 0 is completely
 * transparent and 1 is completely opaque. (Can be overriden by individual legend lines.)
 * @property {number} padding - a number that indicates the padding, in pixels, that should be used between the elements
 * of a legend line (e.g. the symbol and the text).
 * @property {boolean[]} raligned - an array of boolean values to indicate whether text elements in a tabulated legend
 * lines should be right-aligned.
 * @property {legendLine[]} lines - an arry of objects representing lines in a legend.
 */

/**
 * @typedef {Object} legendLine
 * @property {string} colour - a colour for the legend symbol which can be hex format, e.g. #FFA500, 
 * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red. Overrides any value set for the whole legend.
 * @property {string} colour2 - second colour for legend symbols of bullseye symbol which can be hex format, e.g. #FFA500, 
 * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red. Overrides any value set for the whole legend.
 * @property {string} stroke - a colour for the border of the legend symbol which can be hex format, e.g. #FFA500, 
 * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red. Overrides any value set for the whole legend.
 * If not specified, no border is drawn.
 * @property {string} shape - describes symbol shape for the legend line.
 * Valid values are: circle, bullseye, square, diamond, triangle-up, triangle-down. Overrides any value set for the whole legend.
 * @property {number} size - a number between 0 and 1.
 * This can be used to scale the size of the legend dots. Overrides any value set for the whole legend.
 * @property {number} opacity - a number between 0 and 1 indicating the opacity of the legend symbol. 0 is completely
 * transparent and 1 is completely opaque. Overrides any value set for the whole legend.
 * @property {boolean} underline - If set to true, indicates that the legend line is to be underlined.
 * @property {string|string[]} text - Specifies the text for the legend line either as a single text string or an
 * array of strings for a tabulated legend layout. For tabulated legend layout, one of the strings can be set
 * to the special value of 'symbol' to indicate the position where the legend symbol should be generated in the
 * tabualted layout. In a tabulated legend layout, the various array elements in each line are aligned with those
 * in the other lines to form columns. You can use the HTML tags '<i></i>' and <b></b>' to italicise and bolden text
 * in the legend lines.
 */

export function svgLegend(svg, legendOpts) {

  const legendData = legendOpts.data ? legendOpts.data : legendOpts.accessorData
  const legendX = legendOpts.x ? legendOpts.x : 0
  const legendY = legendOpts.y ? legendOpts.y : 0
  const legendScale = legendOpts.scale ? legendOpts.scale : 1
  const lineHeight = 20
  const swatchPixels = lineHeight / 3
  legendData.padding = legendData.padding ? legendData.padding : lineHeight / 3
  legendData.raligned = legendData.raligned ? legendData.raligned : []
  legendData.size = legendData.size ? legendData.size : 1
  legendData.opacity = legendData.opacity ? legendData.opacity : 1
  legendData.shape = legendData.shape ? legendData.shape : 'circle'

  const gLegend = svg.append('g').attr('id','legend')

  const parseText = (text) => {
    let legText = text
    legText = legText.replaceAll('<i>', '<tspan style="font-style: italic">' )
    legText = legText.replaceAll('</i>', '</tspan>' )
    legText = legText.replaceAll('<b>', '<tspan style="font-weight: bold">' )
    legText = legText.replaceAll('</b>', '</tspan>' )

    return legText
  }

  let iUnderlinePad = 0
  let iOffset
  if (legendData.title) {
    gLegend.append('text')
      .attr('x', 0)
      .attr('y', lineHeight)
      .attr('font-weight', 'bold')
      .text(legendData.title)
    iOffset = 0
  } else {
    iOffset = 1
  }

  // If legend line text is not an array, turn into one
  // Also add textWidths array
  legendData.lines.forEach(l => {
    if (!Array.isArray(l.text)) {
      l.text = ['symbol', String(l.text)]
    } else {
      // Coerce all text elements to strings
      l.text = l.text.map(t => String(t))
    }
    l.textWidth=[]
  })

  // Set nCells to the max number of elements in line text arrays
  const nCells = legendData.lines.reduce((a, l) => l.text.length > a ? l.text.length : a, 0)
  const maxWidths = Array(nCells).fill(0)

  // Calculate the max width of each legend table column.
  // Also add the calculated width of each text item to the legend line
  // array for use in right justifying if required.
  for (let i = 0; i < nCells; i++) {
    legendData.lines.forEach(l => {
      if (l.text[i]) {
        let iLength
        if (l.text[i] === 'symbol') {
          iLength = swatchPixels * 2
        } else {
          // Generate a temporary SVG text object in order to get width
          const t = gLegend.append('text').html(parseText(l.text[i]))
          iLength = t.node().getBBox().width
          t.remove()
          l.textWidth[i] = iLength
        }
        maxWidths[i] =  maxWidths[i] > iLength ? maxWidths[i] : iLength
      }
    })
  }

  // Set offsets
  const offsets = Array(nCells)
  for (let i = 0; i < offsets.length; i++) {
    offsets[i] = 0
    for (let j = 1; j <= i; j++) {
      offsets[i] = offsets[i] + maxWidths[j-1] + legendData.padding
    }
  }
 
  //console.log('max text lengths', maxWidths)
  //console.log('offsets', offsets)

  legendData.lines.forEach((l, iLine) => {
    
    const y = iLine - iOffset
    let shape = l.shape ? l.shape : legendData.shape
    let size = l.size ? l.size : legendData.size
    let opacity = l.opacity ? l.opacity : legendData.opacity
    let colour = l.colour ? l.colour : legendData.colour
    let colour2 = l.colour2 ? l.colour2 : legendData.colour2
    let stroke = l.stroke ? l.stroke : legendData.stroke ? legendData.stroke : null
    let dot

    for (let i = 0; i < nCells; i++) {
      if (l.text[i]) {
        if (l.text[i] === 'symbol') {
          if (shape === 'circle') {
            dot = gLegend.append('circle')
              .attr("r", swatchPixels * size)
              //.attr("cx", swatchPixels * 1)
              .attr("cx", offsets[i] + swatchPixels)
              .attr("cy", lineHeight * (y + 2.5) - swatchPixels + iUnderlinePad)
          } else if (shape === 'bullseye') {
            dot = gLegend.append('circle')
              .attr("r", swatchPixels * size)
              //.attr("cx", swatchPixels * 1)
              .attr("cx", offsets[i] + swatchPixels)
              .attr("cy", lineHeight * (y + 2.5) - swatchPixels + iUnderlinePad)
            gLegend.append('circle')
              .attr("r", swatchPixels * size * 0.5)
              //.attr("cx", swatchPixels * 1)
              .attr("cx", offsets[i] + swatchPixels)
              .attr("cy", lineHeight * (y + 2.5) - swatchPixels + iUnderlinePad)
              .style('fill', colour2)
              .style('fill-opacity', opacity)
          } else if (shape === 'square') {
            dot = gLegend.append('rect')
              .attr ("width", swatchPixels * 2 * size)
              .attr ("height", swatchPixels * 2 * size)
              //.attr("x", swatchPixels * (1 - size))
              .attr("x", offsets[i] + swatchPixels * (1 - size))
              .attr("y", lineHeight * (y + 2.5) - 2 * swatchPixels + swatchPixels * (1 - size) + iUnderlinePad)
          } else if (shape === 'diamond') {
            dot = gLegend.append('path')
              .attr("d", d3.symbol().type(d3.symbolSquare).size(swatchPixels * swatchPixels * 2 * size))
              //.attr("transform", `translate(${swatchPixels * 1},${lineHeight * (y + 2.5) - swatchPixels}) rotate(45)`)
              .attr("transform", `translate(${offsets[i] + swatchPixels},${lineHeight * (y + 2.5) - swatchPixels}) rotate(45)`)
          } else if (shape === 'triangle-up') {
            dot = gLegend.append('path')
              .attr("d", d3.symbol().type(d3.symbolTriangle).size(swatchPixels * swatchPixels * 1.7 * size))
              //.attr("transform", `translate(${swatchPixels * 1},${lineHeight * (y + 2.5) - swatchPixels})`)
              .attr("transform", `translate(${offsets[i] + swatchPixels},${lineHeight * (y + 2.5) - swatchPixels})`)
          } else if (shape === 'triangle-down') {
            dot = gLegend.append('path')
              .attr("d", d3.symbol().type(d3.symbolTriangle).size(swatchPixels * swatchPixels * 1.7 * size))
              //.attr("transform", `translate(${swatchPixels * 1},${lineHeight * (y + 2.5) - swatchPixels}) rotate(180)`)
              .attr("transform", `translate(${offsets[i] + swatchPixels},${lineHeight * (y + 2.5) - swatchPixels}) rotate(180)`)
          }
          dot.style('fill', colour).style('fill-opacity', opacity).style('stroke', stroke)
        } else {
          //const y = iLine - iOffset
          const alignOffset = legendData.raligned[i] ? maxWidths[i] - l.textWidth[i] : 0
          gLegend.append('text')
            //.attr('x', swatchPixels * 2.7)
            .attr('x', offsets[i] + alignOffset)
            .attr('y', lineHeight * (y + 2.5) - lineHeight/20 + iUnderlinePad)
            .html(parseText(l.text[i]))
        }
      }
    }
    if (l.underline) {
      iUnderlinePad = iUnderlinePad + 3
      gLegend.append('rect')
        .attr("x", 0)
        .attr("y", lineHeight * (y + 2.5) + iUnderlinePad)
        .attr("width", offsets[nCells-1] + maxWidths[nCells-1])
        .attr("height", 1)
        .attr("style", "fill:black")
    }
  })
  gLegend.attr("transform", `translate(${legendX},${legendY}) scale(${legendScale}, ${legendScale})`)

  // Set the font attribues for all text in legend
  gLegend.selectAll('text').style('font-family','Arial, Helvetica, sans-serif')
  gLegend.selectAll('text').style('font-size','14px')
}