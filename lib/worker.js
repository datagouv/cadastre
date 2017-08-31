'use strict'

const { join } = require('path')
const { promisify } = require('util')

const mkdirp = require('mkdirp')

const { getCodeDep } = require('./util/codes')
const DefaultWriter = require('./output/default')
const RawWriter = require('./output/raw')
const extractCommune = require('./extract/commune')

const mkdirpAsync = promisify(mkdirp)

module.exports = async function ({ baseSrcPath, baseDestPath, codeCommune, rawMode = false }, done) {
  const codeDep = getCodeDep(codeCommune)
  const communeDestPath = join(baseDestPath, 'departements', codeDep, 'communes', codeCommune)

  try {
    mkdirpAsync(communeDestPath)
  } catch (err) {
    return done(err)
  }

  const writer = rawMode ? new RawWriter(communeDestPath) : new DefaultWriter(communeDestPath)
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
