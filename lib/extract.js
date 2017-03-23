const inside = require('@turf/inside')
const { values, keyBy } = require('lodash')
const fs = require('fs')
const Promise = require('bluebird')
const { parsePackage } = require('./edigeo')
const { extractFeatures } = require('./gdal')
const rimraf = require('rimraf')
const decompress = require('decompress')

const TMP_DIR = require('os').tmpdir()

const rimrafAsync = Promise.promisify(rimraf)
const mkdtempAsync = Promise.promisify(fs.mkdtemp)
const readdirAsync = Promise.promisify(fs.readdir)

function getFileSize(path) {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err, stat) => {
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
  const thfFile = fs.readdirSync(path).find(fn => fn.toUpperCase().endsWith('.THF'))
  if (!thfFile) throw new Error('THF file not found in package directory')
  return path + '/' + thfFile
}

function extractFromPackage(path, writer) {
  const THFFilePath = getTHFFilePath(path)

  return parsePackage(path)
    .then(package => {
      return extractFeatures(THFFilePath, package.srsCode)
        .then(features => {
          const indexedFeatures = keyBy(features, 'id')
          expandNumvoie(indexedFeatures, package.items)
          features.forEach(f => writer.writeFeature(f))
          return features
        })
    })
}

function extractFromArchive(path, writer) {
  return mkdtempAsync(TMP_DIR + '/cadastre-pkg-')
    .then(tmpPath => {
      return Promise.resolve(decompress(path, tmpPath))
        .then(() => extractFromPackage(tmpPath, writer))
        .finally(() => rimrafAsync(tmpPath))
    })
}

function extractFromBundle(path, writer) {
  return mkdtempAsync(TMP_DIR + '/cadastre-bundle-')
    .then(tmpPath => {
      return Promise.resolve(decompress(path, tmpPath, { strip: 5 }))
        .then(files => {
          /* Progression */
          const total = files.length
          let count = 0

          function progress(filePath) {
            console.log('extracting %s [%d/%d] (%s%%)', filePath, ++count, total, ((count/total) * 100).toFixed(2))
          }

          function ignore(filePath) {
            console.log('ignoring %s [%d/%d] (%s%%)', filePath, ++count, total, ((count/total) * 100).toFixed(2))
          }

          return Promise.mapSeries(files, file => {
            const filePath = tmpPath + '/' + file.path
            return getFileSize(filePath)
              .then(fileSize => {
                if (file < 4096) {
                  ignore(file.path)
                  return
                } else {
                  progress(file.path)
                  return extractFromArchive(filePath, writer)
                    .catch(err => {
                      if (err.message === 'THF file not found in package directory') {
                        console.log('Warning: THF file not for for %s', file.path)
                        return
                      }
                      throw err
                    })
                    .thenReturn()
                }
              })
          })
        })
        .finally(() => rimrafAsync(tmpPath))
    })
}

module.exports = { extractFromPackage, extractFromArchive, extractFromBundle }
