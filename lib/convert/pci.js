'use strict'

const {trimStart} = require('lodash')

const {getCodeCommune} = require('../util/codes')

function prepareCommune({properties, geometry, feuille}) {
  const codeCommune = getCodeCommune(feuille)

  const id = codeCommune
  const nom = properties.TEX2
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    geometry,
    properties: {id, nom, ...dates}
  }
}

function prepareSection({properties, geometry, feuille}) {
  const codeCommune = getCodeCommune(feuille)

  const {IDU} = properties
  if (!IDU) throw new Error('IDU is not defined')
  const {section, prefixe} = parseSectionIDU(IDU)
  const id = codeCommune + prefixe + section
  const code = trimStart(section, '0')
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    geometry,
    properties: {
      id,
      commune: codeCommune,
      prefixe,
      code,
      ...dates
    }
  }
}

function prepareFeuille({properties, geometry, feuille}) {
  const codeCommune = getCodeCommune(feuille)

  const {IDU, QUPL, COPL, EOR} = properties
  if (!IDU) throw new Error('IDU is not defined')
  const {section, prefixe, numeroFeuille} = parseFeuilleIDU(IDU)
  const id = codeCommune + prefixe + section + numeroFeuille
  if (id !== feuille) {
    throw new Error('Feuille ID mismatch')
  }
  const qualite = QUPL
  const modeConfection = COPL
  const echelle = EOR ? parseInt(EOR, 10) : null

  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    geometry,
    properties: {
      id,
      commune: codeCommune,
      prefixe,
      section: trimStart(section, '0'),
      numero: numeroFeuille,
      qualite,
      modeConfection,
      echelle,
      ...dates
    }
  }
}

function prepareParcelle({properties, geometry, feuille}) {
  const codeCommune = getCodeCommune(feuille)

  const {IDU, SUPF} = properties
  if (!IDU) throw new Error('IDU is not defined')
  const {prefixe, section, parcelle} = parseParcelleIDU(IDU)
  const id = codeCommune + prefixe + section + parcelle
  const numero = trimStart(parcelle, '0')
  const contenance = SUPF
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    geometry,
    properties: {
      id,
      commune: codeCommune,
      prefixe,
      section: trimStart(section, '0'),
      numero,
      contenance,
      ...dates
    }
  }
}

function prepareBatiment({properties, geometry}) {
  const type = properties.DUR
  const nom = properties.TEX || null
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    geometry,
    properties: {type, nom, ...dates}
  }
}

/* Helpers */

function parseParcelleIDU(value) {
  if (value.length !== 12) throw new Error('Parcelle IDU must contains 12 characters')
  return {
    com: value.substr(0, 3),
    prefixe: value.substr(3, 3),
    section: value.substr(6, 2),
    parcelle: value.substr(8, 4)
  }
}

function parseSectionIDU(value) {
  if (value.length !== 8) throw new Error('Section IDU must contains 8 characters')
  return {
    com: value.substr(0, 3),
    prefixe: value.substr(3, 3),
    section: value.substr(6, 2)
  }
}

function parseFeuilleIDU(value) {
  if (value.length !== 10) throw new Error('Feuille IDU must contains 10 characters')
  return {
    com: value.substr(0, 3),
    prefixe: value.substr(3, 3),
    section: value.substr(6, 2),
    numeroFeuille: value.substr(8, 2)
  }
}

function parseDates(properties) {
  const result = {}
  if (properties.createdAt) {
    result.created = properties.createdAt
  }
  if (properties.updatedAt) {
    result.updated = properties.updatedAt
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
  parseFeuilleIDU
}
