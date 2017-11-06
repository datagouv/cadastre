'use strict'

const {join} = require('path')
const {compact} = require('lodash')
const {readdir} = require('../util/fs')
const {getCodeDep, isCodeDepartement, isCodeCommune} = require('../util/codes')

class Tree {
  constructor(basePath, prefix) {
    this.prefix = prefix
    this.treeBasePath = join(basePath, ...(prefix.split('/')))
  }

  getFeuillesBasePath() {
    return join(this.treeBasePath, 'feuilles')
  }

  getDepartementsArchivesPath() {
    return join(this.treeBasePath, 'departements')
  }

  getDepartementArchivePath(codeDep) {
    return join(this.getDepartementsArchivesPath(), `dep${codeDep}.zip`)
  }

  getFeuillePath(feuille) {
    const codeCommune = feuille.substr(0, 5)
    const codeDep = getCodeDep(codeCommune)
    return join(this.getFeuillesBasePath(), 'communes', codeDep, codeCommune, `${this.prefix}-${feuille}.tar.bz2`)
  }

  getFeuillePathInArchive(feuille) {
    return `${feuille.substr(0, 5)}/${this.prefix}-${feuille}.tar.bz2`
  }

  async listDepartements() {
    const directory = this.getFeuillesBasePath()
    const entries = await readdir(directory)
    return entries.filter(isCodeDepartement)
  }

  async listCommunesByDepartement(codeDep) {
    const directory = join(this.getFeuillesBasePath(), codeDep)
    const entries = await readdir(directory)
    return entries.filter(isCodeCommune)
  }

  async listFeuillesByCommune(codeCommune) {
    const codeDep = getCodeDep(codeCommune)
    const directory = join(this.getFeuillesBasePath(), codeDep, codeCommune)
    const entries = await readdir(directory)
    return compact(entries.map(fileName => {
      const res = fileName.match(/^edigeo-([A-Z0-9]{12})\.tar\.bz2$/i)
      return res ? res[1] : null
    }))
  }
}

module.exports = {Tree}
