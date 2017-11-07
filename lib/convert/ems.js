'use strict'

const moment = require('moment')
const {padStart} = require('lodash')

function prepareCommune({properties, geometry, codeCommune}) {
  const id = codeCommune
  const nom = properties.NOM_COMMUN
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    properties: {id, nom, ...dates},
    geometry
  }
}

function prepareSection({properties, geometry, codeCommune}) {
  const id = `${codeCommune}000${padStart(properties.NUM_SECTIO, 2, '0')}`
  const code = properties.NUM_SECTIO
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    properties: {id, code, ...dates},
    geometry
  }
}

function prepareParcelle({properties, geometry, codeCommune}) {
  const id = `${codeCommune}000${padStart(properties.NUM_SECTIO, 2, '0')}${padStart(properties.NUM_PARCEL, 4, '0')}`
  const numero = properties.NUM_PARCEL
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    properties: {id, numero, ...dates},
    geometry
  }
}

function prepareBatiment({properties, geometry}) {
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    properties: {...dates},
    geometry
  }
}

/* Helpers */

function parseDates(properties) {
  const result = {}
  if (properties.APIC_CDATE) {
    result.created = moment(properties.APIC_CDATE.substr(0, 8), 'YYYYMMDD').format('YYYY-MM-DD')
  }
  if (properties.APIC_MDATE) {
    result.updated = moment(properties.APIC_MDATE.substr(0, 8), 'YYYYMMDD').format('YYYY-MM-DD')
  }
  return result
}

module.exports = {
  prepareCommune,
  prepareSection,
  prepareParcelle,
  prepareBatiment
}
