'use strict'

const { createWriteStream } = require('fs')
const { createGzip } = require('zlib')

const turf = require('@turf/turf')
const { stringify } = require('JSONStream')
const { pipeline, through } = require('mississippi')

const GEOJSON = {
  open: '{"type":"FeatureCollection","features":[\n',
  separator: ',\n',
  close: ']}',
}

function truncate(options = {}) {
  return through.obj((feature, enc, cb) => {
    const mutate = options.mutate === true
    const precision = 'precision' in options ? options.precision : 6
    const coordinates = options.coordinates || 2

    cb(null, turf.truncate(feature, precision, coordinates, mutate))
  })
}

function createGeoJSONWritableStream(path) {
  return pipeline.obj(
    truncate({ mutate: true }),
    stringify(GEOJSON.open, GEOJSON.separator, GEOJSON.close),
    createGzip(),
    createWriteStream(path)
  )
}

module.exports = { createGeoJSONWritableStream }
