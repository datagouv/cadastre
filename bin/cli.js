#!/usr/bin/env node

const {resolve} = require('path')
const program = require('commander')
const updateNotifier = require('update-notifier')

const pkg = require('../package.json')
const BUNDLE_TYPES = require('../lib/bundle-types').BUNDLE_TYPES.map(bt => bt.name)

updateNotifier({pkg}).notify()

program
  .version(pkg.version)

program
  .command('import-pci <archivesDir> <workDir>')
  .description('Importer un bundle PCI dans l\'arborescence de travail')
  .option('--bundle [type]', 'Type de bundle source')
  .action((archivesDir, workDir, {bundle}) => {
    if (!workDir) throw new Error('workDir is required')
    workDir = resolve(workDir)
    if (!archivesDir) throw new Error('archivesDir is required')
    archivesDir = resolve(archivesDir)
    if (!bundle) throw new Error('--bundle est un paramètre obligatoire')
    if (!BUNDLE_TYPES.includes(bundle)) {
      throw new Error('Le type de bundle doit être parmi : ' + BUNDLE_TYPES.join(', '))
    }

    require('../lib/commands/import-pci')(archivesDir, workDir, bundle).catch(boom)
  })

program
  .command('extract-pci <workDir>')
  .description('extract features from EDIGÉO to GeoJSON')
  .option('--layers <layers>', 'select layers to extract (default: all)', val => val.split(','))
  .action((workDir, {layers}) => {
    if (!workDir) throw new Error('workDir is required')
    workDir = resolve(workDir)

    require('../lib/commands/extract-pci')(workDir, {layers}).catch(boom)
  })

program
  .command('extract-ems <archivePath> <workDir>')
  .description('Extraction des données cadastrales Ref 2000 de l\'EMS')
  .action((archivePath, workDir) => {
    if (!archivePath) throw new Error('archivePath is required')
    archivePath = resolve(archivePath)
    if (!workDir) throw new Error('workDir is required')
    workDir = resolve(workDir)

    require('../lib/commands/extract-ems')(archivePath, workDir).catch(boom)
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
