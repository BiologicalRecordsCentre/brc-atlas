import { namedTransOpts } from './src/coordsToImage'
import { noData } from './src/dataAccess'
import { svgMap } from './src/svgMap'
import pkg from './package.json'

// Output version from package json to console
// to assist with trouble shooting.
console.log(`Running ${pkg.name} version ${pkg.version}`)

export {
  noData,
  namedTransOpts,
  svgMap
} 
