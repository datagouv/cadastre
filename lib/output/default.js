'use strict'

const { join } = require('path')

const Promise = require('bluebird')

const { createPolygonWriteStream } = require('../util/geo')
const models = require('../models')

const layersHandlers = {
  commune: { model: models.prepareCommune, unique: true, fileName: 'communes' },
  section: { model: models.prepareSection, unique: true, fileName: 'sections' },
  subdsect: { model: models.prepareFeuille, fileName: 'feuilles' },
  parcelle: { model: models.prepareParcelle, fileName: 'parcelles' },
  batiment: { model: models.prepareBatiment, fileName: 'batiments' },
}

class FilesStorage {
  constructor(outputDir) {
    this.outputDir = outputDir
    this.streams = {}
    this.uniqueIndex = new Set()
  }

  registerUnique(id) {
    if (this.uniqueIndex.has(id)) return false
    this.uniqueIndex.add(id)
    return true
  }

  getStream(fileName) {
    const filePath = join(this.outputDir, fileName + '.json.gz')

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
    const handler = this.layersHandlers[feature.layer]
    if (handler) return
    const obj = handler.model(feature)

    if (!handler.unique || this.registerUnique(obj.id)) {
      this.writeTo(obj, handler.fileName)
    }
  }

  finish() {
    return new Promise((resolve, reject) => {
      let openStreams = Object.keys(this.streams).length
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
