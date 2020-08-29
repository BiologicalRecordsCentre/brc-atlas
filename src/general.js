  export function getRadiusPixels(transform, precision){
    return Math.abs(transform([300000,300000])[0]-transform([300000+precision/2,300000])[0])
  }