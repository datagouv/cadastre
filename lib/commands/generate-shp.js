/* eslint unicorn/no-process-exit: off */
const {join} = require('path')
const {ensureDir, pathExists} = require('fs-extra')
const bluebird = require('bluebird')
const {getLegalCrsCode} = require('../util/crs')
const {getShapefilePath, getGeoJSONPath, listDepartementsFromDepartements} = require('../dist/simple')
const {convertToShape, stopWorkers} = require('../shp')

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

const FRANCE_LAYERS = [
  'feuilles',
  'sections',
  'communes',
  'prefixes_sections'
]

async function handler(workDir) {
  const departements = await listDepartementsFromDepartements(workDir)

  await bluebird.map(departements, async departement => {
    console.log('  Création des shapefiles pour le département %s', departement)
    console.time(`  département ${departement} : terminé`)

    const depShpPath = join(getShapefilePath(workDir), 'departements', departement)
    const targetCrs = getLegalCrsCode(departement)

    await ensureDir(depShpPath)

    await bluebird.map(DEPARTEMENT_LAYERS, async layer => {
      const geojsonPath = join(getGeoJSONPath(workDir), 'departements', departement, `cadastre-${departement}-${layer}.json.gz`)
      if (!(await pathExists(geojsonPath))) {
        return
      }

      const fileName = `cadastre-${departement}-${layer}-shp.zip`
      await convertToShape(geojsonPath, join(depShpPath, fileName), {layer, targetCrs})
      console.log(`    ${departement} | ${fileName} OK`)
    })

    console.timeEnd(`  département ${departement} : terminé`)
  }, {concurrency: 4})

  console.log('  Création des shapefiles pour France entière')
  console.time('  terminé')

  const franceShpPath = join(getShapefilePath(workDir), 'france')

  await ensureDir(franceShpPath)

  await bluebird.map(FRANCE_LAYERS, async layer => {
    const geojsonPath = join(getGeoJSONPath(workDir), 'france', `cadastre-france-${layer}.json.gz`)
    if (!(await pathExists(geojsonPath))) {
      return
    }

    const fileName = `cadastre-france-${layer}-shp.zip`
    await convertToShape(geojsonPath, join(franceShpPath, fileName), {layer})
    console.log(`    ${fileName} OK`)
  })

  console.timeEnd('  terminé')

  await stopWorkers()

  console.log()
  console.log('Finished!')
}

module.exports = handler
