'use strict'

const {communePath} = require('./distributions/etalab-cadastre')
const {mkdirp} = require('./util/fs')
const DefaultWriter = require('./output/default')
const RawWriter = require('./output/raw')
const extractCommune = require('./extract/commune')

module.exports = async function ({basePath, codeCommune, rawMode = false, layers}, done) {
  const destPath = communePath(basePath, codeCommune)

  try {
    await mkdirp(destPath)
  } catch (err) {
    return done(err)
  }

  const writer = rawMode ? new RawWriter(destPath, layers) : new DefaultWriter(destPath, layers)
  const extractor = extractCommune(basePath, codeCommune)

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
