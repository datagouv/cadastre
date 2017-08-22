#!/usr/bin/env node
const path = require('path')
const program = require('commander')
const ProgressBar = require('ascii-progress')
const { version } = require('../package.json')
const FileWriter = require('../lib/output/files')
const { extractFromBundle } = require('../lib/extract')

program
  .version(version)
  .arguments('<depCode> <srcBundle> <outDest>')
  .action((depCode, srcBundle, outDest) => {
    const writer = new FileWriter(path.resolve(process.cwd(), outDest))

    const converter = extractFromBundle(path.resolve(process.cwd(), srcBundle), writer, depCode)
    let bar

    converter
      .on('end', () => writer.finish())
      .on('error', console.error)
      .on('start', () => {
        bar = new ProgressBar({
          schema: '  converting [:bar] :percent :etas',
          total: converter.total,
        })
      })
      .on('file:converted', () => bar.tick())
      .on('file:ignored', () => bar.tick())
  })
  .parse(process.argv)
