import {EventEmitter} from 'node:events'
import bluebird from 'bluebird'
import debugFactory from 'debug'
import {stat} from '../util/fs.js'
import extractFeuille from './feuille.js'

const debug = debugFactory('cadastre')

async function extractCommune(edigeoTree, codeCommune) {
  try {
    const feuilles = await edigeoTree.listFeuillesByCommune(codeCommune)
    /* Progression */

    return await bluebird.mapSeries(feuilles, feuille => handleFeuille(edigeoTree, feuille))

  } catch (error) {
    console.log('error listFeuilles', error)
  }
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
