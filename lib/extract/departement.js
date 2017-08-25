'use strict'

const { EventEmitter } = require('events')

const Promise = require('bluebird')
const decompress = require('decompress')
const { sortBy } = require('lodash')

const extractFeuille = require('./feuille')


function extractDepartement(path, codeDep) {
  const extractor = new EventEmitter()

  extractor.extracted = 0

  function progress({ feuille, status, features }) {
    extractor.extracted++
    extractor.emit('feuille', { feuille, status, features })
  }

  decompress(path, { strip: 5 })
    .then(files => {
      /* Progression */
      extractor.total = files.length
      extractor.emit('start')

      const sortedFiles = sortBy(files, 'path')

      // Series since GDAL is a blocking binding
      return Promise.mapSeries(sortedFiles, async file => {
        const result = await handleFeuilleFile(file, codeDep)
        progress(result)
      })
    })
    .then(() => extractor.emit('end'))
    .catch(err => extractor.emit('error', err))

  return extractor
}

async function handleFeuilleFile(file, codeDep) {
  const { codeCommune, feuille } = parseFeuilleFileName(file.path, codeDep)

  if (file.data.length < 4096) {
    return { feuille, status: 'ignored' }
  }

  try {
    const features = await extractFeuille(file)
    return {
      feuille,
      status: 'ok',
      features: features.map(f => ({ ...f, codeCommune, feuille, codeDep })),
    }
  } catch (err) {
    if (err.message === 'THF file not found') {
      console.log('Warning: THF file not found for %s', file.path)
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
