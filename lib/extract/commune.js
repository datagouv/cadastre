'use strict'

const {EventEmitter} = require('events')

const Promise = require('bluebird')
const debug = require('debug')('cadastre')

const {stat} = require('../util/fs')
const {listFeuillesByCommune, feuillePath} = require('../distributions/dgfip-pci-vecteur')

const extractFeuille = require('./feuille')

function extractCommune(basePath, codeCommune) {
  const extractor = new EventEmitter()

  extractor.extracted = 0

  function progress({feuille, status, features}) {
    extractor.extracted++
    extractor.emit('feuille', {feuille, status, features})
  }

  listFeuillesByCommune(basePath, codeCommune)
    .then(feuilles => {
      /* Progression */
      extractor.total = feuilles.length
      extractor.emit('start')

      // Series since GDAL is a blocking binding
      return Promise.mapSeries(feuilles, feuille => {
        return handleFeuille(basePath, feuille)
          .then(progress)
      })
    })
    .then(() => extractor.emit('end'))
    .catch(err => extractor.emit('error', err))

  return extractor
}

async function handleFeuille(basePath, feuille) {
  debug('handle feuille %s', feuille)
  const filePath = feuillePath(basePath, feuille)
  const fileSize = await stat(filePath).size

  if (fileSize < 4096) {
    return {feuille, status: 'ignored'}
  }

  try {
    const features = await extractFeuille(basePath, feuille)
    return {
      feuille,
      status: 'ok',
      features: features.map(f => ({...f, feuille}))
    }
  } catch (err) {
    if (err.message === 'THF file not found') {
      console.log('Warning: THF file not found for %s', filePath)
      return {feuille, status: 'ignored'}
    }
    throw err
  }
}

module.exports = extractCommune
