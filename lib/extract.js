const { readdirSync, mkdtemp, stat } = require('fs')
const { EventEmitter } = require('events')
const { tmpdir } = require('os')
const { promisify } = require('util')

const { inside } = require('@turf/turf')
const { values, keyBy } = require('lodash')
const Promise = require('bluebird')
const rimraf = require('rimraf')
const decompress = require('decompress')

const { parsePackage } = require('./edigeo')
const { extractFeatures } = require('./gdal')

const TMP_DIR = tmpdir()

const rimrafAsync = promisify(rimraf)
const mkdtempAsync = promisify(mkdtemp)

function getFileSize(path) {
  return new Promise((resolve, reject) => {
    stat(path, (err, stat) => {
      if (err) return reject(err)
      resolve(stat.size)
    })
  })
}

function expandNumvoie(indexedFeatures, packageEntries) {
  values(packageEntries)
    .filter(obj => obj.associationType === 'NUMVOIE_PARCELLE' && obj.type === 'LNK')
    .forEach(numvoieParcelleRelation => {
      const relatedObjects = numvoieParcelleRelation.relatedObjects.map(id => packageEntries[id])

      const parcelle = relatedObjects.find(obj => obj.objectType === 'PARCELLE_id')
      const numvoie = relatedObjects.find(obj => obj.objectType === 'NUMVOIE_id')

      const numvoieFeature = indexedFeatures[numvoie.id]
      const parcelleFeature = indexedFeatures[parcelle.id]

      numvoieFeature.properties.PARCELLE_IDU = parcelle.attributes.IDU_id
      numvoieFeature.properties.PARCELLE_CONTAINS = inside(numvoieFeature, parcelleFeature)
    })
}

function getTHFFilePath(path) {
  const thfFile = readdirSync(path).find(fn => fn.toUpperCase().endsWith('.THF'))
  if (!thfFile) throw new Error('THF file not found in package directory')
  return path + '/' + thfFile
}

async function extractFromPackage(path, writer, depCode) {
  const THFFilePath = getTHFFilePath(path)
  const pkg = await parsePackage(path)
  const features = await extractFeatures(THFFilePath, pkg.srsCode, depCode)
  const indexedFeatures = keyBy(features, 'id')
  expandNumvoie(indexedFeatures, pkg.items)
  features.forEach(f => writer.writeFeature(f))
}

async function extractFromArchive(path, writer, depCode) {
  let tmpPath
  try {
    tmpPath = await mkdtempAsync(TMP_DIR + '/cadastre-pkg-')
    await decompress(path, tmpPath)
    await extractFromPackage(tmpPath, writer, depCode)
  } catch (err) {
    throw err
  } finally {
    if (tmpPath) {
      rimrafAsync(tmpPath).catch(console.error)
    }
  }
}

function extractFromBundle(path, writer, depCode) {
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
            const filePath = tmpPath + '/' + file.path
            return getFileSize(filePath)
              .then(fileSize => {
                if (fileSize < 4096) {
                  ignore(file.path)
                } else {
                  return extractFromArchive(filePath, writer, depCode)
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

module.exports = { extractFromPackage, extractFromArchive, extractFromBundle }
