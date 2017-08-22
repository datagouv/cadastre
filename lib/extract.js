const { mkdtemp, stat } = require('fs')
const { EventEmitter } = require('events')
const { tmpdir } = require('os')
const { promisify } = require('util')

const Promise = require('bluebird')
const rimraf = require('rimraf')
const decompress = require('decompress')

const extractLot = require('./extract/lot')

const TMP_DIR = tmpdir()

const rimrafAsync = promisify(rimraf)
const mkdtempAsync = promisify(mkdtemp)
const statAsync = promisify(stat)


async function getFileSize(path) {
  const stats = await statAsync(path)
  return stats.size
}

function parseLotFileName(fileName, codeDep) {
  const codeCommune = (codeDep.startsWith('97') ? '97' : codeDep) + fileName.substr(8, 3)
  const prefix = fileName.substr(11, 3)
  const planche = fileName.substr(14, 4)

  return {
    codeCommune,
    prefix,
    planche: codeCommune + prefix + planche,
  }
}

function extractFromBundle(path, writer, codeDep) {
  const converter = new EventEmitter()

  mkdtempAsync(TMP_DIR + '/cadastre-bundle-')
    .then(tmpPath => {
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
            const { codeCommune, planche } = parseLotFileName(file.path, codeDep)
            const filePath = tmpPath + '/' + file.path
            return getFileSize(filePath)
              .then(fileSize => {
                if (fileSize < 4096) {
                  ignore(file.path)
                } else {
                  return extractLot({
                    path: filePath,
                    onFeature: f => writer.writeFeature(f),
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
          rimrafAsync(tmpPath).catch(console.error)
          throw err
        })
        .then(() => {
          rimrafAsync(tmpPath).catch(console.error)
          converter.emit('end')
        })
    })

  return converter
}

module.exports = { extractFromBundle }
