const gdal = require('gdal')

const srsBase = {
  LAMB93: gdal.SpatialReference.fromEPSG(2154), // France métropolitaine
  GUAD48UTM20: gdal.SpatialReference.fromProj4('+proj=utm +zone=20 +ellps=intl +towgs84=-467,-16,-300,0,0,0,0 +units=m +no_defs'), // Guadeloupe
  MART38UTM20: gdal.SpatialReference.fromProj4('+proj=utm +zone=20 +ellps=intl +towgs84=186,482,151,0,0,0,0 +units=m +no_defs'), // Martinique
  RGFG95UTM22: gdal.SpatialReference.fromProj4('+proj=utm +zone=22 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'), // Guyane
  RGR92UTM: gdal.SpatialReference.fromProj4('+proj=utm +zone=40 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'), // Réunion
  RGM04: gdal.SpatialReference.fromProj4('+proj=utm +zone=38 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'), // Mayotte
  EPSG2969: gdal.SpatialReference.fromProj4('+proj=utm +zone=20 +ellps=intl +towgs84=137,248,-430,0,0,0,0 +units=m +no_defs') // Saint-Martin / Saint-Barthelemy
}

function getSrsFromCode(srsCode) {
  if (!(srsCode in srsBase)) {
    throw new Error('Not supported SRS')
  }
  return srsBase[srsCode]
}

const wgs84 = gdal.SpatialReference.fromEPSG(4326)

function asGeoJSONObject(geometry, transformation) {
  geometry.transform(transformation)
  return geometry.toObject()
}

function extractFeatures(path, srsCode) {
  gdal.config.set('OGR_EDIGEO_CREATE_LABEL_LAYERS', 'NO')

  const features = []

  const dataset = gdal.open(path)

  dataset.layers.forEach(layer => {
    if (!layer.name.includes('_id')) return

    const fromSrs = layer.srs || getSrsFromCode(srsCode)
    const transformation = new gdal.CoordinateTransformation(fromSrs, wgs84)

    layer.features.forEach(feature => {
      const properties = feature.fields.toObject()
      const geometry = asGeoJSONObject(feature.getGeometry(), transformation)
      const layerName = layer.name.substr(0, layer.name.indexOf('_id')).toLowerCase()

      features.push({
        type: 'Feature',
        layer: layerName,
        geometry,
        properties,
        id: properties.OBJECT_RID
      })
    })
  })

  dataset.close()

  return Promise.resolve(features)
}

module.exports = {extractFeatures}
