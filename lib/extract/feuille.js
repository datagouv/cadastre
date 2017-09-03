'use strict'

const { promisify } = require('util')
const { readdir } = require('fs')

const { inside } = require('@turf/turf')
const { values, keyBy } = require('lodash')
const decompress = require('decompress')

const { createTempDirectory } = require('../util/tmpdir')

const { parsePackage } = require('../parse/raw')
const { extractFeatures } = require('../parse/gdal')

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
      try {
        numvoieFeature.properties.PARCELLE_CONTAINS = inside(numvoieFeature, parcelleFeature) ? 1 : 0
      } catch (err) {
        console.log('numvoie: Impossible de calculer appartance à parcelle. Parcelle %s manquante', numvoieFeature.properties.PARCELLE_IDU)
      }
    })
}

async function getTHFFilePath(path) {
  const thfFile = (await readdirAsync(path)).find(fn => fn.toUpperCase().endsWith('.THF'))
  if (!thfFile) throw new Error('THF file not found')
  return path + '/' + thfFile
}

async function extractFeuille(filePath) {
  let tmpDir
  let features

  try {
    tmpDir = await createTempDirectory()
    const tmpPath = tmpDir.path
    await decompress(filePath, tmpPath)
    const THFFilePath = await getTHFFilePath(tmpPath)
    const pkg = await parsePackage(tmpPath)
    features = await extractFeatures(THFFilePath, pkg.srsCode)
    const indexedFeatures = keyBy(features, 'id')
    expandNumvoie(indexedFeatures, pkg.items)
  } catch (err) {
    throw err
  } finally {
    await tmpDir.clean()
  }

  return features
}

module.exports = extractFeuille
