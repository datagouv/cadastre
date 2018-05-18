/* eslint unicorn/no-process-exit: off */
const {join} = require('path')
const {ensureDir, pathExists} = require('fs-extra')
const bluebird = require('bluebird')
const {convert} = require('geojson2shp')
const {getLegalCrsCode} = require('../util/crs')
const {getShapefilePath, getGeoJSONPath, listDepartementsFromDepartements} = require('../dist/simple')

const DEPARTEMENT_LAYERS = [
  'batiments',
  'parcelles',
  'feuilles',
  'sections',
  'communes',
  'lieux_dits',
  'subdivisions_fiscales',
  'prefixes_sections'
]

async function handler(workDir) {
  const departements = await listDepartementsFromDepartements(workDir)

  await bluebird.mapSeries(departements, async departement => {
    console.log('  Création des shapefiles pour le département %s', departement)
    console.time(`  département ${departement} : terminé`)

    const depShpPath = join(getShapefilePath(workDir), 'departements', departement)
    const targetCrs = getLegalCrsCode(departement)

    await ensureDir(depShpPath)

    await bluebird.mapSeries(DEPARTEMENT_LAYERS, async layer => {
      const geojsonPath = join(getGeoJSONPath(workDir), 'departements', departement, `cadastre-${departement}-${layer}.json.gz`)
      if (!(await pathExists(geojsonPath))) {
        return
      }
      const fileName = `cadastre-${departement}-${layer}-shp.zip`
      await convert(geojsonPath, join(depShpPath, fileName), {layer, targetCrs})
      console.log(`    ${departement} | ${fileName} OK`)
    })

    console.timeEnd(`  département ${departement} : terminé`)
  })

  console.log()
  console.log('Finished!')

  process.exit(0)
}

module.exports = handler
