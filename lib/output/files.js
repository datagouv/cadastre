'use strict'

const { join } = require('path')
const { promisify } = require('util')

const Promise = require('bluebird')
const mkdirp = require('mkdirp')

const mkdirpAsync = promisify(mkdirp)

const { createBufferedGeoJSONWriteStream } = require('../util/geo')

const {
  prepareParcelle,
  prepareBatiment,
  prepareSection,
  prepareCommune,
  prepareFeuille,
} = require('../models')

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
      this.streams[streamId] = createBufferedGeoJSONWriteStream(
        join(directory, layerName + '.json.gz'),
        this.onStreamFinish.bind(this)
      )
    }
    return this.streams[streamId]
  }

  addToLayer(feature, layerName, codeDep, codeCommune) {
    this.getStream('departements', codeDep, layerName)
      .then(s => s.write(feature))
      .catch(boom)

    if (codeCommune) {
      this.getStream('communes', codeCommune, layerName)
        .then(s => s.write(feature))
        .catch(boom)
    }
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
          this.addToLayer(feature, 'raw_' + feature.layer, codeDep, codeCommune)
        }
        break
      }
      case 'section': {
        const section = prepareSection(feature)
        if (this.registerUnique(section)) {
          this.addToLayer(section, 'sections', codeDep, codeCommune)
          this.addToLayer(feature, 'raw_' + feature.layer, codeDep, codeCommune)
        }
        break
      }
      case 'feuille': {
        const feuille = prepareFeuille(feature)
        this.addToLayer(feuille, 'feuilles', codeDep, codeCommune)
        this.addToLayer(feature, 'raw_' + feature.layer, codeDep, codeCommune)
        break
      }
      case 'parcelle': {
        const parcelle = prepareParcelle(feature)
        this.addToLayer(parcelle, 'parcelles', codeDep, codeCommune)
        this.addToLayer(feature, 'raw_' + feature.layer, codeDep, codeCommune)
        break
      }
      case 'batiment': {
        const batiment = prepareBatiment(feature)
        this.addToLayer(batiment, 'batiments', codeDep, codeCommune)
        this.addToLayer(feature, 'raw_' + feature.layer, codeDep, codeCommune)
        break
      }
      default: {
        this.addToLayer(feature, 'raw_' + feature.layer, codeDep, codeCommune)
      }
    }
  }

  onStreamFinish(err) {
    if (err) boom(err)

    this.openStreams--
    if (this.openStreams === 0) {
      this.finished()
    }
  }

  finish() {
    this.finishing = new Promise(resolve => {
      const keys = Object.keys(this.streams)

      this.openStreams = keys.length
      this.finished = resolve

      keys
        .map(key => this.streams[key])
        .forEach(stream => stream.end())
    })
    return this.finishing
  }

}

function boom(err) {
  throw err
}

module.exports = FilesStorage
