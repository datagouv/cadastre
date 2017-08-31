#!/usr/bin/env node

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
    require('../lib/commands/prepare')(archivesDir, workDir).catch(boom)
  })

program
  .command('extract <workDir>')
  .description('extract features from EDIGÉO to GeoJSON')
  .option('--raw', 'Write raw features')
  .action((workdir, options) => {
    require('../lib/commands/extract')(workdir, options).catch(boom)
  })

program
  .command('merge <workDir>')
  .description('merge communes into departements')
  .action(workdir => {
    require('../lib/commands/merge')(workdir).catch(boom)
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
