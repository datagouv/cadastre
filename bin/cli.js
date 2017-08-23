#!/usr/bin/env node
const { cpus } = require('os')

const program = require('commander')
const ProgressBar = require('ascii-progress')

const { version } = require('../package.json')
const Worker = require('../lib/worker/wrapper')

const numCPUs = cpus().length
const numWorkers = numCPUs

program
  .version(version)
  .arguments('<srcDir> <destDir>')
  .action((srcDir, destDir) => {
    const codeDeps = ['90', '89', '54', '92']
    const workers = []

    function eventuallyFinish() {
      if (workers.filter(w => !w.ready).length === 0) {
        console.log('Finished')
        process.exit(0)
      }
    }

    for (let i = 0; i < numWorkers; i++) {
      const worker = createWorker(srcDir, destDir)
      workers.push(worker)
      worker.on('ready', () => {
        if (codeDeps.length === 0) return eventuallyFinish()
        const codeDep = codeDeps.shift()
        worker.extractDepartement(codeDep)
      })
    }
  })
  .parse(process.argv)

function createWorker(srcDir, destDir) {
  const worker = new Worker(srcDir, destDir)

  let bar

  worker
    .on('start', ({ codeDep, total }) => {
      bar = new ProgressBar({
        schema: `  converting ${codeDep} [:bar] :percent :elapseds/:etas`,
        total,
      })
    })
    .on('planche', () => {
      bar.tick()
    })
    .on('end', () => {
      bar.clear()
    })
    .on('error', boom)

  return worker
}

function boom(err) {
  console.error(err)
  process.exit(1)
}
