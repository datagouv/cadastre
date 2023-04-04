import {Piscina} from 'piscina'

const shpWorkers = new Piscina({
  filename: new URL('worker.js', import.meta.url).href,
})

function convertToShape(srcPath, destPath, {layer, targetCrs}) {
  return shpWorkers.run({srcPath, destPath, layer, targetCrs})
}

export {convertToShape}
