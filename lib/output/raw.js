'use strict'

const {join} = require('path')

const Promise = require('bluebird')

const {createCompactGeoJSONWriteStream} = require('../util/geo')

class FilesStorage {
  constructor(outputDir, layers) {
    this.outputDir = outputDir
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
    const filePath = join(this.outputDir, fileName + '.json.gz')

    if (!(fileName in this.streams)) {
      this.streams[fileName] = createCompactGeoJSONWriteStream(filePath).on('error', boom)
    }
    return this.streams[fileName]
  }

  writeTo(feature, fileName) {
    this.getStream(fileName).write(feature)
  }

  handleFeuille(feuille, features) {
    features.forEach(f => this.handleFeature(f))
  }

  handleFeature({layer, properties, geometry}) {
    if (this.layers && !this.layers.includes(layer)) return
    if (!['commune', 'section'].includes(layer) || this.registerUnique(properties.IDU)) {
      this.writeTo({type: 'Feature', geometry, properties}, layer)
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
