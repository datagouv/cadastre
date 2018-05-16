const {dirname} = require('path')
const {createGeoJSONWriteStream} = require('../util/geo')
const {ensureDirectoryExists} = require('../util/fs')

async function writeFeatures(features, path) {
  const directory = dirname(path)
  await ensureDirectoryExists(directory)
  return new Promise((resolve, reject) => {
    const file = createGeoJSONWriteStream(path)
    file.on('error', reject)
    file.on('finish', resolve)
    features.forEach(f => file.write(f))
    file.end()
  })
}

async function writeLayeredFeatures(layeredFeatures, pathPattern) {
  await Promise.all(Object.keys(layeredFeatures).map(layer => {
    const features = layeredFeatures[layer]
    const path = pathPattern.replace(/\{layer\}/g, layer)
    return writeFeatures(features, path)
  }))
}

module.exports = {writeLayeredFeatures}
