/* eslint camelcase: off */
'use strict'

const gdal = require('gdal')
const {groupBy, mapValues} = require('lodash')
const {inside, centroid} = require('@turf/turf')

const {communePath, getLayerPath} = require('../dist/simple')
const {createPolygonWriteStream} = require('../util/geo')
const {ensureDirectoryExists} = require('../util/fs')

const communesToIgnore = [
  '67001',
  '67065',
  '67363',
  '67247',
  '67182'
]

const layersMapping = {
  ELYRE_RG_R2M_COMMUNE_polygon: {layer: 'communes'},
  ELYRE_RG_R2M_SECTION_polygon: {layer: 'sections'},
  ELYRE_RG_R2M_PARCELLE_polygon: {layer: 'parcelles'},
  ELYRE_RG_R2M_BATI_FUSIONNE_polygon: {layer: 'batiments'}
}

async function handler(archivePath, distPath) {
  // Extract features from dataset
  const dataset = gdal.open(`/vsizip/${archivePath}/Ref 2000`)
  const layers = mapValues(layersMapping, (v, layerName) => {
    console.log(' * Lecture de ' + layerName)
    console.time(' * Fin de lecture de ' + layerName)
    const features = getGeoJSONFeatures(dataset.layers.get(layerName))
    console.timeEnd(' * Fin de lecture de ' + layerName)
    return features
  })
  dataset.close()

  const codesCommunes = layers.ELYRE_RG_R2M_COMMUNE_polygon
    .map(f => '67' + f.properties.NUM_COMMUN)
    .filter(communeIsNotIgnored)

  // Create all communes directories
  await Promise.all(
    codesCommunes.map(codeCommune => ensureDirectoryExists(communePath(distPath, codeCommune)))
  )

  await Promise.all([
    'ELYRE_RG_R2M_COMMUNE_polygon',
    'ELYRE_RG_R2M_SECTION_polygon',
    'ELYRE_RG_R2M_PARCELLE_polygon'
  ].map(async layerName => {
    const layerDefinition = layersMapping[layerName]
    console.log(' * Écriture de ' + layerDefinition.layer)
    console.time(' * Fin d\'écriture de ' + layerDefinition.layer)
    const features = layers[layerName]
    const byCommune = groupBy(features, f => {
      if (f.properties.NUM_COMMUN) {
        return '67' + f.properties.NUM_COMMUN
      }
      console.log(`Objet de la couche ${layerDefinition.layer} sans commune`)
    })

    await writeLayer(distPath, byCommune, layerDefinition.layer)
    console.timeEnd(' * Fin d\'écriture de ' + layerDefinition.layer)
  }))

  console.log(' * Écriture de batiments')
  const batimentsByCommune = groupBy(layers.ELYRE_RG_R2M_BATI_FUSIONNE_polygon, batimentFeature => {
    const communeResult = layers.ELYRE_RG_R2M_COMMUNE_polygon.find(communeFeature => {
      return inside(centroid(batimentFeature), communeFeature)
    })
    if (communeResult) {
      return '67' + communeResult.properties.NUM_COMMUN
    }
  })

  await writeLayer(distPath, batimentsByCommune, 'batiments')
}

/* Helpers */

function writeLayer(distPath, groupedFeatures, layerName) {
  return Promise.all(
    Object.keys(groupedFeatures)
      .filter(communeIsNotIgnored)
      .map(codeCommune => {
        const geojsonStream = createPolygonWriteStream(getLayerPath(distPath, codeCommune, layerName))
        return writeFeatures(groupedFeatures[codeCommune], geojsonStream)
      })
  )
}

function writeFeatures(features, geojsonStream) {
  return new Promise((resolve, reject) => {
    geojsonStream
      .on('error', reject)
      .on('finish', resolve)

    features.forEach(f => geojsonStream.write(f))
    geojsonStream.end()
  })
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

module.exports = handler
