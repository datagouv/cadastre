'use strict'

const { join } = require('path')
const { promisify } = require('util')

const Promise = require('bluebird')
const mkdirp = require('mkdirp')

const mkdirpAsync = promisify(mkdirp)

const { createGeoJSONWritableStream } = require('../util/geo')

const {
  prepareParcelle,
  prepareBatiment,
  prepareSection,
  prepareCommune,
  prepareFeuille,
} = require('../models')

class FilesStorage {
  constructor(baseDir, writeRaw = false) {
    this.baseDir = baseDir
    this.streams = {}
    this.uniqueIndex = new Set()
    this.currentCodeCommune = null
    this.currentCommuneStreams = []
    this.writeRaw = writeRaw
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

    const streamId = `${levelType}/${levelId}/${layerName}`
    const directory = join(this.baseDir, levelType, levelId)
    const filePath = join(directory, layerName + '.json.gz')

    if (!(streamId in this.streams)) {
      await mkdirpAsync(directory)
      const stream = createGeoJSONWritableStream(filePath)
        .on('error', boom)
        .on('finish', () => {
          this.streams[streamId].finished = true
          this.eventuallyFinish()
        })
      this.streams[streamId] = {
        stream,
        finished: false,
      }
      this.currentCommuneStreams.push(stream)
    }
    if (this.streams[streamId].finished) throw new Error(`Stream ${streamId} is already closed`)
    return this.streams[streamId].stream
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

  handleFeuille(feuille, features) {
    const codeCommune = feuille.substr(0, 5)
    if (this.currentCodeCommune && this.currentCodeCommune !== codeCommune) {
      this.currentCodeCommune = codeCommune
      this.currentCommuneStreams.forEach(s => s.end())
      this.currentCommuneStreams = []
    }
    features.forEach(f => this.handleFeature(f))
  }

  handleFeature(feature) {
    const { codeDep, codeCommune } = feature

    switch (feature.layer) {
      case 'commune': {
        const commune = prepareCommune(feature)
        if (this.registerUnique(commune)) {
          this.addToLayer(commune, 'communes', codeDep)
          if (this.writeRaw) {
            this.addToLayer(feature, 'raw_' + feature.layer, codeDep, codeCommune)
          }
        }
        break
      }
      case 'section': {
        const section = prepareSection(feature)
        if (this.registerUnique(section)) {
          this.addToLayer(section, 'sections', codeDep, codeCommune)
          if (this.writeRaw) {
            this.addToLayer(feature, 'raw_' + feature.layer, codeDep, codeCommune)
          }
        }
        break
      }
      case 'feuille': {
        const feuille = prepareFeuille(feature)
        this.addToLayer(feuille, 'feuilles', codeDep, codeCommune)
        if (this.writeRaw) {
          this.addToLayer(feature, 'raw_' + feature.layer, codeDep, codeCommune)
        }
        break
      }
      case 'parcelle': {
        const parcelle = prepareParcelle(feature)
        this.addToLayer(parcelle, 'parcelles', codeDep, codeCommune)
        if (this.writeRaw) {
          this.addToLayer(feature, 'raw_' + feature.layer, codeDep, codeCommune)
        }
        break
      }
      case 'batiment': {
        const batiment = prepareBatiment(feature)
        this.addToLayer(batiment, 'batiments', codeDep, codeCommune)
        if (this.writeRaw) {
          this.addToLayer(feature, 'raw_' + feature.layer, codeDep, codeCommune)
        }
        break
      }
      default: {
        if (this.writeRaw) {
          this.addToLayer(feature, 'raw_' + feature.layer, codeDep, codeCommune)
        }
      }
    }
  }

  getActiveStreams() {
    return Object.keys(this.streams)
      .map(key => this.streams[key])
      .filter(stream => !stream.finished)
      .map(stream => stream.stream)
  }

  eventuallyFinish() {
    if (this.getActiveStreams().length === 0 && this.finished) {
      this.finished()
    }
  }

  finish() {
    this.finishing = new Promise(resolve => {
      this.finished = resolve

      this.getActiveStreams()
        .map(stream => stream.end())
    })
    return this.finishing
  }
}

function boom(err) {
  throw err
}

module.exports = FilesStorage
