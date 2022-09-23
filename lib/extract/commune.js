import {EventEmitter} from 'node:events'
import bluebird from 'bluebird'
import debugFactory from 'debug'
import {stat} from '../util/fs.js'
import extractFeuille from './feuille.js'

const debug = debugFactory('cadastre')

function extractCommune(edigeoTree, codeCommune) {
  const extractor = new EventEmitter()

  extractor.extracted = 0

  function progress({feuille, status, reason, layeredFeatures}) {
    extractor.extracted++
    extractor.emit('feuille', {feuille, reason, status, layeredFeatures})
  }

  edigeoTree.listFeuillesByCommune(codeCommune)
    .then(feuilles => {
      /* Progression */
      extractor.total = feuilles.length
      extractor.emit('start')

      return bluebird.mapSeries(feuilles, feuille => handleFeuille(edigeoTree, feuille)
        .then(progress))
    })
    .then(() => extractor.emit('end'))
    .catch(error => extractor.emit('error', error))

  return extractor
}

async function handleFeuille(edigeoTree, feuille) {
  debug('handle feuille %s', feuille)
  const filePath = edigeoTree.getFeuillePath(feuille)
  const fileSize = await stat(filePath).size

  if (fileSize < 4096) {
    return {feuille, status: 'ignored', reason: 'Empty EDIGÉO bundle'}
  }

  try {
    const layeredFeatures = await extractFeuille(edigeoTree, feuille)
    return {
      feuille,
      status: 'ok',
      layeredFeatures,
    }
  } catch (error) {
    if (error.message === 'Missing required files in EDIGÉO bundle') {
      return {feuille, status: 'ignored', reason: error.message}
    }

    throw error
  }
}

export default extractCommune
