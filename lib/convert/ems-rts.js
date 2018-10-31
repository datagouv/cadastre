'use strict'

function prepareCommune({properties, geometry}, codeCommune) {
  const id = codeCommune
  const nom = properties.NOM_COM

  return {
    type: 'Feature',
    id,
    properties: {id, nom},
    geometry
  }
}

function prepareBatiment({geometry}, codeCommune) {
  const commune = codeCommune

  return {
    type: 'Feature',
    properties: {commune},
    geometry
  }
}

/* Helpers */

module.exports = {
  prepareCommune,
  prepareBatiment
}
