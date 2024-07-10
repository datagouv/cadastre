import bluebird from 'bluebird'
import {Tree} from '../dist/pci.js'

const concurrency = 3

async function extractDepartement(extractCommuneWorkers, basePath, codeDep) {
  const edigeoTree = new Tree(basePath, 'dgfip-pci-vecteur', 'edigeo')

  function progress(codeCommune) {
    console.log(codeCommune)
  }

  const communesFound = await edigeoTree.listCommunesByDepartement(codeDep)
  try {
    // Series since GDAL is a blocking binding
    return await bluebird.map(communesFound, commune => {
      try {
        progress(commune)
        return extractCommuneWorkers.run({basePath, codeCommune: commune})
      } catch (error) {
        console.error('Unable to extract commune %s', commune)
        console.error(error)
        return Promise.reject(error)
      }
    }, {concurrency})
  } catch (error) {
    throw new Error(error)
  }
}

export {extractDepartement}
