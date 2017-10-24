'use strict'

const { EventEmitter } = require('events')
const { join } = require('path')

const workerFarm = require('worker-farm')
const Promise = require('bluebird')

const { readdir } = require('../util/fs')
const { isCodeCommune } = require('../util/codes')


const extractCommuneWorkers = workerFarm(
  { maxConcurrentCallsPerWorker: 1 },
  require.resolve('../worker')
)

function extractDepartement(baseSrcPath, baseDestPath, codeDep, rawMode = false, layers) {
  const extractor = new EventEmitter()
  const depSrcPath = join(baseSrcPath, 'departements', codeDep)

  extractor.extracted = 0

  function progress({ codeCommune }) {
    extractor.extracted++
    extractor.emit('commune', { codeCommune })
  }

  readdir(join(depSrcPath, 'communes'))
    .then(files => {

      const communesFound = files
        .filter(isCodeCommune)

      /* Progression */
      extractor.total = communesFound.length
      extractor.emit('start')

      // Series since GDAL is a blocking binding
      return Promise.map(communesFound, commune => {
        return new Promise((resolve, reject) => {
          extractCommuneWorkers({ baseSrcPath, baseDestPath, codeCommune: commune, rawMode, layers }, err => {
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
