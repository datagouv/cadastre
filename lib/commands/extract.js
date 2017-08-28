/* eslint unicorn/no-process-exit: off */
'use strict'

const { resolve } = require('path')
const { readdir } = require('fs')
const { promisify } = require('util')

const ProgressBar = require('ascii-progress')

const readdirAsync = promisify(readdir)

async function handler(srcDir, destDir, { writeRaw, numWorkers }) {
  srcDir = resolve(srcDir)
  destDir = resolve(destDir)

  const Worker = numWorkers > 1 ?
    require('../worker/wrapper') :
    require('../worker/direct')

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
    const worker = createWorker(srcDir, destDir, writeRaw, Worker)
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
}

function createWorker(srcDir, destDir, writeRaw, Worker) {
  const worker = new Worker(srcDir, destDir, writeRaw)

  let bar

  worker
    .on('start', ({ codeDep, total }) => {
      bar = new ProgressBar({
        schema: `  converting ${codeDep} [:bar] :percent :elapseds/:etas`,
        total,
      })
    })
    .on('feuille', () => {
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

module.exports = handler
