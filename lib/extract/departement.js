import {createRequire} from 'node:module'
import {EventEmitter} from 'node:events'
import workerFarm from 'worker-farm'
import bluebird from 'bluebird'
import {Tree} from '../dist/pci.js'

const require = createRequire(import.meta.url)
const workerOptions = {execArgv: ['--max-old-space-size=3072']}

const extractCommuneWorkers = workerFarm(
  {maxConcurrentCallsPerWorker: 1, maxRetries: 0, workerOptions},
  require.resolve('./worker'),
)

function extractDepartement(basePath, codeDep) {
  const extractor = new EventEmitter()
  const edigeoTree = new Tree(basePath, 'dgfip-pci-vecteur', 'edigeo')

  extractor.extracted = 0

  function progress({codeCommune}) {
    extractor.extracted++
    extractor.emit('commune', {codeCommune})
  }

  edigeoTree.listCommunesByDepartement(codeDep)
    .then(communesFound => {
      /* Progression */
      extractor.total = communesFound.length

      // Series since GDAL is a blocking binding
      return bluebird.map(communesFound, commune => new Promise((resolve, reject) => {
        extractCommuneWorkers({basePath, codeCommune: commune}, error => {
          if (error) {
            console.error('Unable to extract commune %s', commune)
            console.error(error)
            return reject(error)
          }

          progress({codeCommune: commune})
          resolve()
        })
      }))
    })
    .then(() => extractor.emit('end'))
    .catch(error => extractor.emit('error', error))

  return extractor
}

function stopWorkers(cb) {
  workerFarm.end(extractCommuneWorkers, cb)
}

export {extractDepartement, stopWorkers}
