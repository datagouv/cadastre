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
  .arguments('<codeDep> <src> <dest>')
  .action(async (codeDep, src, dest) => {
    const depSrc = resolve(process.cwd(), src, `./dep${codeDep}.zip`)
    const depDest = resolve(process.cwd(), dest, `./dep${codeDep}`)

    // Prepare output
    await mkdirpAsync(depDest)
    const writer = new FileWriter(depDest)

    const converter = extractFromBundle(depSrc, writer, codeDep)
    let bar

    converter
      .on('end', () => writer.finish())
      .on('error', console.error)
      .on('start', () => {
        bar = new ProgressBar({
          schema: '  converting :codeDep [:bar] :percent :etas',
          total: converter.total,
        })
        bar.update(0, { codeDep })
      })
      .on('file:converted', () => bar.tick(1, { codeDep }))
      .on('file:ignored', () => bar.tick(1, { codeDep }))
  })
  .parse(process.argv)
