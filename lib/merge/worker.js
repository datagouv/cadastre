import {mergeGeoJSONFiles} from './geojson.js'

async function doStuff({srcPattern, destPath}) {
  return await mergeGeoJSONFiles(srcPattern, destPath)
}

export default mergeWorker(options) {
  return doStuff(options)
}
