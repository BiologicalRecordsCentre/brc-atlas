import { namedTransOpts } from './src/svgCoords'
import { dataAccessors } from './src/dataAccess'
import { svgMap } from './src/svgMap'
import { leafletMap } from './src/leafletMap'
import { parseTags } from './src/tagParse'
import pkg from './package.json'

// Output version from package json to console
// to assist with trouble shooting.
console.log(`Running ${pkg.name} version ${pkg.version}`)

export {
  namedTransOpts,
  dataAccessors,
  svgMap,
  leafletMap,
  parseTags
} 

document.addEventListener('DOMContentLoaded', () => {
  parseTags()
})
