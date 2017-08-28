#!/usr/bin/env node
const { cpus } = require('os')

const program = require('commander')

const { version } = require('../package.json')

const numCPUs = cpus().length

program
  .version(version)

program
  .command('decompress <srcDir> <destDir>')
  .description('decompress DGFiP departements bundles')
  .action((srcDir, destDir) => {
    require('../lib/commands/decompress')(srcDir, destDir).catch(boom)
  })

program
  .command('extract <srcDir> <destDir>')
  .description('extract features from EDIGÉO to GeoJSON')
  .option('--write-raw', 'Write raw features')
  .option('--num-workers <n>', 'Number of workers', parseInt, numCPUs)
  .action((srcDir, destDir, options) => {
    require('../lib/commands/extract')(srcDir, destDir, options).catch(boom)
  })

program
  .parse(process.argv)

function boom(err) {
  console.error(err)
  process.exit(1)
}

process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason)
})
