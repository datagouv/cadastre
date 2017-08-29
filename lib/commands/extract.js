/* eslint unicorn/no-process-exit: off */
'use strict'

const { resolve, join } = require('path')
const { readdir } = require('fs')
const { promisify } = require('util')

const Promise = require('bluebird')
const ProgressBar = require('ascii-progress')
const rimraf = require('rimraf')

const { isCodeDepartement } = require('../util/codes')
const extractDepartement = require('../extract/departement')

const rimrafAsync = promisify(rimraf)
const readdirAsync = promisify(readdir)

async function handler(workDir, { writeRaw }) {
  if (!workDir) throw new Error('workDir is required')
  workDir = resolve(workDir)
  const srcDir = join(workDir, 'edigeo')
  const destDir = join(workDir, 'geojson')

  await rimrafAsync(destDir)

  const files = await readdirAsync(join(srcDir, 'departements'))
  const departementsFound = files.filter(isCodeDepartement)

  const overallBar = new ProgressBar({
    schema: `  overall conversion [:bar] :percent (:current/:total) :elapseds/:etas`,
    total: departementsFound.length,
  })
  overallBar.tick(0)

  await Promise.each(departementsFound, codeDep => {
    return new Promise((resolve, reject) => {
      const extractor = extractDepartement(srcDir, destDir, codeDep, writeRaw)
      let bar

      extractor
        .on('start', () => {
          bar = new ProgressBar({
            schema: `  converting ${codeDep} [:bar] :percent (:current/:total) :elapseds/:etas`,
            total: extractor.total,
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
