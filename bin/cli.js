#!/usr/bin/env node

const { resolve } = require('path')
const program = require('commander')
const updateNotifier = require('update-notifier')

const pkg = require('../package.json')

updateNotifier({ pkg }).notify()

program
  .version(pkg.version)

program
  .command('prepare <archivesDir> <workDir>')
  .description('prepare EDIGÉO files')
  .action((archivesDir, workDir) => {
    if (!workDir) throw new Error('workDir is required')
    workDir = resolve(workDir)
    if (!archivesDir) throw new Error('archivesDir is required')
    archivesDir = resolve(archivesDir)

    require('../lib/commands/prepare')(archivesDir, workDir).catch(boom)
  })

program
  .command('extract <workDir>')
  .description('extract features from EDIGÉO to GeoJSON')
  .option('--raw', 'Write raw features')
  .option('--layers <layers>', 'select layers to extract (default: all)', val => val.split(','))
  .action((workDir, { raw, layers }) => {
    if (!workDir) throw new Error('workDir is required')
    workDir = resolve(workDir)

    require('../lib/commands/extract')(workDir, { raw, layers }).catch(boom)
  })

program
  .command('merge <workDir>')
  .description('merge communes into departements')
  .action(workDir => {
    if (!workDir) throw new Error('workDir is required')
    workDir = resolve(workDir)

    require('../lib/commands/merge')(workDir).catch(boom)
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
