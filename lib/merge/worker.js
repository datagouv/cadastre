import {mergeGeoJSONFiles} from './geojson.js'

async function doStuff({srcPattern, destPath}) {
  return mergeGeoJSONFiles(srcPattern, destPath)
}

export function mergeWorker(options, done) {
  doStuff(options)
    .then(result => done(null, result))
    .catch(error => done(error))
}
