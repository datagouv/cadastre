'use strict'

const {join} = require('path')
const {compact} = require('lodash')
const {readdir} = require('../util/fs')
const {getCodeDep, isCodeDepartement, isCodeCommune} = require('../util/codes')

const FORMATS = [
  {name: 'edigeo', pattern: 'edigeo-{feuille}.tar.bz2'},
  {name: 'edigeo-cc', pattern: 'edigeo-cc-{feuille}.tar.bz2'},
  {name: 'dxf', pattern: 'dxf-{feuille}.tar.bz2'},
  {name: 'dxf-cc', pattern: 'dxf-cc-{feuille}.tar.bz2'},
  {name: 'tiff', pattern: 'tiff-{feuille}.zip'}
]

FORMATS.forEach(format => {
  const regexp = new RegExp(`^${format.pattern.replace('{feuille}', '([A-Z0-9]{12})')}$`)
  format.extractFeuille = fileName => {
    const res = fileName.match(regexp)
    return res ? res[1] : null
  }

  format.getFileName = feuille => format.pattern.replace('{feuille}', feuille)
})

class Tree {
  constructor(basePath, prefix, format) {
    this.format = format
    this.formatDefinition = FORMATS.find(f => f.name === format)
    this.treeBasePath = join(basePath, prefix, format)
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
    return join(this.getFeuillesBasePath(), codeDep, codeCommune, this.formatDefinition.getFileName(feuille))
  }

  getFeuillePathInArchive(feuille) {
    return `${feuille.substr(0, 5)}/${this.formatDefinition.getFileName(feuille)}`
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
    return compact(entries.map(fileName => this.formatDefinition.extractFeuille(fileName)))
  }
}

module.exports = {Tree, FORMATS}
