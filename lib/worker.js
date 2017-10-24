'use strict'

const { join } = require('path')

const { mkdirp } = require('./util/fs')
const { getCodeDep } = require('./util/codes')
const DefaultWriter = require('./output/default')
const RawWriter = require('./output/raw')
const extractCommune = require('./extract/commune')

module.exports = async function ({ baseSrcPath, baseDestPath, codeCommune, rawMode = false, layers }, done) {
  const codeDep = getCodeDep(codeCommune)
  const communeDestPath = join(baseDestPath, 'departements', codeDep, 'communes', codeCommune)

  try {
    mkdirp(communeDestPath)
  } catch (err) {
    return done(err)
  }

  const writer = rawMode ? new RawWriter(communeDestPath, layers) : new DefaultWriter(communeDestPath, layers)
  const extractor = extractCommune(baseSrcPath, codeCommune)

  extractor
    .on('feuille', ({ feuille, status, features }) => {
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
