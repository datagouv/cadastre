const fs = require('fs')
const zlib = require('zlib')
const JSONStream = require('JSONStream')
const Promise = require('bluebird')
const moment = require('moment')
const { truncate, area } = require('@turf/turf')

const GEOJSON = {
  open: '{"type":"FeatureCollection","features":[\n',
  separator: ',\n',
  close: ']}',
}

function createGeoJSONWritableStream(path) {
  const input = JSONStream.stringify(GEOJSON.open, GEOJSON.separator, GEOJSON.close)
  const output = fs.createWriteStream(path)

  input.pipe(zlib.createGzip()).pipe(output)

  return { input, output }
}

class FilesStorage {
  constructor(dest) {
    this.dest = dest
    this._streams = {}
    this.writtenCommunes = new Set()
    this.writtenSections = new Set()
  }

  getInputStream(streamName) {
    if (!(streamName in this._streams)) {
      this._streams[streamName] = createGeoJSONWritableStream(this.dest + '/' + streamName + '.json.gz')
    }
    return this._streams[streamName].input
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
      this.getInputStream('communes').write({ type: 'Feature', geometry, properties })
    }
  }

  writeLieuDit(feature) {
    this.writeDefault(feature)
  }

  writeSection({ properties, geometry }) {
    if (!this.writtenSections.has(properties.IDU)) {
      this.writtenSections.add(properties.IDU)
      this.getInputStream('sections').write({ type: 'Feature', geometry, properties })
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
    this.getInputStream('parcelles').write(truncate({
      type: 'Feature',
      properties: parcelleProperties,
      geometry,
    }))
  }

  writeBatiment({ properties, geometry }) {
    const batimentProperties = {}
    if (properties.TEX) batimentProperties.nom = properties.TEX
    Object.assign(batimentProperties, {
      type: properties.DUR === '01' ? 1 : 2,
      creation: moment(properties.CREAT_DATE, 'YYYYMMDD').format('YYYY-MM-DD'),
      modification: moment(properties.UPDATE_DATE, 'YYYYMMDD').format('YYYY-MM-DD'),
    })
    this.getInputStream('batiments').write(truncate({
      type: 'Feature',
      properties: batimentProperties,
      geometry,
    }))
  }

  writeDefault({ layer, geometry, properties }) {
    this.getInputStream(layer).write({ type: 'Feature', geometry, properties })
  }

  finish() {
    return new Promise((resolve, reject) => {
      const keys = Object.keys(this._streams)
      let count = keys.length
      const streams = keys.map(key => this._streams[key])
      streams.forEach(stream => {
        stream.output.on('finish', () => {
          count--
          if (count === 0) resolve()
        })
        stream.output.on('error', reject)
        stream.input.end()
      })
    })
  }

}

module.exports = FilesStorage
