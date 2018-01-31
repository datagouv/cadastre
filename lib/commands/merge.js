/* eslint unicorn/no-process-exit: off */
'use strict'

const {mergeGeoJSONFiles} = require('../merge')
const {listLayerFilesByDepartement, listDepartements, departementLayerPath} = require('../dist/simple')

async function handler(workDir) {
  const departements = await listDepartements(workDir)
  const layers = ['batiments', 'parcelles', 'feuilles', 'sections', 'communes']

  await Promise.all(departements.map(async departement => {
    console.log('  merging departement %s', departement)
    console.time('  merged departement ' + departement)

    await Promise.all(layers.map(async layer => {
      const srcFiles = await listLayerFilesByDepartement(workDir, layer, departement)
      await mergeGeoJSONFiles(srcFiles, departementLayerPath(workDir, layer, departement))
      console.log(`    ${departement} | merged ${layer}`)
    }))

    console.timeEnd('  merged departement ' + departement)
  }))

  console.log()
  console.log('Finished!')

  process.exit(0)
}

module.exports = handler
