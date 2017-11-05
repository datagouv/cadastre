'use strict'

const {mergeGeoJSONFiles} = require('../util/geo')
const {listLayerFilesByDepartement, listDepartements, departementLayerPath} = require('../distributions/etalab-cadastre')

async function handler(workDir) {
  const departements = await listDepartements(workDir)
  const layers = ['batiments', 'parcelles', 'feuilles', 'sections', 'communes']

  for (const departement of departements) {
    console.log('  merging departement %s', departement)
    console.time('  merged departement ' + departement)

    for (const layer of layers) {
      const srcFiles = await listLayerFilesByDepartement(workDir, layer, departement)
      await mergeGeoJSONFiles(srcFiles, departementLayerPath(workDir, layer, departement))
    }

    console.timeEnd('  merged departement ' + departement)
  }
}

module.exports = handler
