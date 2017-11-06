'use strict'

const {EventEmitter} = require('events')

const Promise = require('bluebird')
const debug = require('debug')('cadastre')

const {stat} = require('../util/fs')

const extractFeuille = require('./feuille')

function extractCommune(edigeoTree, codeCommune) {
  const extractor = new EventEmitter()

  extractor.extracted = 0

  function progress({feuille, status, features}) {
    extractor.extracted++
    extractor.emit('feuille', {feuille, status, features})
  }

  edigeoTree.listFeuillesByCommune(codeCommune)
    .then(feuilles => {
      /* Progression */
      extractor.total = feuilles.length
      extractor.emit('start')

      // Series since GDAL is a blocking binding
      return Promise.mapSeries(feuilles, feuille => {
        return handleFeuille(edigeoTree, feuille)
          .then(progress)
      })
    })
    .then(() => extractor.emit('end'))
    .catch(err => extractor.emit('error', err))

  return extractor
}

async function handleFeuille(edigeoTree, feuille) {
  debug('handle feuille %s', feuille)
  const filePath = edigeoTree.getFeuillePath(feuille)
  const fileSize = await stat(filePath).size

  if (fileSize < 4096) {
    return {feuille, status: 'ignored'}
  }

  try {
    const features = await extractFeuille(edigeoTree, feuille)
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
