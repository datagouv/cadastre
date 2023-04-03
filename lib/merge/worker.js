import {mergeGeoJSONFiles} from './geojson.js'

async function doStuff({srcFiles, destPath}) {
  return mergeGeoJSONFiles(srcFiles, destPath)
}

export function mergeWorker(options, done) {
  doStuff(options)
    .then(result => done(null, result))
    .catch(error => done(error))
}
