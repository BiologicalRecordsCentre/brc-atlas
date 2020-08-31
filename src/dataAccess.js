import * as d3 from 'd3'

/* ANY GENERALLY USEFUL DATA ACCESS ROUTINES SHOULD GO IN THIS MODULE *?

/**
 * This will be a general purpose CSV reader that will read
 * CSV expecting columns gr, shape, size, colour etc.
 * @param {Object} opts - initialisation options.
 */
export function noData() {
    return new Promise((resolve) => {
      resolve({
        records: [],
        size: 1,
        shape: 'circle',
        precision: 10000,
        opacity: 1
      })
    })
}
export function csvHectad(opts) {
  // #TDOO - code below is just a placeholder
  return new Promise((resolve, reject) => {
    d3.csv(opts.data, function(r) {
      if (r.Hectad) {
        // e.g. {Hectad: "NZ09"}
        return({
          gr: r.Hectad,
          colour: "red",
        })
      }
    }).then(function(data) {
      resolve({
        records: data,
        size: 1,
        shape: 'circle',
        precision: 10000,
        opacity: 0.8
      })
    }).catch(function(e){
      reject(e)
    })
  })
}


