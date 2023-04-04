/* eslint unicorn/no-process-exit: off */
import process from 'node:process'
import {join} from 'node:path'
import {mergeGeoJSONFiles} from '../merge/index.js'
import {getGeoJSONPath, listDepartements, departementLayerPath, franceLayerPath} from '../dist/simple.js'

const DEPARTEMENT_LAYERS = [
  'batiments',
  'parcelles',
  'feuilles',
  'sections',
  'communes',
  'lieux_dits',
  'subdivisions_fiscales',
  'prefixes_sections',
]

const DEPARTEMENT_RAW_LAYERS = [
  'commune',
  'section',
  'subdsect',
  'parcelle',
  'subdfisc',
  'charge',
  'voiep',
  'tronfluv',
  'ptcanv',
  'batiment',
  'zoncommuni',
  'numvoie',
  'tronroute',
  'borne',
  'croix',
  'boulon',
  'symblim',
  'lieudit',
  'tpoint',
  'tline',
  'tsurf',
  'label',
]

const FRANCE_LAYERS = [
  'feuilles',
  'sections',
  'communes',
  'prefixes_sections',
]

async function handler(workDir) {
  const departements = await listDepartements(workDir)

  await Promise.all(departements.map(async departement => {
    console.log('  merging departement %s', departement)
    console.time('  merged departement ' + departement)

    await Promise.all(DEPARTEMENT_LAYERS.map(async layer => {
      const srcPattern = join(getGeoJSONPath(workDir), 'communes', departement, '*', `cadastre-*-${layer}.json.gz`)
      await mergeGeoJSONFiles({srcPattern, destPath: departementLayerPath(workDir, layer, departement)})
      console.log(`    ${departement} | merged ${layer}`)
    }))

    console.timeEnd('  merged departement ' + departement)
  }))

  await Promise.all(departements.map(async departement => {
    console.log('  [raw] merging departement %s', departement)
    console.time('  [raw] merged departement ' + departement)

    await Promise.all(DEPARTEMENT_RAW_LAYERS.map(async layer => {
      const srcPattern = join(getGeoJSONPath(workDir), 'communes', departement, '*', 'raw', `pci-*-${layer}.json.gz`)
      const targetPath = join(getGeoJSONPath(workDir), 'departements', departement, 'raw', `pci-${departement}-${layer}.json.gz`)
      await mergeGeoJSONFiles({srcPattern, destPath: targetPath})
      console.log(`    ${departement} | merged ${layer}`)
    }))

    console.timeEnd('  [raw] merged departement ' + departement)
  }))

  console.log('  merging france')
  console.time('  merged france')

  await Promise.all(FRANCE_LAYERS.map(async layer => {
    const srcPattern = join(getGeoJSONPath(workDir), 'departements', '*', `cadastre-*-${layer}.json.gz`)
    await mergeGeoJSONFiles({srcPattern, destPath: franceLayerPath(workDir, layer)})
    console.log(`    france | merged ${layer}`)
  }))

  console.timeEnd('  merged france')

  console.log()
  console.log('Finished!')

  process.exit(0)
}

export default handler
