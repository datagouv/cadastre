const {convert} = require('geojson2shp')
const schemas = require('./schemas')

module.exports = function ({srcPath, destPath, layer, targetCrs}, done) {
  convert(srcPath, destPath, {layer, targetCrs, schema: schemas[layer]})
    .then(result => done(null, result))
    .catch(error => done(error))
}
