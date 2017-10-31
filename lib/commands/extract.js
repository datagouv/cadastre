/* eslint unicorn/no-process-exit: off */
'use strict'

const {join} = require('path')

const Promise = require('bluebird')
const ProgressBar = require('ascii-progress')

const {readdir, rimraf} = require('../util/fs')
const {isCodeDepartement} = require('../util/codes')
const extractDepartement = require('../extract/departement')

async function handler(workDir, {raw, layers}) {
  const srcDir = join(workDir, 'edigeo')
  const destDir = join(workDir, 'geojson')

  await rimraf(destDir)

  const files = await readdir(join(srcDir, 'departements'))
  const departementsFound = files.filter(isCodeDepartement)

  const overallBar = new ProgressBar({
    schema: `  overall conversion [:bar] :percent (:current/:total) :elapseds/:etas`,
    total: departementsFound.length
  })
  overallBar.tick(0)

  await Promise.each(departementsFound, codeDep => {
    return new Promise((resolve, reject) => {
      const extractor = extractDepartement(srcDir, destDir, codeDep, raw, layers)
      let bar

      extractor
        .on('start', () => {
          bar = new ProgressBar({
            schema: `  converting ${codeDep} [:bar] :percent (:current/:total) :elapseds/:etas`,
            total: extractor.total
          })
          bar.tick(0)
        })
        .on('commune', () => bar.tick())
        .on('end', () => {
          overallBar.tick()
          bar.clear()
          resolve()
        })
        .on('error', reject)
    })
  })

  process.exit(0)
}

module.exports = handler
