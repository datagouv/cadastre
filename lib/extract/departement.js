'use strict'

const { EventEmitter } = require('events')
const { join } = require('path')
const { readdir } = require('fs')
const { promisify } = require('util')

const workerFarm = require('worker-farm')
const Promise = require('bluebird')

const readdirAsync = promisify(readdir)

const extractCommuneWorkers = workerFarm(
  { maxConcurrentCallsPerWorker: 1 },
  require.resolve('../worker')
)

function extractDepartement(baseSrcPath, baseDestPath, codeDep, writeRaw = false) {
  const extractor = new EventEmitter()
  const depSrcPath = join(baseSrcPath, 'departements', codeDep)

  extractor.extracted = 0

  function progress({ codeCommune }) {
    extractor.extracted++
    extractor.emit('commune', { codeCommune })
  }

  readdirAsync(join(depSrcPath, 'communes'))
    .then(files => {

      const communesFound = files
        .filter(p => p.match(/^([A-Z0-9]{2,3})([0-9]{2})$/i))

      /* Progression */
      extractor.total = communesFound.length
      extractor.emit('start')

      // Series since GDAL is a blocking binding
      return Promise.map(communesFound, commune => {
        return new Promise((resolve, reject) => {
          extractCommuneWorkers({ baseSrcPath, baseDestPath, codeCommune: commune, writeRaw }, err => {
            if (err) return reject(err)
            progress({ codeCommune: commune })
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
