/* eslint unicorn/no-process-exit: off */
import process from 'node:process'
import os from 'node:os'
import bluebird from 'bluebird'
import {Piscina} from 'piscina'
import {extractDepartement} from '../extract/departement.js'
import {Tree} from '../dist/pci.js'


const extractWorkers = new Piscina({
  filename: new URL('./../extract/worker.js', import.meta.url).href,
  concurrentTasksPerWorker: 1
  //,...workerOptions
})

const concurrency = Math.floor(os.cpus().length / 8) || 1

async function doStuff(basePath) {
  const edigeoTree = new Tree(basePath, 'dgfip-pci-vecteur', 'edigeo')
  const departementsFound = await edigeoTree.listDepartements()

  return bluebird.map(departementsFound, codeDep => {
    return extractDepartement(extractWorkers, basePath, codeDep)
  }, {concurrency})
}

function handler(basePath) {
  doStuff(basePath)
    .then(() => {
      console.log('Terminé avec succès !')
    })
    .catch(error => {
      console.log(error)
      console.log('Échec :(')
    })
}

export default handler
