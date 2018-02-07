const os = require('os')
const workerFarm = require('worker-farm')

const concurrency = Math.min(os.cpus().length, 8)

const mergeWorkers = workerFarm(
  {maxConcurrentCallsPerWorker: 1, maxRetries: 0, maxConcurrentWorkers: concurrency},
  require.resolve('./worker')
)

function mergeGeoJSONFiles(srcPattern, destPath) {
  return new Promise((resolve, reject) => {
    mergeWorkers({srcPattern, destPath}, err => {
      if (err) {
        return reject(err)
      }
      resolve()
    })
  })
}

module.exports = {mergeGeoJSONFiles}
