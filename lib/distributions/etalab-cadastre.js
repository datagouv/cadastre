'use strict'

const {join} = require('path')
const {getCodeDep} = require('../util/codes')

function departementPath(basePath, codeDep) {
  return join(basePath, 'etalab-cadastre', 'departements', codeDep)
}

function communePath(basePath, codeCommune) {
  const codeDep = getCodeDep(codeCommune)
  return join(basePath, 'etalab-cadastre', 'communes', codeDep, codeCommune)
}

module.exports = {departementPath, communePath}
