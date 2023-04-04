/* eslint unicorn/no-process-exit: off */
import process from 'node:process'
import {join} from 'node:path'
import {mergeGeoJSONFilesFromList} from '../merge/index.js'
import {getGeoJSONPath, listDepartements, departementLayerPath, franceLayerPath} from '../dist/simple.js'

import {pathExists} from 'fs-extra'

const asyncFilter = async (arr, predicate) => Promise.all(arr.map(predicate)).then((results) => arr.filter((_v, index) => results[index]));

const epci = require('@etalab/decoupage-administratif/data/epci.json')
const epci_communes_members = epci.reduce((acc, curr) => {acc[curr.code] = curr.membres.map(membre => membre.code); return acc}, {})
const epci_keys = Object.keys(epci_communes_members)

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

const FRANCE_LAYERS = [
  'feuilles',
  'sections',
  'communes',
  'prefixes_sections',
]

async function handler(workDir) {
  await Promise.all(Object.entries(epci_communes_members).map(async ([epci, communes]) => {
    console.log('  merging epci %s', epci)
    console.time('  merged epci ' + epci)

    await Promise.all(GEOJSON_LAYERS.map(async layer => {
      const files = communes.map(commune => {
        const departement = ${commune.startsWith('97') ? commune.slice(0, 3) : commune.slice(0, 2)}
        return join(getGeoJSONPath(workDir), 'communes', departement, `${commune}`, `cadastre-${commune}-${layer}.json.gz`)
      })
      const filteredFiles = await asyncFilter(files, pathExists)
      const targetDir = join(getGeoJSONPath(workDir), 'epci', epci)
      await ensureDirectoryExists(targetDir)
      const difference = files.filter(x => !filteredFiles.includes(x));
      const targetPath = join(getGeoJSONPath(workDir), 'epci', epci, `pci-epci-${epci}-${layer}.json.gz`)
      await mergeGeoJSONFiles(filteredFiles, targetPath)
      console.log(`    ${epci} | merged ${layer}`)
    }))

    console.timeEnd('  merged epci ' + epci)
  }))

  await Promise.all(Object.entries(epci_communes_members).map(async ([epci, communes]) => {
    console.log('  [raw] merging epci %s', epci)
    console.time('  [raw] merged epci ' + epci)

    await Promise.all(GEOJSON_RAW_LAYERS.map(async layer => {
      const files = communes.map(commune => {
        const departement = ${commune.startsWith('97') ? commune.slice(0, 3) : commune.slice(0, 2)}
        return join(getGeoJSONPath(workDir), 'communes', departement, `${commune}`, 'raw', `cadastre-${commune}-${layer}.json.gz`)
      })
      const filteredFiles = await asyncFilter(files, pathExists)
      const targetDir = join(getGeoJSONPath(workDir), 'epci', epci, 'raw')
      await ensureDirectoryExists(targetDir)
      const difference = files.filter(x => !filteredFiles.includes(x));
      const targetPath = join(getGeoJSONPath(workDir), 'epci', epci, 'raw', `pci-epci-${epci}-${layer}.json.gz`)
      await mergeGeoJSONFiles(files, targetPath)
      console.log(`    ${epci} | merged ${layer}`)
    }))

    console.timeEnd('  [raw] merged epci ' + epci)
  }))

  console.log('Finished!')

  process.exit(0)
}

export default handler
