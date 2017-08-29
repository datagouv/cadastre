'use strict'

function getCodeDep(codeCommune) {
  return codeCommune.startsWith('97') ?
    codeCommune.substr(0, 3) :
    codeCommune.substr(0, 2)
}

function isCodeDepartement(string) {
  return string.match(/^([0-9A-Z]{2,3})$/)
}

function isCodeCommune(string) {
  return string.match(/^([0-9A-Z]{2}[0-9]{3})$/)
}

module.exports = { getCodeDep, isCodeDepartement, isCodeCommune }
