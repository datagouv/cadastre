import {EventEmitter} from 'node:events'
import {Piscina} from 'piscina'
import bluebird from 'bluebird'
import {Tree} from '../dist/pci.js'

const extractCommuneWorkers = new Piscina({
  filename: new URL('worker.js', import.meta.url).href,
})

function extractDepartement(basePath, codeDep) {
  const extractor = new EventEmitter()
  const edigeoTree = new Tree(basePath, 'dgfip-pci-vecteur', 'edigeo')

  extractor.extracted = 0

  function progress({codeCommune}) {
    extractor.extracted++
    extractor.emit('commune', {codeCommune})
  }

  edigeoTree.listCommunesByDepartement(codeDep)
    .then(communesFound => {
      /* Progression */
      extractor.total = communesFound.length

      // Series since GDAL is a blocking binding
      // eslint-disable-next-line unicorn/no-array-method-this-argument, unicorn/no-array-callback-reference
      return bluebird.map(communesFound, commune => {
        try {
          progress({codeCommune: commune})
          return extractCommuneWorkers.run({basePath, codeCommune: commune})
        } catch (error) {
          console.error('Unable to extract commune %s', commune)
          console.error(error)
          return Promise.reject(error)
        }
      })
    })
    .then(() => extractor.emit('end'))
    .catch(error => extractor.emit('error', error))

  return extractor
}

export {extractDepartement}
