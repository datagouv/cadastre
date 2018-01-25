'use strict'

const {parse} = require('@etalab/edigeo-parser')
const {getCodeCommune} = require('../util/codes')

async function extractFeuille(edigeoTree, feuille) {
  const codeCommune = getCodeCommune(feuille)
  const filePath = edigeoTree.getFeuillePath(feuille)

  // Fix source srsCode for Saint-Martin and Saint-Barthelemy (https://github.com/etalab/cadastre/issues/17)
  const parseOptions = ['97127', '97123'].includes(codeCommune) ?
    {overrideSrsCode: 'GUADFM49U20', bundle: feuille} :
    {bundle: feuille}

  const {layers} = await parse(filePath, parseOptions)

  return Object.keys(layers).reduce((acc, layer) => {
    layers[layer].forEach(feature => {
      acc.push(feature)
    })
    return acc
  }, [])
}

module.exports = extractFeuille
