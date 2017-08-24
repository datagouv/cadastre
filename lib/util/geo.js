'use strict'

const { createWriteStream } = require('fs')
const { createGzip } = require('zlib')

const { stringify } = require('JSONStream')
const { pipeline } = require('mississippi')

const GEOJSON = {
  open: '{"type":"FeatureCollection","features":[\n',
  separator: ',\n',
  close: ']}',
}

function createGeoJSONWritableStream(path) {
  return pipeline.obj(
    stringify(GEOJSON.open, GEOJSON.separator, GEOJSON.close),
    createGzip(),
    createWriteStream(path)
  )
}

module.exports = { createGeoJSONWritableStream }
