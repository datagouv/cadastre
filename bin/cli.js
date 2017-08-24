#!/usr/bin/env node
const { resolve } = require('path')
const { cpus } = require('os')
const { readdir } = require('fs')
const { promisify } = require('util')

const program = require('commander')
const ProgressBar = require('ascii-progress')

const { version } = require('../package.json')
const Worker = require('../lib/worker/wrapper')

const readdirAsync = promisify(readdir)
const numCPUs = cpus().length
const numWorkers = numCPUs

program
  .version(version)
  .arguments('<srcDir> <destDir>')
  .action(async (srcDir, destDir) => {
    srcDir = resolve(srcDir)
    destDir = resolve(destDir)

    const files = await readdirAsync(srcDir)

    const departementsFound = files
      .map(f => {
        const res = f.match(/^dep([0-9A-Z]{2,3}).zip$/)
        if (res) return res[1]
        return res ? res[1] : null
      })
      .filter(res => Boolean(res))

    const queued = [...departementsFound]
    const finished = []

    const workers = []

    function eventuallyFinish() {
      if (finished.length === departementsFound.length) {
        console.log('Finished')
        process.exit(0)
      }
    }

    for (let i = 0; i < numWorkers; i++) {
      const worker = createWorker(srcDir, destDir)
      workers.push(worker)
      worker.on('end', ({ codeDep }) => {
        finished.push(codeDep)
      })
      worker.on('ready', () => {
        if (queued.length === 0) return eventuallyFinish()
        const codeDep = queued.shift()
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
