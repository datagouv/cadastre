'use strict'

const {EventEmitter} = require('events')

const workerFarm = require('worker-farm')
const Promise = require('bluebird')

const {Tree} = require('../dist/pci')

const extractCommuneWorkers = workerFarm(
  {maxConcurrentCallsPerWorker: 1, maxRetries: 0},
  require.resolve('../worker')
)

function extractDepartement(basePath, codeDep, layers) {
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
      return Promise.map(communesFound, commune => {
        return new Promise((resolve, reject) => {
          extractCommuneWorkers({basePath, codeCommune: commune, layers}, err => {
            if (err) {
              console.error('Unable to extract commune %s', commune)
              console.error(err)
              return reject(err)
            }
            progress({codeCommune: commune})
            resolve()
          })
        })
      })
    })
    .then(() => extractor.emit('end'))
    .catch(err => extractor.emit('error', err))

  return extractor
}

function stopWorkers(cb) {
  workerFarm.end(extractCommuneWorkers, cb)
}

module.exports = {extractDepartement, stopWorkers}
