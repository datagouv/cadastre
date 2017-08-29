'use strict'

const { resolve, join } = require('path')
const { readdir } = require('fs')
const { promisify } = require('util')

const Promise = require('bluebird')

const { createGeoJSONReadStream, createGeoJSONWriteStream } = require('../util/geo')
const { isCodeDepartement, isCodeCommune } = require('../util/codes')

const readdirAsync = promisify(readdir)


async function handler(workDir) {
  workDir = workDir ? resolve(workDir) : join(__dirname, '..', '..', '.tmp')
  const departementsPath = join(workDir, 'geojson', 'departements')

  const children = await readdirAsync(departementsPath)
  const departements = children.filter(isCodeDepartement)

  await Promise.each(departements, async departement => {
    await mergeDepartementCommunes(join(departementsPath, departement))
    console.log(' merged departement %d', departement)
  })
}

async function mergeDepartementCommunes(basePath) {
  const communesPath = join(basePath, 'communes')

  const children = await readdirAsync(communesPath)
  const communes = children.filter(isCodeCommune)

  const layers = {}

  await Promise.each(communes, async commune => {
    const communePath = join(communesPath, commune)
    const communeLayers = await readdirAsync(communePath)

    communeLayers
      .filter(p => p.endsWith('.json.gz'))
      .forEach(path => {
        const layerName = path.substring(0, path.length - 8)
        if (!(layerName in layers)) {
          layers[layerName] = []
        }
        layers[layerName].push(join(communePath, path))
      })
  })

  await Promise.all(Object.keys(layers).map(layerName => {
    return new Promise((resolve, reject) => {
      const layerPath = join(basePath, layerName + '.json.gz')
      const mergedStream = createGeoJSONWriteStream(layerPath)
      mergedStream.setMaxListeners(Infinity)

      let count = layers[layerName].length

      layers[layerName].forEach(srcFile => {
        const srcStream = createGeoJSONReadStream(srcFile)
        srcStream.pipe(mergedStream, { end: false })
        srcStream
          .on('error', reject)
          .on('end', () => {
            count--
            if (count === 0) mergedStream.end()
          })
      })

      mergedStream
        .on('error', reject)
        .on('finish', resolve)
    })
  }))
}

module.exports = handler
