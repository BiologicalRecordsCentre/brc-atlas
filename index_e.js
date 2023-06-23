import { eSvgMap } from './src_e/eSvgMap'
import pkg from './package.json'

// Output version from package json to console
// to assist with trouble shooting.
console.log(`Running ${pkg.name} version ${pkg.version}`)

export {
  eSvgMap
} 
