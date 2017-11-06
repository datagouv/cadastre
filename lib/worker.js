'use strict'

const {communePath} = require('./dist/simple')
const {Tree} = require('./dist/pci')
const {ensureDirectoryExists} = require('./util/fs')
const DefaultWriter = require('./output/default')
const RawWriter = require('./output/raw')
const extractCommune = require('./extract/commune')

module.exports = async function ({basePath, codeCommune, rawMode = false, layers}, done) {
  const edigeoTree = new Tree(basePath, 'dgfip-pci-vecteur', 'edigeo')
  const destPath = communePath(basePath, codeCommune)

  try {
    await ensureDirectoryExists(destPath)
  } catch (err) {
    return done(err)
  }

  const writer = rawMode ? new RawWriter(destPath, layers) : new DefaultWriter(destPath, `cadastre-${codeCommune}-`, layers)
  const extractor = extractCommune(edigeoTree, codeCommune)

  extractor
    .on('feuille', ({feuille, status, features}) => {
      if (status !== 'ok') return
      writer.handleFeuille(feuille, features)
    })
    .on('end', () => {
      writer.finish()
        .then(() => done())
        .catch(err => done(err))
    })
    .on('error', err => {
      console.error('Unable to extract commune %s', codeCommune)
      console.error(err)
    })
}
