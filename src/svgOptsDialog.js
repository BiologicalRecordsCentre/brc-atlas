import * as d3 from 'd3'
import MicroModal from 'micromodal'

export function optsDialog(parentSelector, transOptsSel, transOptsKey, transOptsControl, mapTypesSel, mapTypesKey, mapTypesControl, applyFunction) {
  
  // Create map SVG in given parent
  const div1 = d3.select(`${parentSelector}`)
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

  transOptsSelection(main, transOptsSel, transOptsKey, transOptsControl)
  mapTypeSelection(main, mapTypesSel, mapTypesKey, mapTypesControl)

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
    if (transOptsControl && Object.keys(transOptsSel).length > 1) {
      ret.transOptsKey = d3.select('input[name="transOptsRadio"]:checked').node().value
    }
    if (mapTypesControl && Object.keys(mapTypesSel).length > 1) {
      ret.mapTypesKey = d3.select('input[name="mapTypeRadio"]:checked').node().value
    }
    applyFunction(ret)  
  })
}

export function showOptsDialog(mapTypesKey, transOptsSel, transOptsKey,){

  if (document.getElementById(transOptsSel[transOptsKey])) {
    document.getElementById(transOptsSel[transOptsKey]).checked = true
  }
  const id = mapTypesKey.replace(/ /g,'')
  if (document.getElementById(id)) {
    document.getElementById(id).checked = true
  }
  MicroModal.show('modal-1')
}

function transOptsSelection(el, transOptsSel, transOptsKey, transOptsControl) {
  if (transOptsControl && Object.keys(transOptsSel).length > 1) {
    el.append("h3").text("Extent & view")
    Object.keys(transOptsSel).forEach(k => {
      const radio = el.append("input")
        .attr("type", "radio")
        .attr("id", `trans-opts-radio-${k}`)
        .attr("name", "transOptsRadio")
        .attr("value", k)
      el.append("label")
        .attr("for", `trans-opts-radio-${k}`)
        .text(transOptsSel[k].caption)

      if (k === transOptsKey) {
        radio.attr("checked", "checked")
      }
      if (k !== Object.keys(transOptsSel)[Object.keys(transOptsSel).length-1]) {
        el.append("br")
      }
    })
  }
}

function mapTypeSelection(el, mapTypesSel, mapTypesKey, mapTypesControl) {
  const id = mapTypesKey.replace(/ /g,'')
  if (mapTypesControl && Object.keys(mapTypesSel).length > 1) {
    el.append("h3").text("Map information type")
    Object.keys(mapTypesSel).forEach(k => {
      const radio = el.append("input")
        .attr("type", "radio")
        .attr("id", id)
        .attr("name", "mapTypeRadio")
        .attr("value", k)
      el.append("label")
        .attr("for", id)
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