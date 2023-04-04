import {mergeGeoJSONFiles} from './geojson.js'

async function doStuff({srcPattern, destPath}) {
  return mergeGeoJSONFiles(srcPattern, destPath)
}

export default function mergeWorker(options) {
  return doStuff(options)
}
