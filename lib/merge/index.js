const workerFarm = require('worker-farm')

const mergeWorkers = workerFarm(
  {maxConcurrentCallsPerWorker: 2},
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
