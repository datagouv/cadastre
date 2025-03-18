/* eslint unicorn/no-process-exit: off */
import os from 'node:os'
import bluebird from 'bluebird'
import {Piscina} from 'piscina'
import {extractDepartement} from '../extract/departement.js'
import {Tree} from '../dist/pci.js'

const extractWorkers = new Piscina({
  filename: new URL('../extract/worker.js', import.meta.url).href,
  concurrentTasksPerWorker: 1,
})

const concurrency = Math.floor(os.cpus().length / 8) || 1

async function doStuff(basePath, departements) {
  const edigeoTree = new Tree(basePath, 'dgfip-pci-vecteur', 'edigeo')
  const departementsFound = await edigeoTree.listDepartements()

  const departementsFiltered = departements === undefined ? departementsFound : departementsFound.filter(value => departements.split(',').map(codeDep => codeDep.trim()).includes(value))

  return bluebird.map(departementsFiltered, codeDep => extractDepartement(extractWorkers, basePath, codeDep), {concurrency})
}

function handler(basePath, departements) {
  doStuff(basePath, departements)
    .then(() => {
      console.log('Terminé avec succès !')
    })
    .catch(error => {
      console.log(error)
      console.log('Échec :(')
    })
}

export default handler
