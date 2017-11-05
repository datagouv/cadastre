'use strict'

const {join} = require('path')
const {getCodeDep, isCodeDepartement} = require('../util/codes')
const {glob, readdir} = require('../util/fs')

function departementPath(basePath, codeDep) {
  return join(basePath, 'etalab-cadastre', 'departements', codeDep)
}

function communePath(basePath, codeCommune) {
  const codeDep = getCodeDep(codeCommune)
  return join(basePath, 'etalab-cadastre', 'communes', codeDep, codeCommune)
}

function departementsPath(basePath) {
  return join(basePath, 'etalab-cadastre', 'communes')
}

async function listDepartements(basePath) {
  const directory = departementsPath(basePath)
  const entries = await readdir(directory)
  return entries.filter(isCodeDepartement)
}

async function listLayerFilesByDepartement(basePath, layer, codeDep) {
  const cwd = join(basePath, 'etalab-cadastre', 'communes', codeDep)
  const relativePaths = await glob(`**/cadastre-*-${layer}.json.gz`, {cwd})
  return relativePaths.map(path => join(cwd, path))
}

function departementLayerPath(basePath, layer, codeDep) {
  return join(departementPath(basePath, codeDep), `cadastre-${codeDep}-${layer}.json.gz`)
}

module.exports = {departementPath, communePath, listDepartements, listLayerFilesByDepartement, departementLayerPath}
