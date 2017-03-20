const fs = require('fs')
const zlib = require('zlib')
const JSONStream = require('JSONStream')
const Promise = require('bluebird')

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
  }

  getInputStream(streamName) {
    if (!(streamName in this._streams)) {
      this._streams[streamName] = createGeoJSONWritableStream(this.dest + '/' + streamName + '.json.gz')
    }
    return this._streams[streamName].input
  }

  writeFeature(feature) {
    if (feature.layer === 'commune') {
      const inseeCode = feature.properties.IDU
      if (!this.writtenCommunes.has(inseeCode)) {
        this.writtenCommunes.add(inseeCode)
        this.getInputStream(feature.layer).write(feature)
      }
    } else {
      this.getInputStream(feature.layer).write(feature)
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
