/* eslint unicorn/no-process-exit: off */
'use strict'

const {join} = require('path')
const {mergeGeoJSONFiles} = require('../merge')
const {getGeoJSONPath, listDepartements, departementLayerPath, franceLayerPath} = require('../dist/simple')

const DEPARTEMENT_LAYERS = [
  'batiments',
  'parcelles',
  'feuilles',
  'sections',
  'communes',
  'lieux_dits',
  'subdivisions_fiscales'
]

const FRANCE_LAYERS = [
  'feuilles',
  'sections',
  'communes'
]

async function handler(workDir) {
  const departements = await listDepartements(workDir)

  await Promise.all(departements.map(async departement => {
    console.log('  merging departement %s', departement)
    console.time('  merged departement ' + departement)

    await Promise.all(DEPARTEMENT_LAYERS.map(async layer => {
      const srcPattern = join(getGeoJSONPath(workDir), 'communes', departement, '*', `cadastre-*-${layer}.json.gz`)
      await mergeGeoJSONFiles(srcPattern, departementLayerPath(workDir, layer, departement))
      console.log(`    ${departement} | merged ${layer}`)
    }))

    console.timeEnd('  merged departement ' + departement)
  }))

  console.log('  merging france')
  console.time('  merged france')

  await Promise.all(FRANCE_LAYERS.map(async layer => {
    const srcPattern = join(getGeoJSONPath(workDir), 'departements', '*', `cadastre-*-${layer}.json.gz`)
    await mergeGeoJSONFiles(srcPattern, franceLayerPath(workDir, layer))
    console.log(`    france | merged ${layer}`)
  }))

  console.timeEnd('  merged france')

  console.log()
  console.log('Finished!')

  process.exit(0)
}

module.exports = handler
