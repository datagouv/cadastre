#!/usr/bin/env node
const { resolve } = require('path')
const { promisify } = require('util')

const program = require('commander')
const ProgressBar = require('ascii-progress')
const mkdirp = require('mkdirp')

const { version } = require('../package.json')
const FileWriter = require('../lib/output/files')
const { extractFromBundle } = require('../lib/extract')

const mkdirpAsync = promisify(mkdirp)

program
  .version(version)
  .arguments('<depCode> <src> <dest>')
  .action(async (depCode, src, dest) => {
    const depSrc = resolve(process.cwd(), src, `./dep${depCode}.zip`)
    const depDest = resolve(process.cwd(), dest, `./dep${depCode}`)

    // Prepare output
    await mkdirpAsync(depDest)
    const writer = new FileWriter(depDest)

    const converter = extractFromBundle(depSrc, writer, depCode)
    let bar

    converter
      .on('end', () => writer.finish())
      .on('error', console.error)
      .on('start', () => {
        bar = new ProgressBar({
          schema: '  converting :depCode [:bar] :percent :etas',
          total: converter.total,
        })
        bar.update(0, { depCode })
      })
      .on('file:converted', () => bar.tick(1, { depCode }))
      .on('file:ignored', () => bar.tick(1, { depCode }))
  })
  .parse(process.argv)
