'use strict'

const { promisify } = require('util')
const { readdir } = require('fs')

const { inside } = require('@turf/turf')
const { values, keyBy } = require('lodash')

const { parsePackage } = require('./parsers/raw')
const { extractFeatures } = require('./parsers/gdal')

const readdirAsync = promisify(readdir)


function expandNumvoie(indexedFeatures, packageEntries) {
  values(packageEntries)
    .filter(obj => obj.associationType === 'NUMVOIE_PARCELLE' && obj.type === 'LNK')
    .forEach(numvoieParcelleRelation => {
      const relatedObjects = numvoieParcelleRelation.relatedObjects.map(id => packageEntries[id])

      const parcelle = relatedObjects.find(obj => obj.objectType === 'PARCELLE_id')
      const numvoie = relatedObjects.find(obj => obj.objectType === 'NUMVOIE_id')

      const numvoieFeature = indexedFeatures[numvoie.id]
      const parcelleFeature = indexedFeatures[parcelle.id]

      numvoieFeature.properties.PARCELLE_IDU = parcelle.attributes.IDU_id
      numvoieFeature.properties.PARCELLE_CONTAINS = inside(numvoieFeature, parcelleFeature)
    })
}

async function getTHFFilePath(path) {
  const thfFile = (await readdirAsync(path)).find(fn => fn.toUpperCase().endsWith('.THF'))
  if (!thfFile) throw new Error('THF file not found in package directory')
  return path + '/' + thfFile
}

async function extractLot({ path, depCode, onFeature }) {
  const THFFilePath = await getTHFFilePath(path)
  const pkg = await parsePackage(path)
  const features = await extractFeatures(THFFilePath, pkg.srsCode, depCode)
  const indexedFeatures = keyBy(features, 'id')
  expandNumvoie(indexedFeatures, pkg.items)
  features.forEach(onFeature)
}

module.exports = extractLot
