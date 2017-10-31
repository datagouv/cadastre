'use strict'

const {EventEmitter} = require('events')
const {join} = require('path')

const Promise = require('bluebird')
const debug = require('debug')('cadastre')

const {getCodeDep} = require('../util/codes')
const {stat, readdir} = require('../util/fs')

const extractFeuille = require('./feuille')

function extractCommune(baseSrcPath, codeCommune) {
  const codeDep = getCodeDep(codeCommune)
  const extractor = new EventEmitter()
  const communeSrcPath = join(baseSrcPath, 'departements', codeDep, 'communes', codeCommune)

  extractor.extracted = 0

  function progress({feuille, status, features}) {
    extractor.extracted++
    extractor.emit('feuille', {feuille, status, features})
  }

  readdir(communeSrcPath)
    .then(files => {
      /* Progression */
      extractor.total = files.length
      extractor.emit('start')

      // Series since GDAL is a blocking binding
      return Promise.mapSeries(files, filePath => {
        return handleFeuilleFile(filePath, communeSrcPath, codeDep, codeCommune)
          .then(progress)
      })
    })
    .then(() => extractor.emit('end'))
    .catch(err => extractor.emit('error', err))

  return extractor
}

async function handleFeuilleFile(filePath, baseDir, codeDep, codeCommune) {
  debug('handle feuille %s', filePath)
  const {feuille} = parseFeuilleFileName(filePath)
  const fileFullPath = join(baseDir, filePath)
  const fileSize = await stat(fileFullPath).size

  if (fileSize < 4096) {
    return {feuille, status: 'ignored'}
  }

  try {
    const features = await extractFeuille(fileFullPath, {codeCommune})
    return {
      feuille,
      status: 'ok',
      features: features.map(f => ({...f, codeCommune, feuille, codeDep}))
    }
  } catch (err) {
    if (err.message === 'THF file not found') {
      console.log('Warning: THF file not found for %s', filePath)
      return {feuille, status: 'ignored'}
    }
    throw err
  }
}

function parseFeuilleFileName(fileName) {
  const codeCommune = fileName.substr(0, 5)
  const prefix = fileName.substr(11, 3)
  const feuille = fileName.substr(14, 4)

  return {
    codeCommune,
    prefix,
    feuille: codeCommune + prefix + feuille
  }
}

module.exports = extractCommune
