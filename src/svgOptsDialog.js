import * as d3 from 'd3'
import MicroModal from 'micromodal'

export function optsDialog(mapid, transOptsSel, transOptsKey, transOptsControl, mapTypesSel, mapTypesKey, mapTypesControl, applyFunction) {

  const div1 = d3.select(`body`)
    .append("div")
    .classed("modal micromodal-slide brc-atlas-map-opts", true)
    .attr("id", `mapOptsModal-${mapid}`)
    .attr("aria-hidden", "true")

  const div2 = div1.append("div")
    .classed("modal__overlay", true)
    .attr("tabindex", "-1")
    .attr("data-micromodal-close", "")

  const div3 = div2.append("div")
    .classed("modal__container", true)
    .attr("role", "dialog")
    .attr("aria-modal", "true")
    .attr("aria-labelledby", `mapOptsModal-${mapid}-title`)

  const header = div3.append("header")
    .classed("modal__header", true)

  header.append("h2")
    .classed("modal__title", true)
    .attr("id", `mapOptsModal-${mapid}-title`)
    .text("Map options")

  header.append("button")
    .classed("modal__close", true)
    .attr("aria-label", "Close modal")
    .attr("data-micromodal-close", "")

  const main = div3.append("main")
    .classed("modal__content", true)
    .attr("id", `mapOptsModal-${mapid}-content`)

  transOptsSelection(mapid, main, transOptsSel, transOptsKey, transOptsControl)
  mapTypeSelection(mapid, main, mapTypesSel, mapTypesKey, mapTypesControl)

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
      ret.transOptsKey = div1.select(`input[name="trans-opts-radio-${mapid}"]:checked`).node().value
    }
    if (mapTypesControl && Object.keys(mapTypesSel).length > 1) {
      ret.mapTypesKey = div1.select(`input[name="map-type-radio-${mapid}"]:checked`).node().value
    }
    applyFunction(ret)  
  })
}

export function showOptsDialog(mapid, mapTypesKey, transOptsSel, transOptsKey){

  if (document.getElementById(`trans-opts-radio-${mapid}-${transOptsKey}`)) {
    document.getElementById(`trans-opts-radio-${mapid}-${transOptsKey}`).checked = true
  }
  const id = mapTypesKey.replace(/ /g,'')
  if (document.getElementById(`map-type-radio-${mapid}-${id}`)) {
    document.getElementById(`map-type-radio-${mapid}-${id}`).checked = true
  }
  MicroModal.show(`mapOptsModal-${mapid}`)
}

function transOptsSelection(mapid, el, transOptsSel, transOptsKey, transOptsControl) {
  if (transOptsControl && Object.keys(transOptsSel).length > 1) {
    el.append("h3").text("Extent & view")
    Object.keys(transOptsSel).forEach(k => {
      const radio = el.append("input")
        .attr("type", "radio")
        .attr("id", `trans-opts-radio-${mapid}-${k}`)
        .attr("name", `trans-opts-radio-${mapid}`)
        .attr("value", k)
      el.append("label")
        .attr("for", `trans-opts-radio-${mapid}-${k}`)
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

function mapTypeSelection(mapid, el, mapTypesSel, mapTypesKey, mapTypesControl) {
  
  if (mapTypesControl && Object.keys(mapTypesSel).length > 1) {
    el.append("h3").text("Map information type")
    Object.keys(mapTypesSel).forEach(k => {
      const id = k.replace(/ /g,'')
      const radio = el.append("input")
        .attr("type", "radio")
        .attr("id", `map-type-radio-${mapid}-${id}`)
        .attr("name", `map-type-radio-${mapid}`)
        .attr("value", k)
      el.append("label")
        .attr("for", `map-type-radio-${mapid}-${id}`)
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