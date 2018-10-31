/* eslint camelcase: off */
'use strict'

const {join} = require('path')
const gdal = require('gdal')
const {booleanPointInPolygon, centroid, cleanCoords, truncate, rewind} = require('@turf/turf')
const bluebird = require('bluebird')
const {groupBy} = require('lodash')

const {communePath} = require('../dist/simple')
const {recreateDirectory} = require('../util/fs')
const {createAggregate} = require('../aggregate')
const postprocessPrefixesSections = require('../post-processing/prefixes-sections')
const {writeLayeredFeatures} = require('../writers/geojson')

const rts = require('../convert/ems-rts')
const ems = require('../convert/ems-cadastre')

const communesToIgnore = [
  '67001',
  '67065',
  '67363',
  '67247',
  '67182'
]

const LAYERS_MAPPING = {
  rg_r2m_commune: {layer: 'communes', convertFn: rts.prepareCommune},
  rg_r2m_bati_fusionne: {layer: 'batiments', convertFn: rts.prepareBatiment},
  rg_cad_section: {layer: 'sections', convertFn: ems.prepareSection},
  rg_cad_parcelle: {layer: 'parcelles', convertFn: ems.prepareParcelle, validateFn: ems.validateParcelle}
}

async function handler({rtsPath, parcellesPath, sectionsPath}, distPath) {
  const layers = {}

  // Extract features from RTS dataset
  const rtsDataset = gdal.open(`/vsizip/${rtsPath}`)
  const rtsLayersToRead = ['rg_r2m_commune', 'rg_r2m_bati_fusionne']
  rtsLayersToRead.forEach(layerName => {
    console.log(' * Lecture de ' + layerName)
    console.time(' * Fin de lecture de ' + layerName)
    const features = getGeoJSONFeatures(rtsDataset.layers.get(layerName))
    console.timeEnd(' * Fin de lecture de ' + layerName)
    layers[layerName] = features
  })
  rtsDataset.close()

  layers.rg_cad_parcelle = getSingleLayerFeatures(parcellesPath, 'rg_cad_parcelle')
  layers.rg_cad_section = getSingleLayerFeatures(sectionsPath, 'rg_cad_section')

  const communes = layers.rg_r2m_commune

  // Group features by commune (for performance purpose)
  Object.keys(layers).forEach(layerName => {
    const rawFeatures = layers[layerName]
    layers[layerName] = groupBy(rawFeatures, f => getCommuneFromRawFeature(f, communes))
  })

  const codesCommunes = communes
    .map(f => '67' + f.properties.NUM_COM)
    .filter(communeIsNotIgnored)

  await bluebird.mapSeries(codesCommunes, async codeCommune => {
    console.log(' * Écriture de la commune ' + codeCommune)
    console.time(' * Fin d’écriture de la commune ' + codeCommune)
    await recreateDirectory(communePath(distPath, codeCommune))
    const aggregate = createAggregate({idKey: 'properties.id'})

    await Promise.all(Object.keys(LAYERS_MAPPING).map(async layerName => {
      const {layer, convertFn, validateFn} = LAYERS_MAPPING[layerName]

      const features = (layers[layerName][codeCommune] || [])
        .map(f => convertFn(f, codeCommune))
        .filter(f => !validateFn || validateFn(f))
        .map(prepareGeometry)

      aggregate.addFeaturesToLayer(features, layer)
    }))

    await postprocessPrefixesSections(aggregate)

    await writeLayeredFeatures(
      aggregate.getLayeredFeatures(),
      join(communePath(distPath, codeCommune), `cadastre-${codeCommune}-{layer}.json.gz`)
    )

    console.timeEnd(' * Fin d’écriture de la commune ' + codeCommune)
  })
}

/* Helpers */

function getCommuneFromRawFeature(f, communes) {
  // First try with NUM_COM property
  if (f.properties.NUM_COM) {
    return '67' + f.properties.NUM_COM
  }
  // Second try with centroid + point in polygon
  const communeResult = communes.find(communeFeature => {
    return booleanPointInPolygon(centroid(f), communeFeature)
  })
  if (communeResult) {
    return '67' + communeResult.properties.NUM_COM
  }
}

function prepareGeometry(feature) {
  return rewind(
    cleanCoords(
      truncate(feature, {precision: 7, coordinates: 2, mutate: true}),
      {mutate: true}
    ),
    {mutate: true}
  )
}

const wgs84 = gdal.SpatialReference.fromEPSG(4326)

function getGeoJSONFeatures(gdalLayer) {
  return gdalLayer.features.map(feature => {
    const geometry = feature.getGeometry()
    geometry.transformTo(wgs84)
    return {
      type: 'Feature',
      geometry: geometry.toObject(),
      properties: feature.fields.toObject()
    }
  })
}

function communeIsNotIgnored(codeCommune) {
  return codeCommune.match(/^([a-z0-9]{5})$/i) && !communesToIgnore.includes(codeCommune)
}

function getSingleLayerFeatures(datasetPath, layerName) {
  const dataset = gdal.open(`/vsizip/${datasetPath}`)
  console.log(` * Lecture de ${layerName}`)
  console.time(` * Fin de lecture de ${layerName}`)
  const features = getGeoJSONFeatures(dataset.layers.get(layerName))
  console.timeEnd(` * Fin de lecture de ${layerName}`)
  dataset.close()
  return features
}

module.exports = handler
