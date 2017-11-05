'use strict'

const {createWriteStream, createReadStream} = require('fs')
const {createGzip, createGunzip} = require('zlib')
const {dirname} = require('path')

const turf = require('@turf/turf')
const {stringify, parse} = require('JSONStream')
const {pipeline, through} = require('mississippi')

const {ensureDirectoryExists} = require('./fs')

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

const GEOJSON = {
  open: '{"type":"FeatureCollection","features":[\n',
  separator: ',\n',
  close: ']}'
}

function createGeoJSONWriteStream(path) {
  return pipeline.obj(
    stringify(GEOJSON.open, GEOJSON.separator, GEOJSON.close),
    createGzip(),
    createWriteStream(path)
  )
}

function createGeoJSONReadStream(path) {
  const file = createReadStream(path)
  const gunzip = createGunzip()
  const parser = parse('features.*')

  function onError(err) {
    file.destroy()
    gunzip.destroy()
    parser.emit('error', err)
    parser.destroy()
  }

  file.on('error', onError)
  gunzip.on('error', onError)

  file.pipe(gunzip).pipe(parser)

  return parser
}

function createPolygonWriteStream(path) {
  return pipeline.obj(
    filterArea(0.01),
    truncate({precision: 7, mutate: true}),
    cleanCoords({mutate: true}),
    rewind({mutate: true}),
    createGeoJSONWriteStream(path)
  )
}

function createCompactGeoJSONWriteStream(path) {
  return pipeline.obj(
    truncate({precision: 7, mutate: true}),
    cleanCoords({mutate: true}),
    createGeoJSONWriteStream(path)
  )
}

async function mergeGeoJSONFiles(srcPaths, destPath) {
  const directory = dirname(destPath)
  await ensureDirectoryExists(directory)

  return new Promise((resolve, reject) => {
    const mergedStream = createGeoJSONWriteStream(destPath)
    mergedStream.setMaxListeners(Infinity)

    let count = srcPaths.length

    srcPaths.forEach(srcPath => {
      const srcStream = createGeoJSONReadStream(srcPath)
      srcStream.pipe(mergedStream, {end: false})
      srcStream
        .on('error', reject)
        .on('end', () => {
          count--
          if (count === 0) mergedStream.end()
        })
    })

    mergedStream
      .on('error', reject)
      .on('finish', resolve)
  })
}

module.exports = {
  createGeoJSONReadStream,
  createGeoJSONWriteStream,
  createPolygonWriteStream,
  createCompactGeoJSONWriteStream,
  mergeGeoJSONFiles
}
