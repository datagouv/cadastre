import {dirname} from 'node:path'
import {createGeoJSONReadStream, createGeoJSONWriteStream} from '../util/geo.js'
import {ensureDirectoryExists} from '../util/fs.js'

async function mergeGeoJSONFiles(srcFiles, destPath) {
  console.log(`merging ${srcFiles.join(', ')} into ${destPath}`)

  const directory = dirname(destPath)
  await ensureDirectoryExists(directory)

  return new Promise((resolve, reject) => {
    const mergedStream = createGeoJSONWriteStream(destPath)
    mergedStream.setMaxListeners(Number.POSITIVE_INFINITY)

    mergedStream
      .on('error', reject)
      .on('finish', resolve)

    let count = srcFiles.length

    if (count === 0) {
      mergedStream.end()
    }

    for (const srcPath of srcFiles) {
      const srcStream = createGeoJSONReadStream(srcPath)
      srcStream.pipe(mergedStream, {end: false})
      srcStream
        .on('error', reject)
        .on('end', () => {
          count--
          if (count === 0) mergedStream.end()
        })
    }
  })
}

export {mergeGeoJSONFiles}
