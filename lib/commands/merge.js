'use strict'

const {join} = require('path')

const Promise = require('bluebird')

const {readdir} = require('../util/fs')
const {createGeoJSONReadStream, createGeoJSONWriteStream} = require('../util/geo')
const {isCodeDepartement, isCodeCommune} = require('../util/codes')

async function handler(workDir) {
  const departementsPath = join(workDir, 'geojson', 'departements')

  const children = await readdir(departementsPath)
  const departements = children.filter(isCodeDepartement)

  await Promise.each(departements, async departement => {
    console.log('  merging departement %s', departement)
    console.time('  merged departement ' + departement)
    await mergeDepartementCommunes(join(departementsPath, departement))
    console.timeEnd('  merged departement ' + departement)
  })
}

async function mergeDepartementCommunes(basePath) {
  const communesPath = join(basePath, 'communes')

  const children = await readdir(communesPath)
  const communes = children.filter(isCodeCommune)

  const layers = {}

  await Promise.each(communes, async commune => {
    const communePath = join(communesPath, commune)
    const communeLayers = await readdir(communePath)

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

  await Promise.each(Object.keys(layers), layerName => {
    return new Promise((resolve, reject) => {
      console.time('    * ' + layerName)
      const layerPath = join(basePath, layerName + '.json.gz')
      const mergedStream = createGeoJSONWriteStream(layerPath)
      mergedStream.setMaxListeners(Infinity)

      let count = layers[layerName].length

      layers[layerName].forEach(srcFile => {
        const srcStream = createGeoJSONReadStream(srcFile)
        srcStream.pipe(mergedStream, {end: false})
        srcStream
          .on('error', reject)
          .on('end', () => {
            count--
            if (count === 0) mergedStream.end()
          })
      })

      mergedStream
        .on('error', reject)
        .on('finish', () => {
          console.timeEnd('    * ' + layerName)
          resolve()
        })
    })
  })
}

module.exports = handler
