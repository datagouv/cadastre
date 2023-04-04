import os from 'node:os'
import {createRequire} from 'node:module'
import {promisify} from 'node:util'
import {Piscina} from 'piscina'

const require = createRequire(import.meta.url)
const concurrency = Math.min(os.cpus().length, 8)

const shpWorkers = new Piscina({
  filename: new URL('./worker.js', import.meta.url).href,
})

function convertToShape(srcPath, destPath, {layer, targetCrs}) {
  return shpWorkers.run({srcPath, destPath, layer, targetCrs})
}

export {convertToShape}
