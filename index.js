import { getTweenTransOpts, getInsetDims, transformFunction,  widthFromHeight, namedTransOpts } from './src/coordsToImage'
import { svgMap } from './src/svgMap'
import pkg from './package.json'

// Output version from package json to console
// to assist with trouble shooting.
console.log(`Running ${pkg.name} version ${pkg.version}`)

export { getTweenTransOpts, 
  getInsetDims, 
  transformFunction,  
  widthFromHeight, 
  namedTransOpts,
  svgMap
} 
