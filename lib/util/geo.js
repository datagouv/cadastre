import {createWriteStream, createReadStream} from 'node:fs'
import {createGzip, createGunzip} from 'node:zlib'
import {Transform} from 'node:stream'
import turf from '@turf/turf'
import {stringify, parse} from 'JSONStream'
import pumpify from 'pumpify'

function truncate(options = {}) {
  return new Transform({
    objectMode: true,
    transform(feature, enc, cb) {
      const mutate = options.mutate === true
      const precision = 'precision' in options ? options.precision : 6
      const coordinates = options.coordinates || 2

      cb(null, turf.truncate(feature, {precision, coordinates, mutate}))
    },
  })
}

function rewind(options = {}) {
  return new Transform({
    objectMode: true,
    transform(feature, enc, cb) {
      const reverse = options.reverse === true
      const mutate = options.mutate === true

      cb(null, turf.rewind(feature, {reverse, mutate}))
    },
  })
}

const GEOJSON = {
  open: '{"type":"FeatureCollection","features":[\n',
  separator: ',\n',
  close: ']}',
}

function createGeoJSONWriteStream(path) {
  return pumpify.obj(
    stringify(GEOJSON.open, GEOJSON.separator, GEOJSON.close),
    createGzip(),
    createWriteStream(path),
  )
}

function createGeoJSONReadStream(path) {
  const file = createReadStream(path)
  const gunzip = createGunzip()
  const parser = parse('features.*')

  function onError(error) {
    file.destroy()
    gunzip.destroy()
    parser.emit('error', error)
    parser.destroy()
  }

  file.on('error', onError)
  gunzip.on('error', onError)

  file.pipe(gunzip).pipe(parser)

  return parser
}

function createPolygonWriteStream(path) {
  return pumpify.obj(
    truncate({precision: 7, mutate: false}),
    rewind({mutate: false}),
    createGeoJSONWriteStream(path),
  )
}

function createCompactGeoJSONWriteStream(path) {
  return pumpify.obj(
    truncate({precision: 7, mutate: false}),
    createGeoJSONWriteStream(path),
  )
}

export {
  createGeoJSONReadStream,
  createGeoJSONWriteStream,
  createPolygonWriteStream,
  createCompactGeoJSONWriteStream,
}
