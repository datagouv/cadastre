#!/usr/bin/env node

const {resolve} = require('path')
const program = require('commander')

const pkg = require('../package.json')
const BUNDLE_TYPES = require('../lib/bundle-types').BUNDLE_TYPES.map(bt => bt.name)

program
  .version(pkg.version)

program
  .command('import-pci <archivesDir> <workDir>')
  .description('Importer un bundle PCI dans l\'arborescence de travail')
  .option('--bundle [type]', 'Type de bundle source')
  .option('--image', 'Importe les données Image')
  .action((archivesDir, workDir, {bundle, image}) => {
    if (!workDir) throw new Error('workDir is required')
    workDir = resolve(workDir)
    if (!archivesDir) throw new Error('archivesDir is required')
    archivesDir = resolve(archivesDir)
    if (!bundle) throw new Error('--bundle est un paramètre obligatoire')
    if (!BUNDLE_TYPES.includes(bundle)) {
      throw new Error('Le type de bundle doit être parmi : ' + BUNDLE_TYPES.join(', '))
    }

    require('../lib/commands/import-pci')(archivesDir, workDir, bundle, image).catch(boom)
  })

program
  .command('extract-pci <workDir>')
  .description('extract features from EDIGÉO to GeoJSON')
  .action(workDir => {
    if (!workDir) throw new Error('workDir is required')
    workDir = resolve(workDir)

    require('../lib/commands/extract-pci')(workDir)
  })

program
  .command('extract-ems <destPath>')
  .description('Extraction des données cadastrales de l\'EMS')
  .option('--rts <path>', 'chemin vers l’archive du Référentiel Topographique Simplifié (obligatoire)')
  .option('--parcelles <path>', 'chemin vers l’archive contenant les parcelles')
  .option('--sections <path>', 'chemin vers l’archive contenant les sections')
  .action((destPath, {rts, parcelles, sections}) => {
    if (!rts) throw new Error('Le chemin vers l’archive du Référentiel Topographique Simplifié est obligatoire')
    rts = resolve(rts)
    if (!parcelles) {
      throw new Error('Le chemin vers l’archive contenant les parcelles est obligatoire')
    }
    parcelles = resolve(parcelles)
    if (!sections) {
      throw new Error('Le chemin vers l’archive contenant les sections est obligatoire')
    }
    sections = resolve(sections)
    if (!destPath) throw new Error('Le chemin vers le répertoire de travail est obligatoire')
    destPath = resolve(destPath)

    require('../lib/commands/extract-ems')({rtsPath: rts, parcellesPath: parcelles, sectionsPath: sections}, destPath).catch(boom)
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
  .command('generate-shp <workDir>')
  .description('Génère les Shapefiles des départements')
  .action(workDir => {
    if (!workDir) throw new Error('workDir is required')
    workDir = resolve(workDir)

    require('../lib/commands/generate-shp')(workDir).catch(boom)
  })

program
  .command('recreate-edigeo-archive <src> <dest>')
  .description('Recrée une archive source EDIGÉO CC à partir de L93 et vice-versa')
  .option('--from <bundleType>', 'Type d’archive source : L93 ou CC')
  .option('--dep <dep>', 'Numéro du département de l’archive source')
  .action((src, dest, {from, dep}) => {
    if (!src) throw new Error('src is required')
    src = resolve(src)
    if (!dest) throw new Error('dest is required')
    dest = resolve(dest)
    if (!from || !['L93', 'CC'].includes(from)) throw new Error('from est obligatoire et doit être choisi parmi L93 ou CC')
    if (!dep) throw new Error('dep is required')

    require('../lib/commands/recreate-edigeo-archive')(src, dest, from, dep).catch(boom)
  })

program
  .parse(process.argv)

function boom(err) {
  console.error('Critical error: main process is now shutting down!')
  console.error(err)
  process.exit(1)
}

process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason)
})
