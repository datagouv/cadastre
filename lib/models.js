'use strict'

const moment = require('moment')
const { area } = require('@turf/turf')

function prepareParcelle({ codeDep, properties, geometry }) {
  const id = codeDep.substr(0, 2) + properties.IDU
  const surface = Math.round(area({ type: 'Feature', properties, geometry }))
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    geometry,
    properties: { id, surface, ...dates },
  }
}

function prepareSection({ properties, geometry }) {
  const id = properties.IDU

  return {
    type: 'Feature',
    id,
    geometry,
    properties: { id, ...properties },
  }
}

function prepareCommune({ properties, geometry, codeCommune }) {
  const id = `fr:commune:${codeCommune}`
  const nom = properties.TEX2
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    geometry,
    properties: { id, insee: codeCommune, nom, ...dates },
  }
}

function prepareBatiment({ properties, geometry }) {
  const type = properties.DUR === '01' ? 1 : 2
  const nom = properties.TEX || null
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    geometry,
    properties: { type, nom, ...dates },
  }
}

function parseDates(properties) {
  const result = {}
  if (properties.CREAT_DATE) {
    result.created = moment(properties.CREAT_DATE, 'YYYYMMDD').format('YYYY-MM-DD')
  }
  if (properties.UPDATE_DATE) {
    result.updated = moment(properties.UPDATE_DATE, 'YYYYMMDD').format('YYYY-MM-DD')
  }
  return result
}

module.exports = {
  prepareParcelle,
  prepareSection,
  prepareCommune,
  prepareBatiment,
}
