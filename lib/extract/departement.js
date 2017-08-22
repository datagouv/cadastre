'use strict'

const { EventEmitter } = require('events')

const Promise = require('bluebird')
const decompress = require('decompress')

const extractPlanche = require('./planche')


function extractDepartement(path, codeDep) {
  const extractor = new EventEmitter()

  extractor.extracted = 0

  function progress({ planche, status, features }) {
    extractor.extracted++
    extractor.emit('planche', { planche, status, features })
  }

  decompress(path, { strip: 5 })
    .then(files => {
      /* Progression */
      extractor.total = files.length
      extractor.emit('start')

      return Promise.mapSeries(files, async file => {
        const result = await handlePlancheFile(file, codeDep)
        progress(result)
      })
    })
    .then(() => extractor.emit('end'))
    .catch(err => extractor.emit('error', err))

  return extractor
}

async function handlePlancheFile(file, codeDep) {
  const { codeCommune, planche } = parsePlancheFileName(file.path, codeDep)

  if (file.data.length < 4096) {
    return { planche, status: 'ignored' }
  }

  try {
    const features = await extractPlanche(file, {
      codeDep,
      codeCommune,
      planche,
    })
    return { planche, status: 'ok', features }
  } catch (err) {
    if (err.message === 'THF file not found') {
      console.log('Warning: THF file not found for %s', file.path)
      return { planche, status: 'ignored' }
    }
    throw err
  }
}

function parsePlancheFileName(fileName, codeDep) {
  const codeCommune = (codeDep.startsWith('97') ? '97' : codeDep) + fileName.substr(8, 3)
  const prefix = fileName.substr(11, 3)
  const planche = fileName.substr(14, 4)

  return {
    codeCommune,
    prefix,
    planche: codeCommune + prefix + planche,
  }
}

module.exports = extractDepartement
