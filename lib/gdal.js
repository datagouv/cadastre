const gdal = require('gdal')
const Promise = require('bluebird')

function asGeoJSONObject(geometry) {
  const wgs84 = gdal.SpatialReference.fromEPSG(4326)
  geometry.transformTo(wgs84)
  return geometry.toObject()
}

function extractFeatures(path) {
  gdal.config.set('OGR_EDIGEO_CREATE_LABEL_LAYERS', 'NO')

  const features = []

  gdal.open(path).layers.forEach(layer => layer.features.forEach(feature => {
    if (!layer.name.includes('_id')) return;

    const properties = feature.fields.toObject()
    const geometry = asGeoJSONObject(feature.getGeometry())
    const layerName = layer.name.substr(0, layer.name.indexOf('_id')).toLowerCase()

    features.push({
      type: 'Feature',
      layer: layerName,
      geometry,
      properties,
      id: properties.OBJECT_RID
    })
  }))

  return Promise.resolve(features)
}

module.exports = { extractFeatures }
