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
    const { layer, geometry, properties, depCode } = feature

    if (layer === 'commune') {
      const inseeCode = properties.IDU
      if (!this.writtenCommunes.has(inseeCode)) {
        this.writtenCommunes.add(inseeCode)
        this.getInputStream(layer).write({ type: 'Feature', geometry, properties })
      }
    } else if (layer === 'section') {
      if (!this.writtenSections.has(properties.IDU)) {
        this.writtenSections.add(properties.IDU)
        this.getInputStream(layer).write({ type: 'Feature', geometry, properties })
      }
    } else if (layer === 'batiment') {
      const batimentProperties = {}
      if (properties.TEX) batimentProperties.nom = properties.TEX
      Object.assign(batimentProperties, {
        type: properties.DUR === '01' ? 1 : 2,
        creation: moment(properties.CREAT_DATE, 'YYYYMMDD').format('YYYY-MM-DD'),
        modification: moment(properties.UPDATE_DATE, 'YYYYMMDD').format('YYYY-MM-DD'),
      })
      this.getInputStream(layer).write(truncate({
        type: 'Feature',
        properties: batimentProperties,
        geometry,
      }))
    } else if (layer === 'parcelle') {
      const parcelleProperties = {
        idu: depCode.substr(0, 2) + properties.IDU,
        surface: Math.round(area(feature)),
        creation: moment(properties.CREAT_DATE, 'YYYYMMDD').format('YYYY-MM-DD'),
        modification: moment(properties.UPDATE_DATE, 'YYYYMMDD').format('YYYY-MM-DD'),
      }
      this.getInputStream(layer).write(truncate({
        type: 'Feature',
        properties: parcelleProperties,
        geometry,
      }))
    } else {
      this.getInputStream(layer).write({ type: 'Feature', geometry, properties })
    }
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
