/** @module dataAccess */

import * as d3 from 'd3'

function csvMonad(file) {
  return csvGr(file, 1000)
}
function csvTetrad(file) {
  return csvGr(file, 2000)
}
function csvHectad(file) {
  return csvGr(file, 10000)
}
function csvGr(file, precision) {
  return new Promise((resolve, reject) => {
    d3.csv(file, function(r) {
      if (r.gr) {
        return({
          gr: r.gr,
          caption: `<strong>Grid ref: </strong>${r.gr}`,
          colour: r.colour,
          shape: r.shape,
          opacity: r.opacity,
          size: r.size,
        })
      }
    }).then(function(data) {
      resolve({
        records: data,
        precision: precision,
      })
    }).catch(function(e){
      reject(e)
    })
  })
}

/** @constant
* @description This object has properties corresponding to a number of data access
* functions that can be used to load data provided in standard formats. There are
* three functions accessed through the keys listed below.
* <ul>
* <li> <b>Standard monad</b> expects the grid references to be monads (1 km resolution).
* <li> <b>Standard tetrad</b> expects the grid references to be tetrads (2 km resolution).
* <li> <b>Standard hectad</b> expects the grid references to be hectads (10 km resolution).
* </ul>
* Each of the
* data accessor functions referenced by these keys takes a single argument which is the path (or URL) of
* a CSV that contains data in a standard format. The columns which must be present in the 
* CSV are described below (the order is not important).
* <ul>
* <li> <b>gr</b> - the grid referece which must be of the correct precision for the function.
* <li> <b>shape</b> - describes the shape that will be displayed at that location,
* valid values are: circle, square, diamond, triangle-up, triangle-down.
* <li> <b>size</b> - a number between 0 and 1 which will be used as a factor to resize the
* dot symbol displayed on the map.
* <li> <b>colour</b> - a colour for the symbol which can be hex format, e.g. #FFA500, 
* RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red.
* <li> <b>opacity</b> - a number between 0 and 1 used to set the opacity of the symbol
* (0 is fully transparent and 1 fully opaque).
* </ul>
*  @type {object}
*/
export const dataAccessors = {
  'Standard monad': csvMonad,
  'Standard tetrad': csvTetrad,
  'Standard hectad': csvHectad
}


