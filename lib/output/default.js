'use strict'

const {join} = require('path')

const Promise = require('bluebird')

const {createPolygonWriteStream} = require('../util/geo')
const {ensureDirectoryExists} = require('../util/fs')
const models = require('../convert/pci')

const layersHandlers = {
  COMMUNE: {renamedInto: 'communes', model: models.prepareCommune, unique: true},
  SECTION: {renamedInto: 'sections', model: models.prepareSection, unique: true},
  SUBDSECT: {renamedInto: 'feuilles', model: models.prepareFeuille, unique: true},
  PARCELLE: {renamedInto: 'parcelles', model: models.prepareParcelle, unique: true, warnDuplicates: true},
  BATIMENT: {renamedInto: 'batiments', model: models.prepareBatiment},
  LIEUDIT: {renamedInto: 'lieux_dits', model: models.prepareLieuDit}
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
    const targetLayerName = handler.renamedInto
    if (this.layers && !this.layers.include(targetLayerName)) return

    try {
      const obj = handler.model(feature)
      if (handler.unique) {
        if (this.registerUnique(obj.id)) {
          this.writeTo(obj, targetLayerName)
        } else if (handler.warnDuplicates) {
          console.log(`Duplicates ${targetLayerName}: ${obj.id}`)
        }
      } else {
        this.writeTo(obj, targetLayerName)
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

async function createWriter(destPath, prefix, layers) {
  await ensureDirectoryExists(destPath)
  return new FilesStorage(destPath, prefix, layers)
}

module.exports = {createWriter}
