'use strict'

const {trimStart} = require('lodash')

const {getCodeDep, getCodeCommune} = require('../util/codes')

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
  const codeDep = getCodeDep(feuille)

  const {IDU} = properties
  if (!IDU) throw new Error('IDU is not defined')
  const {section} = parseSectionIDU(IDU)
  const id = codeDep.substr(0, 2) + IDU
  const code = trimStart(section, '0')
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    geometry,
    properties: {id, code, ...dates}
  }
}

function prepareFeuille({properties, geometry, feuille}) {
  const codeDep = getCodeDep(feuille)

  const {IDU, QUPL, COPL, EOR} = properties
  if (!IDU) throw new Error('IDU is not defined')
  const id = codeDep.substr(0, 2) + IDU
  const qualite = QUPL
  const modeConfection = COPL
  const echelle = EOR ? parseInt(EOR, 10) : null

  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    geometry,
    properties: {id, qualite, modeConfection, echelle, ...dates}
  }
}

function prepareParcelle({properties, geometry, feuille}) {
  const codeDep = getCodeDep(feuille)

  const {IDU, SUPF} = properties
  if (!IDU) throw new Error('IDU is not defined')
  const {com, prefix, section, parcelle} = parseParcelleIDU(IDU)
  const id = codeDep.substr(0, 2) + com + prefix + section + parcelle
  const numero = trimStart(parcelle, '0')
  const contenance = SUPF
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    geometry,
    properties: {id, numero, contenance, ...dates}
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
    prefix: value.substr(3, 3),
    section: value.substr(6, 2),
    parcelle: value.substr(8, 4)
  }
}

function parseSectionIDU(value) {
  if (value.length !== 8) throw new Error('Parcelle IDU must contains 12 characters')
  return {
    com: value.substr(0, 3),
    prefix: value.substr(3, 3),
    section: value.substr(6, 2)
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
  parseParcelleIDU
}
