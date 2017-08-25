'use strict'

const moment = require('moment')
const { area } = require('@turf/turf')

function prepareCommune({ properties, geometry, codeCommune }) {
  const id = codeCommune
  const nom = properties.TEX2
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    geometry,
    properties: { id, nom, ...dates },
  }
}

function prepareSection({ codeDep, properties, geometry }) {
  const id = codeDep.substr(0, 2) + properties.IDU
  const nom = properties.TEX
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    geometry,
    properties: { id, nom, ...dates },
  }
}

function prepareFeuille({ properties, geometry }) {
  const id = properties.IDU
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    geometry,
    properties: { id, ...properties, ...dates },
  }
}

function prepareParcelle({ codeDep, properties, geometry }) {
  const id = codeDep.substr(0, 2) + properties.IDU
  const nom = properties.TEX
  const surface = Math.round(area({ type: 'Feature', properties, geometry }))
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    geometry,
    properties: { id, nom, surface, ...dates },
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

/* Helpers */

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
  prepareCommune,
  prepareSection,
  prepareFeuille,
  prepareParcelle,
  prepareBatiment,
}
