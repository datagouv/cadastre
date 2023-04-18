/* eslint unicorn/no-process-exit: off */
import process from 'node:process'
import {join} from 'node:path'
import {createRequire} from 'node:module'

import {pathExists} from 'fs-extra'
import bluebird from 'bluebird'
import {ensureDirectoryExists} from '../util/fs.js'
import {mergeGeoJSONFiles} from '../merge/index.js'
import {getGeoJSONPath} from '../dist/simple.js'
import {Tree, FORMATS} from '../dist/pci.js'
import {WritableZipFile} from '../util/zip.js'

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

async function handler(workDir, from) {
  if (from === 'etalab') {
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
        const targetPath = join(getGeoJSONPath(workDir), 'epci', epci, `epci-${epci}-${layer}.json.gz`)
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
        const targetPath = join(getGeoJSONPath(workDir), 'epci', epci, 'raw', `epci-${epci}-${layer}.json.gz`)
        await mergeGeoJSONFiles({srcFiles: filteredFiles, destPath: targetPath})
        console.log(`    ${epci} | merged ${layer}`)
      }))

      console.timeEnd('  [raw] merged epci ' + epci)
    }))
  }

  if (from === 'pci') {
    await bluebird.map(Object.entries(epciCommunesMembers), async ([epci, communes]) => {
      await Promise.all(FORMATS.filter(formatInfos => formatInfos.name !== 'tiff').map(formatInfos => formatInfos.name).map(async format => {
        console.log('  merging epci %s format %s', epci, format)
        console.time(`  merging epci ${epci} files ${format}`)

        const tree = new Tree(workDir, 'dgfip-pci-vecteur', format)
        const filteredCommunes = await asyncFilter(communes, async commune => {
          const departement = `${commune.startsWith('97') ? commune.slice(0, 3) : commune.slice(0, 2)}`
          return pathExists(`${tree.getFeuillesBasePath()}/${departement}/${commune}`)
        })
        const feuillesCommunes = await Promise.all(filteredCommunes.map(async codeCommune => ({
          code: codeCommune,
          feuilles: await tree.listFeuillesByCommune(codeCommune),
        })))
        // eslint-disable-next-line unicorn/no-array-reduce
        const filesToZip = feuillesCommunes.reduce((acc, feuillesCommune) => {
          acc = [...acc, ...feuillesCommune.feuilles.map(feuille => {
            const dest = `${tree.getFeuillePathInArchive(feuille)}`
            return [tree.getFeuillePath(feuille), dest]
          })]
          return acc
        }, [])
        const targetDir = `${tree.treeBasePath}/epci/`

        const destArchive = new WritableZipFile(`${targetDir}/cadastre-${epci}-${format}.zip`)
        await bluebird.map(filesToZip, async fileInfos => {
          const [file, dest] = fileInfos
          destArchive.addFile(file, dest, {compress: false})
        }, {concurrency: 4})
        await destArchive.end()
        console.log('end zip')

        console.timeEnd(`  merging epci ${epci} files ${format}`)
      }))
    }, {concurrency: 4})
  }

  console.log('Finished!')

  process.exit(0)
}

export default handler
