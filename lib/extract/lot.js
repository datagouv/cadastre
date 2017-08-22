'use strict'

const { promisify } = require('util')
const { readdir } = require('fs')

const { inside } = require('@turf/turf')
const { values, keyBy } = require('lodash')
const decompress = require('decompress')

const { createTempDirectory } = require('../util/tmpdir')

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

async function extractLot({ path, depCode, onFeature, codeCommune, planche }) {
  let tmpDir

  try {
    tmpDir = await createTempDirectory()
    const tmpPath = tmpDir.path
    await decompress(path, tmpPath)
    const THFFilePath = await getTHFFilePath(tmpPath)
    const pkg = await parsePackage(tmpPath)
    const features = await extractFeatures(THFFilePath, pkg.srsCode, depCode)
    const indexedFeatures = keyBy(features, 'id')
    expandNumvoie(indexedFeatures, pkg.items)
    await tmpDir.clean()
    features.forEach(onFeature)
  } catch (err) {
    await tmpDir.clean()
    throw err
  }
}

module.exports = extractLot
