'use strict'

const {EventEmitter} = require('events')

const workerFarm = require('worker-farm')
const Promise = require('bluebird')

const {Tree} = require('../distributions/dgfip-pci-vecteur')

const extractCommuneWorkers = workerFarm(
  {maxConcurrentCallsPerWorker: 1},
  require.resolve('../worker')
)

function extractDepartement(basePath, codeDep, rawMode = false, layers) {
  const extractor = new EventEmitter()
  const edigeoTree = new Tree(basePath, 'dgfip-pci-vecteur/edigeo')

  extractor.extracted = 0

  function progress({codeCommune}) {
    extractor.extracted++
    extractor.emit('commune', {codeCommune})
  }

  edigeoTree.listCommunesByDepartement(codeDep)
    .then(communesFound => {
      /* Progression */
      extractor.total = communesFound.length
      extractor.emit('start')

      // Series since GDAL is a blocking binding
      return Promise.map(communesFound, commune => {
        return new Promise((resolve, reject) => {
          extractCommuneWorkers({basePath, codeCommune: commune, rawMode, layers}, err => {
            if (err) return reject(err)
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

module.exports = extractDepartement
