'use strict'

function getCodeDep(codeCommuneOrFeuille) {
  return codeCommuneOrFeuille.startsWith('97') ?
    codeCommuneOrFeuille.substr(0, 3) :
    codeCommuneOrFeuille.substr(0, 2)
}

function isCodeDepartement(string) {
  return string.match(/^([0-9A-Z]{2,3})$/)
}

function isCodeCommune(string) {
  return string.match(/^([0-9A-Z]{2}[0-9]{3})$/)
}

function getCodeCommune(feuille) {
  return feuille.substr(0, 5)
}

module.exports = {getCodeDep, isCodeDepartement, isCodeCommune, getCodeCommune}
