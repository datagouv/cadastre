import {dirname} from 'node:path'
import {createGeoJSONWriteStream} from '../util/geo.js'
import {ensureDirectoryExists} from '../util/fs.js'

async function writeFeatures(features, path) {
  const directory = dirname(path)
  await ensureDirectoryExists(directory)
  return new Promise((resolve, reject) => {
    const file = createGeoJSONWriteStream(path)
    file.on('error', reject)
    file.on('finish', resolve)
    for (const f of features) file.write(f)
    file.end()
  })
}

async function writeLayeredFeatures(layeredFeatures, pathPattern) {
  await Promise.all(Object.keys(layeredFeatures).map(layer => {
    const features = layeredFeatures[layer]
    const path = pathPattern.replace(/{layer}/g, layer)
    return writeFeatures(features, path)
  }))
}

export {writeLayeredFeatures}
