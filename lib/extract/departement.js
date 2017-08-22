'use strict'

const { EventEmitter } = require('events')
const { stat } = require('fs')
const { promisify } = require('util')

const Promise = require('bluebird')
const decompress = require('decompress')

const { createTempDirectory } = require('../util/tmpdir')

const extractPlanche = require('./planche')

const statAsync = promisify(stat)


function extractDepartement({ path, codeDep, onFeature }) {
  const converter = new EventEmitter()

  createTempDirectory()
    .then(tmpDir => {
      const tmpPath = tmpDir.path
      return decompress(path, tmpPath, { strip: 5 })
        .then(files => {
          /* Progression */
          converter.total = files.length
          converter.converted = 0
          converter.emit('start')

          function progress(filePath) {
            converter.converted++
            converter.emit('file:converted', filePath)
          }

          function ignore(filePath) {
            converter.converted++
            converter.emit('file:ignored', filePath)
          }

          return Promise.mapSeries(files, file => {
            const { codeCommune, planche } = parsePlancheFileName(file.path, codeDep)
            const filePath = tmpPath + '/' + file.path
            return getFileSize(filePath)
              .then(fileSize => {
                if (fileSize < 4096) {
                  ignore(file.path)
                } else {
                  return extractPlanche({
                    path: filePath,
                    onFeature,
                    codeDep,
                    codeCommune,
                    planche,
                  })
                    .then(() => progress(file.path))
                    .catch(err => {
                      if (err.message === 'THF file not found in package directory') {
                        console.log('Warning: THF file not for for %s', file.path)
                        return
                      }
                      throw err
                    })
                    .then(() => {})
                }
              })
          })
        })
        .catch(err => {
          tmpDir.clean().catch(console.error)
          throw err
        })
        .then(() => tmpDir.clean())
        .then(() => {
          converter.emit('end')
        })
    })

  return converter
}

async function getFileSize(path) {
  const stats = await statAsync(path)
  return stats.size
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
