const Promise = require('bluebird')

const { createGeoJSONWritableStream } = require('../util/geo')
const { prepareParcelle, prepareBatiment, prepareSection, prepareCommune } = require('../models')

class FilesStorage {
  constructor(dest) {
    this.dest = dest
    this.layers = {}
    this.uniqueIndex = new Set()
  }

  registerUnique({ id }) {
    if (this.uniqueIndex.has(id)) return false
    this.uniqueIndex.add(id)
    return true
  }

  getLayer(layerName) {
    if (!(layerName in this.layers)) {
      this.layers[layerName] = createGeoJSONWritableStream(this.dest + '/' + layerName + '.json.gz')
    }
    return this.layers[layerName]
  }

  addToLayer(layerName, feature) {
    this.getLayer(layerName).write(feature)
  }

  handleFeatures(features) {
    features.forEach(f => this.handleFeature(f))
  }

  handleFeature(feature) {
    switch (feature.layer) {
      case 'commune': {
        const commune = prepareCommune(feature)
        if (this.registerUnique(commune)) {
          this.addToLayer('communes', commune)
        }
        break
      }
      case 'section': {
        const section = prepareSection(feature)
        if (this.registerUnique(section)) {
          this.addToLayer('sections', section)
        }
        break
      }
      case 'parcelle': {
        const parcelle = prepareParcelle(feature)
        this.addToLayer('parcelles', parcelle)
        break
      }
      case 'batiment': {
        const batiment = prepareBatiment(feature)
        this.addToLayer('batiments', batiment)
        break
      }
      default: {
        this.addToLayer(feature.layer, feature)
      }
    }
  }

  finish() {
    return new Promise((resolve, reject) => {
      const keys = Object.keys(this.layers)
      let count = keys.length
      const streams = keys.map(key => this.layers[key])
      streams.forEach(stream => {
        stream.on('finish', () => {
          count--
          if (count === 0) resolve()
        })
        stream.on('error', reject)
        stream.end()
      })
    })
  }

}

module.exports = FilesStorage
