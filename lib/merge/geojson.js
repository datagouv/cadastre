const {dirname} = require('path')

const {createGeoJSONReadStream, createGeoJSONWriteStream} = require('../util/geo')
const {ensureDirectoryExists, glob} = require('../util/fs')

async function mergeGeoJSONFiles(srcPattern, destPath) {
  console.log(`merging ${srcPattern} into ${destPath}`)

  const directory = dirname(destPath)
  const srcFiles = await glob(srcPattern)
  await ensureDirectoryExists(directory)

  return new Promise((resolve, reject) => {
    const mergedStream = createGeoJSONWriteStream(destPath)
    mergedStream.setMaxListeners(Infinity)

    let count = srcFiles.length

    srcFiles.forEach(srcPath => {
      const srcStream = createGeoJSONReadStream(srcPath)
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
      .on('finish', resolve)
  })
}

module.exports = {mergeGeoJSONFiles}
