const crsMapping = {
  // Guadeloupe
  971: 5490,
  // Martinique
  972: 5490,
  // Guyane
  973: 2972,
  // Réunion
  974: 2975,
  // Mayotte
  976: 4471
}

function getLegalCrsCode(departementCode) {
  return departementCode in crsMapping ? crsMapping[departementCode] : 2154
}

module.exports = {getLegalCrsCode}
