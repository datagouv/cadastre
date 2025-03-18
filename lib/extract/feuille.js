import {parse} from '@etalab/edigeo-parser'

async function extractFeuille(edigeoTree, feuille) {
  const filePath = edigeoTree.getFeuillePath(feuille)

  const parseOptions = {bundle: feuille}

  const {layers} = await parse(filePath, parseOptions)

  return layers
}

export default extractFeuille
