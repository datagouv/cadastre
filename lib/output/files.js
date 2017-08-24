const Promise = require('bluebird')
const moment = require('moment')
const { area } = require('@turf/turf')

const { createGeoJSONWritableStream } = require('../util/geo')

class FilesStorage {
  constructor(dest) {
    this.dest = dest
    this.layers = {}
    this.writtenCommunes = new Set()
    this.writtenSections = new Set()
  }

  getLayer(layerName) {
    if (!(layerName in this.layers)) {
      this.layers[layerName] = createGeoJSONWritableStream(this.dest + '/' + layerName + '.json.gz')
    }
    return this.layers[layerName]
  }

  writeFeature(feature) {
    if (feature.layer === 'commune') return this.writeCommune(feature)
    if (feature.layer === 'lieudit') return this.writeLieuDit(feature)
    if (feature.layer === 'section') return this.writeSection(feature)
    if (feature.layer === 'subdsect') return this.writePlanche(feature)
    if (feature.layer === 'parcelle') return this.writeParcelle(feature)
    if (feature.layer === 'batiment') return this.writeBatiment(feature)
    this.writeDefault(feature)
  }

  writeCommune({ properties, geometry }) {
    const inseeCode = properties.IDU
    if (!this.writtenCommunes.has(inseeCode)) {
      this.writtenCommunes.add(inseeCode)
      this.getLayer('communes').write({ type: 'Feature', geometry, properties })
    }
  }

  writeLieuDit(feature) {
    this.writeDefault(feature)
  }

  writeSection({ properties, geometry }) {
    if (!this.writtenSections.has(properties.IDU)) {
      this.writtenSections.add(properties.IDU)
      this.getLayer('sections').write({ type: 'Feature', geometry, properties })
    }
  }

  writePlanche(feature) {
    this.writeDefault(feature)
  }

  writeParcelle({ codeDep, properties, geometry }) {
    const parcelleProperties = {
      idu: codeDep.substr(0, 2) + properties.IDU,
      surface: Math.round(area({ type: 'Feature', properties, geometry })),
      creation: moment(properties.CREAT_DATE, 'YYYYMMDD').format('YYYY-MM-DD'),
      modification: moment(properties.UPDATE_DATE, 'YYYYMMDD').format('YYYY-MM-DD'),
    }
    this.getLayer('parcelles').write({
      type: 'Feature',
      properties: parcelleProperties,
      geometry,
    })
  }

  writeBatiment({ properties, geometry }) {
    const batimentProperties = {}
    if (properties.TEX) batimentProperties.nom = properties.TEX
    Object.assign(batimentProperties, {
      type: properties.DUR === '01' ? 1 : 2,
      creation: moment(properties.CREAT_DATE, 'YYYYMMDD').format('YYYY-MM-DD'),
      modification: moment(properties.UPDATE_DATE, 'YYYYMMDD').format('YYYY-MM-DD'),
    })
    this.getLayer('batiments').write({
      type: 'Feature',
      properties: batimentProperties,
      geometry,
    })
  }

  writeDefault({ layer, geometry, properties }) {
    this.getLayer(layer).write({ type: 'Feature', geometry, properties })
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
