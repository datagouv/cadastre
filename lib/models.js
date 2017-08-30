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
  const code = properties.TEX
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    geometry,
    properties: { id, code, ...dates },
  }
}

function prepareFeuille({ codeDep, properties, geometry }) {
  const id = codeDep.substr(0, 2) + properties.IDU
  const qualite = properties.QUPL
  const modeConfection = properties.COPL
  const echelle = properties.EOR ? parseInt(properties.EOR, 10) : null

  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    geometry,
    properties: { id, qualite, modeConfection, echelle, ...dates },
  }
}

function prepareParcelle({ codeDep, properties, geometry }) {
  const id = codeDep.substr(0, 2) + properties.IDU
  const numero = properties.TEX
  const contenance = properties.SUPF
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    geometry,
    properties: { id, numero, contenance, ...dates },
  }
}

function prepareBatiment({ properties, geometry }) {
  const type = properties.DUR
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
