import os from 'os';
import { promisify } from 'util';
import workerFarm from 'worker-farm';

const concurrency = Math.min(os.cpus().length, 8)

const shpWorkers = workerFarm(
  {maxConcurrentCallsPerWorker: 1, maxRetries: 0, maxConcurrentWorkers: concurrency},
  require.resolve('./worker')
)

function convertToShape(srcPath, destPath, {layer, targetCrs}) {
  return new Promise((resolve, reject) => {
    shpWorkers({srcPath, destPath, layer, targetCrs}, err => {
      if (err) {
        return reject(err)
      }

      resolve()
    })
  })
}

function stopWorkers(cb) {
  workerFarm.end(shpWorkers, cb)
}

export {convertToShape, stopWorkers: promisify(stopWorkers)};
