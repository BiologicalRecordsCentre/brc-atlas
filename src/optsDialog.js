import * as d3 from 'd3'
import MicroModal from 'micromodal'

/**
 * #TODO
 * @returns {null} - there is no return object.
 */
// export function optsDialog({
//     // Default options in here
//     parentId = 'body',
//     transOptsSel = {},
//     transOptsKey = "",
//     transOptsOpts = false,
//     mapTypesSel = {},
//     mapTypesKey = "",
//     mapTypesOpts = false,
//     applyFunction = null,
//   } = {}) {

export function optsDialog(parentId, transOptsSel, transOptsKey, transOptsOpts, mapTypesSel, mapTypesKey, mapTypesOpts, applyFunction) {
  
  // Create map SVG in given parent
  const div1 = d3.select(`#${parentId}`)
    .append("div")
    .classed("modal micromodal-slide", true)
    .attr("id", "modal-1")
    .attr("aria-hidden", "true")

  const div2 = div1.append("div")
    .classed("modal__overlay", true)
    .attr("tabindex", "-1")
    .attr("data-micromodal-close", "")

  const div3 = div2.append("div")
    .classed("modal__container", true)
    .attr("role", "dialog")
    .attr("aria-modal", "true")
    .attr("aria-labelledby", "modal-1-title")

  const header = div3.append("header")
    .classed("modal__header", true)

  header.append("h2")
    .classed("modal__title", true)
    .attr("id", "modal-1-title")
    .text("Map options")

  header.append("button")
    .classed("modal__close", true)
    .attr("aria-label", "Close modal")
    .attr("data-micromodal-close", "")

  const main = div3.append("main")
    .classed("modal__content", true)
    .attr("id", "modal-1-content")

  transOptsSelection(main, transOptsSel, transOptsKey, transOptsOpts)
  mapTypeSelection(main, mapTypesSel, mapTypesKey, mapTypesOpts)

  const footer = div3.append("main")
    .classed("modal__footer", true)

  const apply = footer.append("button")
    .classed("modal__btn modal__btn-primary", true)
    .attr("data-micromodal-close", "")
    .text("Okay")

  footer.append("button")
    .classed("modal__btn", true)
    .attr("data-micromodal-close", "")
    .attr("aria-label", "Close this dialog window")
    .text("Cancel")

  MicroModal.init()

  apply.on("click", () => {
    const ret = {}
    if (transOptsOpts && Object.keys(transOptsSel).length > 1) {
      ret.transOptsKey = d3.select('input[name="transOptsRadio"]:checked').node().value
    }
    if (mapTypesOpts && Object.keys(mapTypesSel).length > 1) {
      ret.mapTypesKey = d3.select('input[name="mapTypeRadio"]:checked').node().value
    }
    applyFunction(ret)  
  })
}

export function showOptsDialog(mapTypesSel, mapTypesKey, transOptsSel, transOptsKey,){

  if (document.getElementById(transOptsSel[transOptsKey])) {
    document.getElementById(transOptsSel[transOptsKey]).checked = true
  }
  if (document.getElementById(mapTypesSel[mapTypesKey])) {
    document.getElementById(mapTypesSel[mapTypesKey]).checked = true
  }
  MicroModal.show('modal-1')
}

function transOptsSelection(el, transOptsSel, transOptsKey, transOptsOpts) {
  if (transOptsOpts && Object.keys(transOptsSel).length > 1) {
    el.append("h3").text("Extent & view")
    Object.keys(transOptsSel).forEach(k => {
      const radio = el.append("input")
        .attr("type", "radio")
        .attr("id", transOptsSel[k])
        .attr("name", "transOptsRadio")
        .attr("value", k)
      el.append("label")
        .attr("for", transOptsSel[k])
        .text(k)

      if (k === transOptsKey) {
        radio.attr("checked", "checked")
      }
      if (k !== Object.keys(transOptsSel)[Object.keys(transOptsSel).length-1]) {
        el.append("br")
      }
    })
  }
}

function mapTypeSelection(el, mapTypesSel, mapTypesKey, mapTypesOpts) {
  if (mapTypesOpts && Object.keys(mapTypesSel).length > 1) {
    el.append("h3").text("Map information type")
    Object.keys(mapTypesSel).forEach(k => {
      const radio = el.append("input")
        .attr("type", "radio")
        .attr("id", mapTypesSel[k])
        .attr("name", "mapTypeRadio")
        .attr("value", k)
      el.append("label")
        .attr("for", mapTypesSel[k])
        .text(k)

      if (k === mapTypesKey) {
        radio.attr("checked", "checked")
      }
      if (k !== Object.keys(mapTypesSel)[Object.keys(mapTypesSel).length-1]) {
        el.append("br")
      }
    })
  }
}