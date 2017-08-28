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


function extractDepartement(baseSrcPath, codeDep) {
  const extractor = new EventEmitter()
  const depSrcPath = join(baseSrcPath, 'departements', codeDep)

  extractor.extracted = 0

  function progress({ feuille, status, features }) {
    extractor.extracted++
    extractor.emit('feuille', { feuille, status, features })
  }

  readdirAsync(depSrcPath)
    .then(files => {
      /* Progression */
      extractor.total = files.length
      extractor.emit('start')

      const sortedFilesPaths = files.sort()

      // Series since GDAL is a blocking binding
      return Promise.mapSeries(sortedFilesPaths, filePath => {
        return handleFeuilleFile(filePath, depSrcPath, codeDep)
          .then(progress)
      })
    })
    .then(() => extractor.emit('end'))
    .catch(err => extractor.emit('error', err))

  return extractor
}

async function handleFeuilleFile(filePath, baseDir, codeDep) {
  debug('handle feuille %s', filePath)
  const { codeCommune, feuille } = parseFeuilleFileName(filePath, codeDep)
  const fileFullPath = join(baseDir, filePath)
  const fileSize = await statAsync(fileFullPath).size

  if (fileSize < 4096) {
    return { feuille, status: 'ignored' }
  }

  try {
    const features = await extractFeuille(fileFullPath)
    return {
      feuille,
      status: 'ok',
      features: features.map(f => ({ ...f, codeCommune, feuille, codeDep })),
    }
  } catch (err) {
    if (err.message === 'THF file not found') {
      console.log('Warning: THF file not found for %s', filePath)
      return { feuille, status: 'ignored' }
    }
    throw err
  }
}

function parseFeuilleFileName(fileName, codeDep) {
  const codeCommune = (codeDep.startsWith('97') ? '97' : codeDep) + fileName.substr(8, 3)
  const prefix = fileName.substr(11, 3)
  const feuille = fileName.substr(14, 4)

  return {
    codeCommune,
    prefix,
    feuille: codeCommune + prefix + feuille,
  }
}

module.exports = extractDepartement
