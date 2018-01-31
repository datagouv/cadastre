const {mergeGeoJSONFiles} = require('./geojson')

async function doStuff({srcPaths, destPath}) {
  return mergeGeoJSONFiles(srcPaths, destPath)
}

module.exports = function (options, done) {
  doStuff(options)
    .then(result => done(null, result))
    .catch(err => done(err))
}
