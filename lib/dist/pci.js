import {join} from 'node:path'
import {compact} from 'lodash-es'
import {readdir} from '../util/fs.js'
import {getCodeDep, isCodeDepartement, isCodeCommune} from '../util/codes.js'

const FORMATS = [
  {name: 'edigeo', pattern: 'edigeo-{feuille}.tar.bz2'},
  {name: 'edigeo-cc', pattern: 'edigeo-cc-{feuille}.tar.bz2'},
  {name: 'dxf', pattern: 'dxf-{feuille}.tar.bz2'},
  {name: 'dxf-cc', pattern: 'dxf-cc-{feuille}.tar.bz2'},
  {name: 'tiff', pattern: 'tiff-{feuille}.zip'},
]

for (const format of FORMATS) {
  const regexp = new RegExp(`^${format.pattern.replace('{feuille}', '([A-Z0-9]{12})')}$`)
  format.extractFeuille = fileName => {
    const matched = fileName.match(regexp)
    return matched ? matched[1] : null
  }

  format.getFileName = feuille => format.pattern.replace('{feuille}', feuille)
}

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
    const codeCommune = feuille.slice(0, 5)
    const codeDep = getCodeDep(codeCommune)
    return join(this.getFeuillesBasePath(), codeDep, codeCommune, this.formatDefinition.getFileName(feuille))
  }

  getFeuillePathInArchive(feuille) {
    return `${feuille.slice(0, 5)}/${this.formatDefinition.getFileName(feuille)}`
  }

  async listDepartements() {
    const directory = this.getFeuillesBasePath()
    const entries = await readdir(directory)
    return entries.filter(entry => isCodeDepartement(entry))
  }

  async listCommunesByDepartement(codeDep) {
    const directory = join(this.getFeuillesBasePath(), codeDep)
    const entries = await readdir(directory)
    return entries.filter(entry => isCodeCommune(entry))
  }

  async listFeuillesByCommune(codeCommune) {
    const codeDep = getCodeDep(codeCommune)
    const directory = join(this.getFeuillesBasePath(), codeDep, codeCommune)
    const entries = await readdir(directory)
    return compact(entries.map(fileName => this.formatDefinition.extractFeuille(fileName)))
  }
}

export {Tree, FORMATS}
