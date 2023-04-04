import {createRequire} from 'node:module'
import {EventEmitter} from 'node:events'
import {Piscina} from 'piscina'
import bluebird from 'bluebird'
import {Tree} from '../dist/pci.js'

const require = createRequire(import.meta.url)

const extractCommuneWorkers = new Piscina({
  filename: new URL('./worker.js', import.meta.url).href,
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
      return bluebird.map(communesFound, commune => new Promise((resolve, reject) => {
        try {
          await extractCommuneWorkers.run({basePath, codeCommune: commune})
          progress({codeCommune: commune})
        } catch (error) {
          console.error('Unable to extract commune %s', commune)
          console.error(error)
        }
      }))
    })
    .then(() => extractor.emit('end'))
    .catch(error => extractor.emit('error', error))

  return extractor
}

export {extractDepartement}
