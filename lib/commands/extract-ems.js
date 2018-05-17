/* eslint camelcase: off */
'use strict'

const {join} = require('path')
const gdal = require('gdal')
const {booleanPointInPolygon, centroid, cleanCoords, truncate, rewind} = require('@turf/turf')
const bluebird = require('bluebird')

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
  ELYRE_RG_R2M_COMMUNE_polygon: {layer: 'communes', convertFn: rts.prepareCommune},
  ELYRE_RG_R2M_SECTION_polygon: {layer: 'sections', convertFn: rts.prepareSection},
  ELYRE_RG_R2M_PARCELLE_polygon: {layer: 'parcelles', convertFn: rts.prepareParcelle},
  ELYRE_RG_R2M_BATI_FUSIONNE_polygon: {layer: 'batiments', convertFn: rts.prepareBatiment},
  rg_cad_section: {layer: 'sections', convertFn: ems.prepareSection},
  rg_cad_parcelle: {layer: 'parcelles', convertFn: ems.prepareParcelle, validateFn: ems.validateParcelle}
}

async function handler({rtsPath, parcellesPath, sectionsPath}, distPath) {
  const layers = {}

  // Extract features from RTS dataset
  const rtsDataset = gdal.open(`/vsizip/${rtsPath}/Ref 2000`)
  const rtsLayersToRead = ['ELYRE_RG_R2M_COMMUNE_polygon', 'ELYRE_RG_R2M_BATI_FUSIONNE_polygon']
  if (!parcellesPath) {
    rtsLayersToRead.push('ELYRE_RG_R2M_PARCELLE_polygon')
  }
  if (!sectionsPath) {
    rtsLayersToRead.push('ELYRE_RG_R2M_SECTION_polygon')
  }
  rtsLayersToRead.forEach(layerName => {
    console.log(' * Lecture de ' + layerName)
    console.time(' * Fin de lecture de ' + layerName)
    const features = getGeoJSONFeatures(rtsDataset.layers.get(layerName))
    console.timeEnd(' * Fin de lecture de ' + layerName)
    layers[layerName] = features
  })
  rtsDataset.close()

  if (parcellesPath) {
    layers.rg_cad_parcelle = getSingleLayerFeatures(parcellesPath, 'rg_cad_parcelle')
  }

  if (sectionsPath) {
    layers.rg_cad_section = getSingleLayerFeatures(sectionsPath, 'rg_cad_section')
  }

  const layersToExtract = ['ELYRE_RG_R2M_COMMUNE_polygon', 'ELYRE_RG_R2M_BATI_FUSIONNE_polygon']
  layersToExtract.push('rg_cad_section' in layers ? 'rg_cad_section' : 'ELYRE_RG_R2M_SECTION_polygon')
  layersToExtract.push('rg_cad_parcelle' in layers ? 'rg_cad_parcelle' : 'ELYRE_RG_R2M_PARCELLE_polygon')

  const communes = layers.ELYRE_RG_R2M_COMMUNE_polygon

  const codesCommunes = communes
    .map(f => '67' + f.properties.NUM_COMMUN)
    .filter(communeIsNotIgnored)

  await bluebird.mapSeries(codesCommunes, async codeCommune => {
    console.log(' * Écriture de la commune ' + codeCommune)
    console.time(' * Fin d’écriture de la commune ' + codeCommune)
    await recreateDirectory(communePath(distPath, codeCommune))
    const aggregate = createAggregate({idKey: 'properties.id'})

    await Promise.all(layersToExtract.map(async layerName => {
      const {layer, convertFn, validateFn} = LAYERS_MAPPING[layerName]

      const features = layers[layerName]
        .filter(f => {
          // First try with NUM_COMMUN property
          if (f.properties.NUM_COMMUN) {
            return codeCommune === '67' + f.properties.NUM_COMMUN
          }
          // Second try with centroid + point in polygon
          const communeResult = communes.find(communeFeature => {
            return booleanPointInPolygon(centroid(f), communeFeature)
          })
          if (communeResult) {
            return codeCommune === '67' + communeResult.properties.NUM_COMMUN
          }
          return false
        })
        .map(f => convertFn(f, codeCommune))
        .filter(f => !validateFn || validateFn(f))
        .map(prepareGeometry)

      aggregate.addFeaturesToLayer(features, layer)
    }))

    postprocessPrefixesSections(aggregate)

    await writeLayeredFeatures(
      aggregate.getLayeredFeatures(),
      join(communePath(distPath, codeCommune), `cadastre-${codeCommune}-{layer}.json.gz`)
    )

    console.timeEnd(' * Fin d’écriture de la commune ' + codeCommune)
  })
}

/* Helpers */

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
