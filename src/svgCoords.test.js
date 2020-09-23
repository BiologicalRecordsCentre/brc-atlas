import { namedTransOpts } from './svgCoords.js'

describe('Test test', function () {

  test('Correct BI1 bounds', () => {
    
    expect(namedTransOpts.BI1.bounds).toEqual({
      xmin: -213389,
      ymin: -113239,
      xmax: 702813,
      ymax: 1237242});
  })
})