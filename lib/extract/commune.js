'use strict'

const {EventEmitter} = require('events')

const Promise = require('bluebird')
const debug = require('debug')('cadastre')

const {stat} = require('../util/fs')

const extractFeuille = require('./feuille')

function extractCommune(edigeoTree, codeCommune) {
  const extractor = new EventEmitter()

  extractor.extracted = 0

  function progress({feuille, status, reason, features}) {
    extractor.extracted++
    extractor.emit('feuille', {feuille, reason, status, features})
  }

  edigeoTree.listFeuillesByCommune(codeCommune)
    .then(feuilles => {
      /* Progression */
      extractor.total = feuilles.length
      extractor.emit('start')

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
    return {feuille, status: 'ignored', reason: 'Empty EDIGÉO bundle'}
  }

  try {
    const features = await extractFeuille(edigeoTree, feuille)
    return {
      feuille,
      status: 'ok',
      features: features.map(f => ({...f, feuille}))
    }
  } catch (err) {
    if (err.message === 'Missing required files in EDIGÉO bundle') {
      return {feuille, status: 'ignored', reason: err.message}
    }
    throw err
  }
}

module.exports = extractCommune
