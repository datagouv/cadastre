const {convert} = require('geojson2shp')

module.exports = function ({srcPath, destPath, layer, targetCrs}, done) {
  convert(srcPath, destPath, {layer, targetCrs})
    .then(result => done(null, result))
    .catch(err => done(err))
}
