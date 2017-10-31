'use strict'

const moment = require('moment')
const { trimStart } = require('lodash')

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
  const { section } = parseSectionIDU(properties.IDU)
  const id = codeDep.substr(0, 2) + properties.IDU
  const code = trimStart(section, '0')
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
  const { parcelle } = parseParcelleIDU(properties.IDU)
  const id = codeDep.substr(0, 2) + properties.IDU
  const numero = trimStart(parcelle, '0')
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

function parseParcelleIDU(value) {
  if (value.length !== 12) throw new Error('Parcelle IDU must contains 12 characters')
  return {
    com: value.substr(0, 3),
    prefix: value.substr(3, 3),
    section: value.substr(6, 2),
    parcelle: value.substr(8, 4),
  }
}

function parseSectionIDU(value) {
  if (value.length !== 8) throw new Error('Parcelle IDU must contains 12 characters')
  return {
    com: value.substr(0, 3),
    prefix: value.substr(3, 3),
    section: value.substr(6, 2),
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
  prepareCommune,
  prepareSection,
  prepareFeuille,
  prepareParcelle,
  prepareBatiment,
  parseSectionIDU,
  parseParcelleIDU,
}
