/* eslint camelcase: off */
import {join} from 'node:path'
import gdal from 'gdal-next'
import {booleanPointInPolygon, centroid, cleanCoords, truncate, rewind} from '@turf/turf'
import bluebird from 'bluebird'
import {groupBy} from 'lodash-es'
import {communePath} from '../dist/simple.js'
import {recreateDirectory} from '../util/fs.js'
import {createAggregate} from '../aggregate/index.js'
import postprocessPrefixesSections from '../post-processing/prefixes-sections.js'
import {writeLayeredFeatures} from '../writers/geojson.js'
import rts from '../convert/ems-rts.js'
import ems from '../convert/ems-cadastre.js'

const communesToIgnore = new Set([
  '67001',
  '67065',
  '67363',
  '67247',
  '67182',
])

const LAYERS_MAPPING = {
  rg_r2m_commune: {layer: 'communes', convertFn: rts.prepareCommune},
  rg_r2m_bati_fusionne: {layer: 'batiments', convertFn: rts.prepareBatiment},
  rg_cad_section: {layer: 'sections', convertFn: ems.prepareSection},
  rg_cad_parcelle: {layer: 'parcelles', convertFn: ems.prepareParcelle, validateFn: ems.validateParcelle},
}

async function handler({rtsPath, parcellairePath}, distPath) {
  const layers = {}

  // Extract features from RTS dataset
  const rtsDataset = gdal.open(`/vsizip/${rtsPath}`)
  const rtsLayersToRead = ['rg_r2m_commune', 'rg_r2m_bati_fusionne']
  for (const layerName of rtsLayersToRead) {
    console.log(' * Lecture de ' + layerName)
    console.time(' * Fin de lecture de ' + layerName)
    const features = getGeoJSONFeatures(rtsDataset.layers.get(layerName))
    console.timeEnd(' * Fin de lecture de ' + layerName)
    layers[layerName] = features
  }

  rtsDataset.close()

  // Extract features from Parcellaire dataset
  const parcellaireDataset = gdal.open(`/vsizip/${parcellairePath}`)
  const parcellaireLayersToRead = ['rg_cad_parcelle', 'rg_cad_section']
  for (const layerName of parcellaireLayersToRead) {
    console.log(' * Lecture de ' + layerName)
    console.time(' * Fin de lecture de ' + layerName)
    const features = getGeoJSONFeatures(parcellaireDataset.layers.get(layerName))
    console.timeEnd(' * Fin de lecture de ' + layerName)
    layers[layerName] = features
  }

  parcellaireDataset.close()

  const communes = layers.rg_r2m_commune

  // Group features by commune (for performance purpose)
  for (const layerName of Object.keys(layers)) {
    const rawFeatures = layers[layerName]
    layers[layerName] = groupBy(rawFeatures, f => getCommuneFromRawFeature(f, communes))
  }

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
      join(communePath(distPath, codeCommune), `cadastre-${codeCommune}-{layer}.json.gz`),
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
  const communeResult = communes.find(communeFeature => booleanPointInPolygon(centroid(f), communeFeature))
  if (communeResult) {
    return '67' + communeResult.properties.NUM_COM
  }
}

function prepareGeometry(feature) {
  return rewind(
    cleanCoords(
      truncate(feature, {precision: 7, coordinates: 2, mutate: true}),
      {mutate: true},
    ),
    {mutate: true},
  )
}

function getGeoJSONFeatures(gdalLayer) {
  const transformation = new gdal.CoordinateTransformation(
    gdalLayer.srs,
    gdal.SpatialReference.fromProj4('+init=epsg:4326'),
  )

  return gdalLayer.features.map(feature => {
    const geometry = feature.getGeometry()
    geometry.transform(transformation)
    return {
      type: 'Feature',
      geometry: geometry.toObject(),
      properties: feature.fields.toObject(),
    }
  })
}

function communeIsNotIgnored(codeCommune) {
  return codeCommune.match(/^([a-z\d]{5})$/i) && !communesToIgnore.has(codeCommune)
}

export default handler
