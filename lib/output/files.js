'use strict'

const { join } = require('path')

const Promise = require('bluebird')

const { createGeoJSONWritableStream } = require('../util/geo')

const {
  prepareParcelle,
  prepareBatiment,
  prepareSection,
  prepareCommune,
  prepareFeuille,
} = require('../models')

class FilesStorage {
  constructor(outputDir, writeRaw = false) {
    this.outputDir = outputDir
    this.streams = {}
    this.uniqueIndex = new Set()
    this.writeRaw = writeRaw
  }

  registerUnique({ id }) {
    if (this.uniqueIndex.has(id)) return false
    this.uniqueIndex.add(id)
    return true
  }

  getStream(layerName) {
    const filePath = join(this.outputDir, layerName + '.json.gz')

    if (!(layerName in this.streams)) {
      this.streams[layerName] = createGeoJSONWritableStream(filePath).on('error', boom)
    }
    return this.streams[layerName]
  }

  addToLayer(feature, layerName) {
    this.getStream(layerName).write(feature)
  }

  handleFeuille(feuille, features) {
    features.forEach(f => this.handleFeature(f))
  }

  handleFeature(feature) {
    switch (feature.layer) {
      case 'commune': {
        const commune = prepareCommune(feature)
        if (this.registerUnique(commune)) {
          this.addToLayer(commune, 'communes')
          if (this.writeRaw) {
            this.addToLayer(feature, 'raw_' + feature.layer)
          }
        }
        break
      }
      case 'section': {
        const section = prepareSection(feature)
        if (this.registerUnique(section)) {
          this.addToLayer(section, 'sections')
          if (this.writeRaw) {
            this.addToLayer(feature, 'raw_' + feature.layer)
          }
        }
        break
      }
      case 'subdsect': {
        const feuille = prepareFeuille(feature)
        this.addToLayer(feuille, 'feuilles')
        if (this.writeRaw) {
          this.addToLayer(feature, 'raw_' + feature.layer)
        }
        break
      }
      case 'parcelle': {
        const parcelle = prepareParcelle(feature)
        this.addToLayer(parcelle, 'parcelles')
        if (this.writeRaw) {
          this.addToLayer(feature, 'raw_' + feature.layer)
        }
        break
      }
      case 'batiment': {
        const batiment = prepareBatiment(feature)
        this.addToLayer(batiment, 'batiments')
        if (this.writeRaw) {
          this.addToLayer(feature, 'raw_' + feature.layer)
        }
        break
      }
      default: {
        if (this.writeRaw) {
          this.addToLayer(feature, 'raw_' + feature.layer)
        }
      }
    }
  }

  finish() {
    return new Promise((resolve, reject) => {
      let openStreams = Object.keys(this.streams).length
      Object.keys(this.streams).forEach(layerName => {
        const stream = this.streams[layerName]
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
