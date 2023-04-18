import {mergeGeoJSONFiles} from './geojson.js'

async function doStuff({srcFiles, destPath}) {
  return mergeGeoJSONFiles(srcFiles, destPath)
}

export default function mergeWorker(options) {
  return doStuff(options)
}
