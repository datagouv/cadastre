'use strict'

const {inside} = require('@turf/turf')
const {values, keyBy} = require('lodash')
const decompress = require('decompress')

const {readdir} = require('../util/fs')
const {createTempDirectory} = require('../util/tmpdir')

const {parsePackage} = require('../parse/raw')
const {extractFeatures} = require('../parse/gdal')

function expandNumvoie(indexedFeatures, packageEntries) {
  values(packageEntries)
    .filter(obj => obj.associationType === 'NUMVOIE_PARCELLE' && obj.type === 'LNK')
    .forEach(numvoieParcelleRelation => {
      const relatedObjects = numvoieParcelleRelation.relatedObjects.map(id => packageEntries[id])

      const parcelle = relatedObjects.find(obj => obj.objectType === 'PARCELLE_id')
      const numvoie = relatedObjects.find(obj => obj.objectType === 'NUMVOIE_id')

      const numvoieFeature = indexedFeatures[numvoie.id]
      const parcelleFeature = indexedFeatures[parcelle.id]

      if (!numvoieFeature) return
      numvoieFeature.properties.PARCELLE_IDU = parcelle.attributes.IDU_id

      if (!parcelleFeature) return
      numvoieFeature.properties.PARCELLE_CONTAINS = inside(numvoieFeature, parcelleFeature) ? 1 : 0
    })
}

async function getTHFFilePath(path) {
  const thfFile = (await readdir(path)).find(fn => fn.toUpperCase().endsWith('.THF'))
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
