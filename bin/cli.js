#!/usr/bin/env node
const { cpus } = require('os')

const program = require('commander')

const { version } = require('../package.json')


const numCPUs = cpus().length

program
  .version(version)

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
  })

program
  .command('extract <srcDir> <destDir>')
  .description('extract features from EDIGÉO to GeoJSON')
  .option('--write-raw', 'Write raw features')
  .option('--num-workers <n>', 'Number of workers', parseInt, numCPUs)
  .action((srcDir, destDir, options) => {
    require('../lib/commands/extract')(srcDir, destDir, options)
  })

program
  .parse(process.argv)
