'use strict'

const departementsDb = require('./departements.json')
const communesDb = require('./communes.json')

const departementsIndex = departementsDb.reduce((acc, departement) => {
  acc[departement.code] = departement
  return acc
}, {})

exports.getDepartement = code => departementsIndex[code]
exports.departementsCodes = Object.keys(departementsIndex)
exports.departementExists = code => code in departementsIndex

const communesIndex = communesDb.reduce((acc, commune) => {
  acc[commune.code] = commune
  return acc
}, {})

const communesDepIndex = communesDb.reduce((acc, commune) => {
  if (!acc[commune.codeDepartement]) {
    acc[commune.codeDepartement] = []
  }
  acc[commune.codeDepartement].push(commune)
  return acc
}, {})

exports.getCommune = code => communesIndex[code]
exports.getCommunesCodesByDep = depCode => communesDepIndex[depCode]
exports.communeExists = code => code in communesIndex
