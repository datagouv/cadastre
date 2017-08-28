'use strict'

const { EventEmitter } = require('events')
const { join } = require('path')
const { stat, readdir } = require('fs')
const { promisify } = require('util')

const Promise = require('bluebird')
const debug = require('debug')('cadastre')

const readdirAsync = promisify(readdir)
const statAsync = promisify(stat)

const extractFeuille = require('./feuille')

const extractCommune = require('./commune')

function extractDepartement(baseSrcPath, codeDep) {
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
      return Promise.mapSeries(communesFound, commune => {
        return new Promise((resolve, reject) => {
          const communeExtractor = extractCommune(baseSrcPath, commune)
          communeExtractor.on('feuille', feuille => {
            extractor.emit('feuille', feuille)
          })
          communeExtractor.on('error', reject)
          communeExtractor.on('end', () => {
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
