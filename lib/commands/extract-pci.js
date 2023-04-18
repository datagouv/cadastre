/* eslint unicorn/no-process-exit: off */
import process from 'node:process'
import os from 'node:os'
import bluebird from 'bluebird'
import {extractDepartement} from '../extract/departement.js'
import {Tree} from '../dist/pci.js'

const concurrency = Math.floor(os.cpus().length / 8) || 1

async function doStuff(basePath) {
  const edigeoTree = new Tree(basePath, 'dgfip-pci-vecteur', 'edigeo')
  const departementsFound = await edigeoTree.listDepartements()

  await bluebird.map(departementsFound, codeDep => new Promise((resolve, reject) => {
    const extractor = extractDepartement(basePath, codeDep)

    extractor
      .on('end', () => {
        resolve()
      })
      .on('error', reject)
  }), {concurrency})
}

function handler(basePath) {
  doStuff(basePath)
    .then(() => {
      console.log('Terminé avec succès !')
      process.exit(0)
    })
    .catch(error => {
      console.log(error)
      console.log('Échec :(')
      process.exit(1)
    })
}

export default handler
