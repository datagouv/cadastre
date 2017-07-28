#!/usr/bin/env node
const yargs = require('yargs')
const path = require('path')
const FileWriter = require('./lib/output/files')
const { extractFromBundle } = require('./lib/extract')

yargs
  .usage('$0 <cmd> [args]')
    .command('extract srcBundle outDest', 'extract bundle into destination', {}, function (argv) {
      const writer = new FileWriter(path.resolve(process.cwd(), argv.outDest))

      extractFromBundle(path.resolve(process.cwd(), argv.srcBundle), writer)
        .then(() => writer.finish())
        .catch(console.error)
        .then(() => console.log('Finished!'))
    })
    .help()
    .argv
