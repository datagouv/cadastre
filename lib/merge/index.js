import {createRequire} from 'node:module'
import os from 'node:os'
import {Piscina} from 'piscina'

const mergeWorkers = new Piscina({
  filename: new URL('worker.js', import.meta.url).href,
})

function mergeGeoJSONFiles(srcPattern, destPath) {
  return mergeWorkers.run({srcPattern, destPath})
}

export {mergeGeoJSONFiles}
