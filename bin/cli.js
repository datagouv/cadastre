#!/usr/bin/env node
import process from 'node:process'
import {createRequire} from 'node:module'
import {resolve} from 'node:path'
import program from 'commander'

import importPciCmd from '../lib/commands/import-pci.js'
import extractPciCmd from '../lib/commands/extract-pci.js'
import extractEmsCmd from '../lib/commands/extract-ems.js'
import mergeCmd from '../lib/commands/merge.js'
import generateShpCmd from '../lib/commands/generate-shp.js'
import recreateEdigeoArchiveCmd from '../lib/commands/recreate-edigeo-archive.js'

const require = createRequire(import.meta.url)
const pkg = require('../package.json')

import {BUNDLE_TYPES} from '../lib/bundle-types.js'
const BUNDLE_TYPES_NAMES = BUNDLE_TYPES.map(bt => bt.name)


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
    if (!BUNDLE_TYPES_NAMES.includes(bundle)) {
      throw new Error('Le type de bundle doit être parmi : ' + BUNDLE_TYPES_NAMES.join(', '))
    }

    importPciCmd(archivesDir, workDir, bundle, image).catch(boom)
  })

program
  .command('extract-pci <workDir>')
  .description('extract features from EDIGÉO to GeoJSON')
  .action(workDir => {
    if (!workDir) throw new Error('workDir is required')
    workDir = resolve(workDir)

    extractPciCmd(workDir)
  })

program
  .command('extract-ems <destPath>')
  .description('Extraction des données cadastrales de l\'EMS')
  .option('--rts <path>', 'chemin vers l’archive du Référentiel Topographique Simplifié')
  .option('--parcellaire <path>', 'chemin vers l’archive contenant le référentiel parcellaire')
  .action((destPath, {rts, parcellaire}) => {
    if (!rts) {
      throw new Error('Le chemin vers l’archive du Référentiel Topographique Simplifié est obligatoire')
    }

    rts = resolve(rts)

    if (!parcellaire) {
      throw new Error('Le chemin vers l’archive contenant le référentiel parcellaire est obligatoire')
    }

    parcellaire = resolve(parcellaire)

    if (!destPath) {
      throw new Error('Le chemin vers le répertoire de travail est obligatoire')
    }

    destPath = resolve(destPath)

    extractEmsCmd({rtsPath: rts, parcellairePath: parcellaire}, destPath).catch(boom)
  })

program
  .command('merge <workDir>')
  .description('merge communes into departements')
  .action(workDir => {
    if (!workDir) throw new Error('workDir is required')
    workDir = resolve(workDir)

    mergeCmd(workDir).catch(boom)
  })

program
  .command('generate-shp <workDir>')
  .description('Génère les Shapefiles des départements')
  .action(workDir => {
    if (!workDir) throw new Error('workDir is required')
    workDir = resolve(workDir)

    generateShpCmd(workDir).catch(boom)
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

    recreateEdigeoArchiveCmd(src, dest, from, dep).catch(boom)
  })

program
  .parse(process.argv)

function boom(error) {
  console.error('Critical error: main process is now shutting down!')
  console.error(error)
  process.exit(1)
}

process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason)
})
