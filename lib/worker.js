'use strict'

const {communePath} = require('./dist/simple')
const {Tree} = require('./dist/pci')
const createDefaultWriter = require('./output/default').createWriter
const createRawWriter = require('./output/raw').createWriter
const extractCommune = require('./extract/commune')

module.exports = async function ({basePath, codeCommune, layers}, done) {
  const edigeoTree = new Tree(basePath, 'dgfip-pci-vecteur', 'edigeo')
  const destPath = communePath(basePath, codeCommune)

  const rawWriter = await createRawWriter(destPath, layers)
  const defaultWriter = await createDefaultWriter(destPath, `cadastre-${codeCommune}-`, layers)
  const extractor = extractCommune(edigeoTree, codeCommune)

  extractor
    .on('feuille', ({feuille, status, reason, features}) => {
      if (status === 'ok') {
        rawWriter.handleFeuille(feuille, features)
        defaultWriter.handleFeuille(feuille, features)
      } else if (status === 'ignored') {
        console.log('%s | feuille ignorée | %s', feuille, reason)
      }
    })
    .on('end', () => {
      Promise.all([rawWriter.finish(), defaultWriter.finish()])
        .then(() => done())
        .catch(err => done(err))
    })
    .on('error', err => {
      console.error('Unable to extract commune %s', codeCommune)
      console.error(err)
    })
}
