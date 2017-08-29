#!/usr/bin/env node

const program = require('commander')

const { version } = require('../package.json')

program
  .version(version)

program
  .command('prepare [workDir]')
  .description('prepare EDIGÉO files')
  .action(workDir => {
    require('../lib/commands/prepare')(workDir).catch(boom)
  })

program
  .command('extract [workDir]')
  .description('extract features from EDIGÉO to GeoJSON')
  .option('--write-raw', 'Write raw features')
  .action((workdir, options) => {
    require('../lib/commands/extract')(workdir, options).catch(boom)
  })

program
  .command('merge [workDir]')
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
