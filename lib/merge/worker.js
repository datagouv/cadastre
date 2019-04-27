const {mergeGeoJSONFiles} = require('./geojson')

async function doStuff({srcPattern, destPath}) {
  return mergeGeoJSONFiles(srcPattern, destPath)
}

module.exports = function (options, done) {
  doStuff(options)
    .then(result => done(null, result))
    .catch(error => done(error))
}
