'use strict'

const moment = require('moment')
const {padStart} = require('lodash')

function prepareSection({properties, geometry}, codeCommune) {
  const id = `${codeCommune}000${padStart(properties.NUM_SECTIO, 2, '0')}`
  const code = properties.NUM_SECTIO
  const prefixe = '000'
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    properties: {
      id,
      commune: codeCommune,
      prefixe,
      code,
      ...dates
    },
    geometry
  }
}

function prepareParcelle({properties, geometry}, codeCommune) {
  const id = `${codeCommune}000${padStart(properties.NUM_SECTIO, 2, '0')}${padStart(properties.NUM_PARCEL, 4, '0')}`
  const section = properties.NUM_SECTIO
  const prefixe = '000'
  const numero = properties.NUM_PARCEL
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    properties: {
      id,
      commune: codeCommune,
      prefixe,
      section,
      numero,
      ...dates
    },
    geometry
  }
}

function validateParcelle({properties}) {
  if (!properties.numero) console.log('parcelle sans numéro')
  if (properties.numero === 'nc') console.log('parcelle avec numéro nc')
  return properties.numero && properties.numero !== 'nc'
}

/* Helpers */

function parseDates({DATE_MAJ}) {
  const result = {}
  if (DATE_MAJ) {
    result.updated = moment(DATE_MAJ).format('YYYY-MM-DD')
  }
  return result
}

module.exports = {
  prepareSection,
  prepareParcelle,
  validateParcelle
}
