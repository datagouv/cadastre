#!/usr/bin/env node
const { resolve } = require('path')
const { promisify } = require('util')

const program = require('commander')
const ProgressBar = require('ascii-progress')
const mkdirp = require('mkdirp')

const { version } = require('../package.json')
const FileWriter = require('../lib/output/files')
const extractDepartement = require('../lib/extract/departement')

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
    const extractor = extractDepartement(depSrc, codeDep)

    let bar

    extractor
      .on('end', () => writer.finish())
      .on('error', boom)
      .on('start', () => {
        bar = new ProgressBar({
          schema: '  converting :codeDep [:bar] :percent :etas',
          total: extractor.total,
        })
        bar.update(0, { codeDep })
      })
      .on('planche', ({ features }) => {
        bar.tick(1, { codeDep })
        if (features) {
          features.forEach(f => writer.writeFeature(f))
        }
      })
  })
  .parse(process.argv)

function boom(err) {
  console.error(err)
  process.exit(1)
}
