'use strict'

const { join } = require('path')
const { promisify } = require('util')

const Promise = require('bluebird')
const mkdirp = require('mkdirp')

const mkdirpAsync = promisify(mkdirp)

const { createGeoJSONWritableStream } = require('../util/geo')
const { prepareParcelle, prepareBatiment, prepareSection, prepareCommune } = require('../models')

class FilesStorage {
  constructor(baseDir) {
    this.baseDir = baseDir
    this.streams = {}
    this.uniqueIndex = new Set()
  }

  registerUnique({ id }) {
    if (this.uniqueIndex.has(id)) return false
    this.uniqueIndex.add(id)
    return true
  }

  async getStream(levelType, levelId, layerName) {
    if (!levelType || !levelId || !layerName) {
      throw new Error('Missing parameters to create stream')
    }

    const directory = join(this.baseDir, levelType, levelId)
    const streamId = `${levelType}/${levelId}/${layerName}`

    if (!(streamId in this.streams)) {
      await mkdirpAsync(directory)
      this.streams[streamId] = createGeoJSONWritableStream(join(directory, layerName + '.json.gz'))
    }
    return this.streams[streamId]
  }

  addToLayer(feature, layerName, codeDep, codeCommune) {
    this.getStream('departements', codeDep, layerName)
      .then(s => s.write(feature))
      .catch(boom)

    // if (codeCommune) {
    //   this.getStream('communes', codeCommune, layerName)
    //     .then(s => s.write(feature))
    //     .catch(boom)
    // }
  }

  handleFeatures(features) {
    features.forEach(f => this.handleFeature(f))
  }

  handleFeature(feature) {
    const { codeDep, codeCommune } = feature

    switch (feature.layer) {
      case 'commune': {
        const commune = prepareCommune(feature)
        if (this.registerUnique(commune)) {
          this.addToLayer(commune, 'communes', codeDep)
        }
        break
      }
      case 'section': {
        const section = prepareSection(feature)
        if (this.registerUnique(section)) {
          this.addToLayer(section, 'sections', codeDep, codeCommune)
        }
        break
      }
      case 'parcelle': {
        const parcelle = prepareParcelle(feature)
        this.addToLayer(parcelle, 'parcelles', codeDep, codeCommune)
        break
      }
      case 'batiment': {
        const batiment = prepareBatiment(feature)
        this.addToLayer(batiment, 'batiments', codeDep, codeCommune)
        break
      }
      default: {
        break
        // this.addToLayer(feature, feature.layer, codeDep, codeCommune)
      }
    }
  }

  finish() {
    return new Promise((resolve, reject) => {
      const keys = Object.keys(this.streams)
      let count = keys.length
      const streams = keys.map(key => this.streams[key])
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

function boom(err) {
  throw err
}

module.exports = FilesStorage
