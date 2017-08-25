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

function filterArea(minArea) {
  return through.obj((feature, enc, cb) => {
    if (!feature.geometry || !['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) {
      return cb(null, feature)
    }
    const area = turf.area(feature)
    if (area <= minArea) return cb()
    cb(null, feature)
  })
}

function truncate(options = {}) {
  return through.obj((feature, enc, cb) => {
    const mutate = options.mutate === true
    const precision = 'precision' in options ? options.precision : 6
    const coordinates = options.coordinates || 2

    cb(null, turf.truncate(feature, precision, coordinates, mutate))
  })
}

function rewind(options = {}) {
  return through.obj((feature, enc, cb) => {
    const reverse = options.reverse === true
    const mutate = options.mutate === true

    cb(null, turf.rewind(feature, reverse, mutate))
  })
}

function cleanCoords(options = {}) {
  return through.obj((feature, enc, cb) => {
    const mutate = options.mutate === true

    cb(null, turf.cleanCoords(feature, mutate))
  })
}

function createGeoJSONWritableStream(path) {
  return pipeline.obj(
    filterArea(1),
    truncate({ precision: 7, mutate: true }),
    cleanCoords({ mutate: true }),
    rewind({ mutate: true }),
    stringify(GEOJSON.open, GEOJSON.separator, GEOJSON.close),
    createGzip(),
    createWriteStream(path)
  )
}

module.exports = { createGeoJSONWritableStream }
