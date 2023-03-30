import moment from 'moment'
import {padStart} from 'lodash-es'

function prepareSection({properties, geometry}, codeCommune) {
  const id = `${codeCommune}000${padStart(properties.N_SECTION, 2, '0')}`
  const code = properties.N_SECTION
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
      ...dates,
    },
    geometry,
  }
}

function prepareParcelle({properties, geometry}, codeCommune) {
  const id = `${codeCommune}000${padStart(properties.N_SECTION, 2, '0')}${padStart(properties.N_PARCELLE, 4, '0')}`
  const section = properties.N_SECTION
  const prefixe = '000'
  const numero = properties.N_PARCELLE
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
      ...dates,
    },
    geometry,
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
    result.updated = moment(DATE_MAJ, 'YYYYMMDD').format('YYYY-MM-DD')
  }

  return result
}

export {
  prepareSection,
  prepareParcelle,
  validateParcelle,
}
