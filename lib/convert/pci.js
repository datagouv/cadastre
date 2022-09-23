import {createRequire} from 'node:module'

import {trimStart, deburr, keyBy} from 'lodash-es'

import {getCodeCommune} from '../util/codes.js'

const require = createRequire(import.meta.url)
const communesActuelles = keyBy(require('@etalab/decoupage-administratif/data/communes.json').filter(c => ['commune-actuelle', 'arrondissement-municipal'].includes(c.type)), 'code')
const communesAnciennes = keyBy(require('@etalab/decoupage-administratif/data/communes.json').filter(c => !['commune-actuelle', 'arrondissement-municipal'].includes(c.type)), 'code')

function prepareCommuneNom(TEX2, id) {
  if (TEX2) {
    return TEX2
  }

  if (id in communesActuelles) {
    return deburr(communesActuelles[id].nom).toUpperCase()
  }

  if (id in communesAnciennes) {
    return deburr(communesAnciennes[id].nom).toUpperCase()
  }
}

function prepareCommune({properties, geometry}, feuille) {
  const codeCommune = getCodeCommune(feuille)

  const id = codeCommune
  const nom = prepareCommuneNom(properties.TEX2, id)
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    id,
    geometry,
    properties: {id, nom, ...dates},
  }
}

function prepareSection({properties, geometry}, feuille) {
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
      ...dates,
    },
  }
}

function prepareFeuille({properties, geometry}, feuille) {
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
  const echelle = EOR ? Number.parseInt(EOR, 10) : null

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
      ...dates,
    },
  }
}

function prepareParcelle({properties, geometry}, feuille) {
  const codeCommune = getCodeCommune(feuille)

  const {IDU, SUPF, COAR} = properties
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
      arpente: COAR === 'A',
      ...dates,
    },
  }
}

function prepareBatiment({properties, geometry}, feuille) {
  const type = properties.DUR
  const nom = properties.TEX || null
  const commune = getCodeCommune(feuille)
  const dates = parseDates(properties)

  return {
    type: 'Feature',
    geometry,
    properties: {type, nom, commune, ...dates},
  }
}

function prepareLieuDit({properties, geometry}, feuille) {
  const commune = getCodeCommune(feuille)
  const dates = parseDates(properties)
  const p = properties
  const textProperties = [p.TEX, p.TEX2, p.TEX3, p.TEX4, p.TEX5, p.TEX6, p.TEX7, p.TEX8, p.TEX9, p.TEX10]
  // First naive implementation
  const nom = textProperties.filter(Boolean).join(' ')

  return {
    type: 'Feature',
    geometry,
    properties: {nom, commune, ...dates},
  }
}

function prepareSubdivisionFiscaleParcelle(parcelleId, codeCommune) {
  if (parcelleId) {
    try {
      const {prefixe, section, parcelle} = parseParcelleIDU(parcelleId)
      return codeCommune + prefixe + section + parcelle
    } catch {
      // Do nothing
    }
  }
}

function prepareSubdivisionFiscale({properties, geometry, extraProperties = {}}, feuille) {
  const codeCommune = getCodeCommune(feuille)
  const dates = parseDates(properties)
  const lettre = properties.TEX
  const parcelle = prepareSubdivisionFiscaleParcelle(extraProperties.parcelleId, codeCommune)

  return {
    type: 'Feature',
    geometry,
    properties: {parcelle, lettre, ...dates},
  }
}

/* Helpers */

function parseParcelleIDU(value) {
  if (value.length !== 12) throw new Error('Parcelle IDU must contains 12 characters')
  return {
    com: value.slice(0, 3),
    prefixe: value.slice(3, 6),
    section: value.slice(6, 8),
    parcelle: value.slice(8, 12),
  }
}

function parseSectionIDU(value) {
  if (value.length !== 8) throw new Error('Section IDU must contains 8 characters')
  return {
    com: value.slice(0, 3),
    prefixe: value.slice(3, 6),
    section: value.slice(6, 8),
  }
}

function parseFeuilleIDU(value) {
  if (value.length !== 10) throw new Error('Feuille IDU must contains 10 characters')
  return {
    com: value.slice(0, 3),
    prefixe: value.slice(3, 6),
    section: value.slice(6, 8),
    numeroFeuille: value.slice(8, 10),
  }
}

function parseDates(properties) {
  const result = {}
  if (properties.DATE_OBS) {
    result.created = properties.DATE_OBS
  }

  if (properties.DATE_MAJ) {
    result.updated = properties.DATE_MAJ
  }

  return result
}

export {
  prepareCommune,
  prepareSection,
  prepareFeuille,
  prepareParcelle,
  prepareBatiment,
  prepareLieuDit,
  prepareSubdivisionFiscale,
  parseSectionIDU,
  parseParcelleIDU,
  parseFeuilleIDU,
}
