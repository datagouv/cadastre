function getCodeDep(codeCommuneOrFeuille) {
  return codeCommuneOrFeuille.startsWith('97')
    ? codeCommuneOrFeuille.slice(0, 3)
    : codeCommuneOrFeuille.slice(0, 2)
}

function isCodeDepartement(string) {
  return string.match(/^([\dA-Z]{2,3})$/)
}

function isCodeCommune(string) {
  return string.match(/^([\dA-Z]{2}\d{3})$/)
}

function getCodeCommune(feuille) {
  return feuille.slice(0, 5)
}

export {getCodeDep, isCodeDepartement, isCodeCommune, getCodeCommune}
