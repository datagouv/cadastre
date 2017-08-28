'use strict'

function getCodeDep(codeCommune) {
  return codeCommune.startsWith('97') ?
    codeCommune.substr(0, 3) :
    codeCommune.substr(0, 2)
}

module.exports = { getCodeDep }
