/* eslint unicorn/no-process-exit: off */
'use strict'

const os = require('os')
const bluebird = require('bluebird')

const {extractDepartement, stopWorkers} = require('../extract/departement')
const {Tree} = require('../dist/pci')

const concurrency = Math.floor(os.cpus().length / 8) || 1

async function doStuff(basePath) {
  const edigeoTree = new Tree(basePath, 'dgfip-pci-vecteur', 'edigeo')
  const departementsFound = await edigeoTree.listDepartements()

  await bluebird.map(departementsFound, codeDep => {
    return new Promise((resolve, reject) => {
      const extractor = extractDepartement(basePath, codeDep)

      extractor
        .on('end', () => {
          resolve()
        })
        .on('error', reject)
    })
  }, {concurrency})
}

function handler(basePath) {
  doStuff(basePath)
    .then(() => {
      stopWorkers()
      console.log('Terminé avec succès !')
    })
    .catch(error => {
      console.log(error)
      stopWorkers(() => {
        console.log('Échec :(')
        process.exit(1)
      })
    })
}

module.exports = handler
