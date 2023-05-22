import os from 'node:os'
import {createRequire} from 'node:module'
import {promisify} from 'node:util'
import workerFarm from 'worker-farm'

const require = createRequire(import.meta.url)
const concurrency = Math.min(os.cpus().length, 8)

const shpWorkers = workerFarm(
  {maxConcurrentCallsPerWorker: 1, maxRetries: 0, maxConcurrentWorkers: concurrency},
  require.resolve('./worker'),
)

function convertToShape(srcPath, destPath, {layer, targetCrs}) {
  return new Promise((resolve, reject) => {
    shpWorkers({srcPath, destPath, layer, targetCrs}, error => {
      if (error) {
        return reject(error)
      }

      resolve()
    })
  })
}

const stopWorkers = promisify(cb => {
  workerFarm.end(shpWorkers, cb)
})

export {convertToShape, stopWorkers}
