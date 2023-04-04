import {createRequire} from 'node:module'
import os from 'node:os'
// import workerFarm from 'worker-farm'
import { Piscina } from 'piscina'

const require = createRequire(import.meta.url)
const concurrency = Math.min(os.cpus().length, 8)


const mergeWorkers = new Piscina({
  filename: new URL('./worker.js', import.meta.url).href
});

// const mergeWorkers = workerFarm(
//   {maxConcurrentCallsPerWorker: 1, maxRetries: 0, maxConcurrentWorkers: concurrency},
//   require.resolve('./worker'),
// )

function mergeGeoJSONFiles(srcPattern, destPath) {
  return mergeWorkers({srcPattern, destPath})
}

export {mergeGeoJSONFiles}
