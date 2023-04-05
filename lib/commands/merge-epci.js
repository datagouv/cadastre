/* eslint unicorn/no-process-exit: off */
import process from 'node:process'
import {join} from 'node:path'
import {createRequire} from 'node:module'

import {pathExists} from 'fs-extra'
import {ensureDirectoryExists} from '../util/fs.js'
import {mergeGeoJSONFiles} from '../merge/index.js'
import {getGeoJSONPath} from '../dist/simple.js'

const require = createRequire(import.meta.url)

const epci = require('@etalab/decoupage-administratif/data/epci.json')

// eslint-disable-next-line unicorn/no-array-reduce
const epciCommunesMembers = epci.reduce((acc, curr) => {
  acc[curr.code] = curr.membres.map(membre => membre.code)
  return acc
}, {})

// eslint-disable-next-line unicorn/no-array-callback-reference
const asyncFilter = async (array, predicate) => Promise.all(array.map(predicate)).then(results => array.filter((_v, index) => results[index]))

const GEOJSON_LAYERS = [
  'batiments',
  'parcelles',
  'feuilles',
  'sections',
  'communes',
  'lieux_dits',
  'subdivisions_fiscales',
  'prefixes_sections',
]

const GEOJSON_RAW_LAYERS = [
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

async function handler(workDir) {
  await Promise.all(Object.entries(epciCommunesMembers).map(async ([epci, communes]) => {
    console.log('  merging epci %s', epci)
    console.time('  merged epci ' + epci)

    await Promise.all(GEOJSON_LAYERS.map(async layer => {
      const files = communes.map(commune => {
        const departement = `${commune.startsWith('97') ? commune.slice(0, 3) : commune.slice(0, 2)}`
        return join(getGeoJSONPath(workDir), 'communes', departement, `${commune}`, `cadastre-${commune}-${layer}.json.gz`)
      })
      const filteredFiles = await asyncFilter(files, pathExists)
      const targetDir = join(getGeoJSONPath(workDir), 'epci', epci)
      await ensureDirectoryExists(targetDir)
      const targetPath = join(getGeoJSONPath(workDir), 'epci', epci, `pci-epci-${epci}-${layer}.json.gz`)
      await mergeGeoJSONFiles({srcFiles: filteredFiles, destPath: targetPath})
      console.log(`    ${epci} | merged ${layer}`)
    }))

    console.timeEnd('  merged epci ' + epci)
  }))

  await Promise.all(Object.entries(epciCommunesMembers).map(async ([epci, communes]) => {
    console.log('  [raw] merging epci %s', epci)
    console.time('  [raw] merged epci ' + epci)

    await Promise.all(GEOJSON_RAW_LAYERS.map(async layer => {
      const files = communes.map(commune => {
        const departement = `${commune.startsWith('97') ? commune.slice(0, 3) : commune.slice(0, 2)}`
        return join(getGeoJSONPath(workDir), 'communes', departement, `${commune}`, 'raw', `cadastre-${commune}-${layer}.json.gz`)
      })
      const filteredFiles = await asyncFilter(files, pathExists)
      const targetDir = join(getGeoJSONPath(workDir), 'epci', epci, 'raw')
      await ensureDirectoryExists(targetDir)
      const targetPath = join(getGeoJSONPath(workDir), 'epci', epci, 'raw', `pci-epci-${epci}-${layer}.json.gz`)
      await mergeGeoJSONFiles({srcFiles: filteredFiles, destPath: targetPath})
      console.log(`    ${epci} | merged ${layer}`)
    }))

    console.timeEnd('  [raw] merged epci ' + epci)
  }))

  console.log('Finished!')

  process.exit(0)
}

export default handler
