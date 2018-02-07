/* eslint unicorn/no-process-exit: off */
'use strict'

const {join} = require('path')
const {mergeGeoJSONFiles} = require('../merge')
const {getGeoJSONPath, listDepartements, departementLayerPath} = require('../dist/simple')

async function handler(workDir) {
  const departements = await listDepartements(workDir)
  const layers = ['batiments', 'parcelles', 'feuilles', 'sections', 'communes', 'lieux_dits']

  await Promise.all(departements.map(async departement => {
    console.log('  merging departement %s', departement)
    console.time('  merged departement ' + departement)

    await Promise.all(layers.map(async layer => {
      const srcPattern = join(getGeoJSONPath(workDir), 'communes', '**', `cadastre-*-${layer}.json.gz`)
      await mergeGeoJSONFiles(srcPattern, departementLayerPath(workDir, layer, departement))
      console.log(`    ${departement} | merged ${layer}`)
    }))

    console.timeEnd('  merged departement ' + departement)
  }))

  console.log()
  console.log('Finished!')

  process.exit(0)
}

module.exports = handler
