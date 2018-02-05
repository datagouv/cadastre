/* eslint unicorn/no-process-exit: off */
'use strict'

const os = require('os')
const Promise = require('bluebird')
const ProgressBar = require('ascii-progress')

const extractDepartement = require('../extract/departement')
const {Tree} = require('../dist/pci')

const concurrency = Math.floor(os.cpus().length / 8) || 1

async function handler(basePath, {layers}) {
  const edigeoTree = new Tree(basePath, 'dgfip-pci-vecteur', 'edigeo')
  const departementsFound = await edigeoTree.listDepartements()

  const overallBar = new ProgressBar({
    schema: `  overall conversion [:bar] :percent (:current/:total) :elapseds/:etas`,
    total: departementsFound.length
  })
  overallBar.tick(0)

  await Promise.map(departementsFound, codeDep => {
    return new Promise((resolve, reject) => {
      const extractor = extractDepartement(basePath, codeDep, layers)
      let bar

      extractor
        .on('commune', () => {
          if (!bar) {
            bar = new ProgressBar({
              schema: `  converting ${codeDep} [:bar] :percent (:current/:total) :elapseds/:etas`,
              total: extractor.total
            })
            bar.tick(0)
          }
          bar.tick()
        })
        .on('end', () => {
          overallBar.tick()
          bar.clear()
          resolve()
        })
        .on('error', reject)
    })
  }, {concurrency})

  process.exit(0)
}

module.exports = handler
