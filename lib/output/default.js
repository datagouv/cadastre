'use strict'

const {join} = require('path')

const Promise = require('bluebird')

const {createPolygonWriteStream} = require('../util/geo')
const models = require('../convert/pci')

const layersHandlers = {
  communes: {model: models.prepareCommune, unique: true},
  sections: {model: models.prepareSection, unique: true},
  feuilles: {model: models.prepareFeuille, unique: true},
  parcelles: {model: models.prepareParcelle, unique: true, warnDuplicates: true},
  batiments: {model: models.prepareBatiment}
}

class FilesStorage {
  constructor(outputDir, prefix, layers) {
    this.outputDir = outputDir
    this.prefix = prefix
    this.layers = layers
    this.streams = {}
    this.uniqueIndex = new Set()
  }

  registerUnique(id) {
    if (this.uniqueIndex.has(id)) return false
    this.uniqueIndex.add(id)
    return true
  }

  getStream(fileName) {
    const filePath = join(this.outputDir, this.prefix + fileName + '.json.gz')

    if (!(fileName in this.streams)) {
      this.streams[fileName] = createPolygonWriteStream(filePath).on('error', boom)
    }
    return this.streams[fileName]
  }

  writeTo(feature, fileName) {
    this.getStream(fileName).write(feature)
  }

  handleFeuille(feuille, features) {
    features.forEach(f => this.handleFeature(f))
  }

  handleFeature(feature) {
    const handler = layersHandlers[feature.layer]
    if (!handler) return
    if (this.layers && !this.layers.include(feature.layer)) return

    try {
      const obj = handler.model(feature)
      if (handler.unique) {
        if (this.registerUnique(obj.id)) {
          this.writeTo(obj, feature.layer)
        } else if (handler.warnDuplicates) {
          console.log(`Duplicates ${feature.layer}: ${obj.id}`)
        }
      } else {
        this.writeTo(obj, feature.layer)
      }
    } catch (err) {
      console.log(err.message)
    }
  }

  finish() {
    return new Promise((resolve, reject) => {
      let openStreams = Object.keys(this.streams).length
      if (openStreams === 0) return resolve()
      Object.keys(this.streams).forEach(fileName => {
        const stream = this.streams[fileName]
        stream.on('error', reject)
        stream.on('finish', () => {
          openStreams--
          if (openStreams === 0) {
            resolve()
          }
        })
        stream.end()
      })
    })
  }
}

function boom(err) {
  throw err
}

module.exports = FilesStorage
