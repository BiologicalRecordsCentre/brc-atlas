import * as d3 from 'd3'

export function svgLegend(svg, legendOpts) {

  console.log(legendOpts)

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