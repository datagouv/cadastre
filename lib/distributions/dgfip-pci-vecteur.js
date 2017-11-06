'use strict'

const {join} = require('path')
const {compact} = require('lodash')
const {readdir} = require('../util/fs')
const {getCodeDep, isCodeDepartement, isCodeCommune} = require('../util/codes')

function edigeoBasePath(basePath) {
  return join(basePath, 'dgfip-pci-vecteur', 'edigeo')
}

function feuillesBasePath(basePath) {
  return join(edigeoBasePath(basePath), 'feuilles')
}

function departementsPath(basePath) {
  return join(feuillesBasePath(basePath))
}

function departementsArchivesPath(basePath) {
  return join(edigeoBasePath(basePath), 'departements')
}

function departementArchivePath(basePath, codeDep) {
  return join(departementsArchivesPath(basePath), `dep${codeDep}.zip`)
}

function communesPath(basePath, codeDep) {
  return join(departementsPath(basePath), codeDep)
}

function communePath(basePath, codeCommune) {
  const codeDep = getCodeDep(codeCommune)
  return join(feuillesBasePath(basePath), codeDep, codeCommune)
}

async function listDepartements(basePath) {
  const directory = departementsPath(basePath)
  const entries = await readdir(directory)
  return entries.filter(isCodeDepartement)
}

async function listCommunesByDepartement(basePath, codeDep) {
  const directory = communesPath(basePath, codeDep)
  const entries = await readdir(directory)
  return entries.filter(isCodeCommune)
}

async function listFeuillesByCommune(basePath, codeCommune) {
  const directory = communePath(basePath, codeCommune)
  const entries = await readdir(directory)
  return compact(entries.map(fileName => {
    const res = fileName.match(/^edigeo-([A-Z0-9]{12})\.tar\.bz2$/i)
    return res ? res[1] : null
  }))
}

function feuillePath(basePath, feuille) {
  const directory = communePath(basePath, feuille.substr(0, 5))
  return join(directory, `edigeo-${feuille}.tar.bz2`)
}

function feuillePathInArchive(feuille) {
  return `${feuille.substr(0, 5)}/edigeo-${feuille}.tar.bz2`
}

module.exports = {
  departementsPath,
  listDepartements,
  communePath,
  communesPath,
  listCommunesByDepartement,
  listFeuillesByCommune,
  feuillePath,
  edigeoBasePath,
  feuillesBasePath,
  departementArchivePath,
  feuillePathInArchive,
  departementsArchivesPath
}
