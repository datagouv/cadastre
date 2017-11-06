/* eslint no-process-exit: off */
'use strict'

const {join} = require('path')

const Promise = require('bluebird')
const decompress = require('decompress')
const {keyBy} = require('lodash')

const {readdir, createFile, ensureDirectoryExists} = require('../util/fs')
const {WritableZipFile} = require('../util/zip')
const {Tree} = require('../dist/pci')

async function handler(archivesPath, targetPath, dxfMode) {
  const archives = await readdir(archivesPath)
  const depArchives = archives.filter(f => f.match(/dep([0-9A-Z]{2,3}).zip$/i))

  // Init all trees
  const edigeoTree = new Tree(targetPath, 'dgfip-pci-vecteur', 'edigeo')
  const tiffTree = new Tree(targetPath, 'dgfip-pci-image', 'tiff')
  const dxfTree = new Tree(targetPath, 'dgfip-pci-vecteur', 'dxf')

  if (dxfMode) {
    await ensureDirectoryExists(dxfTree.getDepartementsArchivesPath())
  } else {
    await Promise.all([
      ensureDirectoryExists(edigeoTree.getDepartementsArchivesPath()),
      ensureDirectoryExists(tiffTree.getDepartementsArchivesPath())
    ])
  }

  for (const depArchive of depArchives) {
    const codeDep = depArchive.match(/dep([0-9A-Z]{2,3}).zip$/i)[1]

    // Init all departement archives
    const edigeoDepArchive = new WritableZipFile(edigeoTree.getDepartementArchivePath(codeDep))
    const tiffDepArchive = new WritableZipFile(tiffTree.getDepartementArchivePath(codeDep))
    const dxfDepArchive = new WritableZipFile(dxfTree.getDepartementArchivePath(codeDep))

    console.log('  importing departement %s', codeDep)
    console.time('  imported departement ' + codeDep)

    const files = await decompress(join(archivesPath, depArchive), {strip: 10})
    const indexedFiles = keyBy(files, 'path')

    await Promise.each(files, async file => {
      // PCI Vecteur - EDIGÉO
      if (!dxfMode && isFeuilleEdigeo(file.path)) {
        const feuille = getFeuilleFromEdigeoFileName(file.path, codeDep)
        const targetFeuillePath = edigeoTree.getFeuillePath(feuille)
        edigeoDepArchive.addBuffer(file.data, edigeoTree.getFeuillePathInArchive(feuille), {compress: false})
        return createFile(targetFeuillePath, file.data)
      }

      // PCI Image - TIFF
      if (!dxfMode && isFeuilleTiff(file.path)) {
        const {feuille, georefFileName, locFileName} = inspectTiffFileName(file.path, codeDep)
        const feuilleArchivePath = tiffTree.getFeuillePath(feuille)
        const feuilleArchive = new WritableZipFile(feuilleArchivePath)
        feuilleArchive.addBuffer(file.data, file.path)
        if (georefFileName in indexedFiles) {
          const georefFile = indexedFiles[georefFileName]
          feuilleArchive.addBuffer(georefFile.data, georefFileName)
        }
        if (locFileName in indexedFiles) {
          const locFile = indexedFiles[locFileName]
          feuilleArchive.addBuffer(locFile.data, locFileName)
        }
        await feuilleArchive.end()
        tiffDepArchive.addFile(feuilleArchivePath, tiffTree.getFeuillePathInArchive(feuille), {compress: false})
        return
      }

      // PCI Vecteur - DXF
      if (dxfMode && isFeuilleDxf(file.path)) {
        const feuille = getFeuilleFromDxfFileName(file.path, codeDep)
        const targetFeuillePath = dxfTree.getFeuillePath(feuille)
        dxfDepArchive.addBuffer(file.data, dxfTree.getFeuillePathInArchive(feuille), {compress: false})
        return createFile(targetFeuillePath, file.data)
      }
    })

    await edigeoDepArchive.end()
    await tiffDepArchive.end()
    await dxfDepArchive.end()

    console.timeEnd('  imported departement ' + codeDep)
  }
}

/* Helpers */

const EDIGEO_RAW_FILE_PATTERN = /^edigeo([a-z0-9]{2})([a-z0-9]{10}).tar.bz2$/i

function isFeuilleEdigeo(fileName) {
  return Boolean(fileName.match(EDIGEO_RAW_FILE_PATTERN))
}

function getFeuilleFromEdigeoFileName(fileName, codeDep) {
  return codeDep.substr(0, 2) + fileName.match(EDIGEO_RAW_FILE_PATTERN)[2]
}

const DXF_RAW_FILE_PATTERN = /^dxf([a-z0-9]{2})([a-z0-9]{10}).tar.bz2$/i

function isFeuilleDxf(fileName) {
  return Boolean(fileName.match(DXF_RAW_FILE_PATTERN))
}

function getFeuilleFromDxfFileName(fileName, codeDep) {
  return codeDep.substr(0, 2) + fileName.match(DXF_RAW_FILE_PATTERN)[2]
}

const TIFF_RAW_FILE_PATTERN = /^([0-9]{7})([a-z0-9_]{10})([0-9]{7}).TIF$/i

function isFeuilleTiff(fileName) {
  return Boolean(fileName.match(TIFF_RAW_FILE_PATTERN))
}

function inspectTiffFileName(fileName, codeDep) {
  const [, prefix, feuilleSuffix, suffix] = fileName.match(TIFF_RAW_FILE_PATTERN)
  return {
    feuille: codeDep.substr(0, 2) + feuilleSuffix,
    georefFileName: `GEO_${prefix}${feuilleSuffix}${suffix}.TXT`,
    locFileName: `${prefix}${feuilleSuffix}.LOC`
  }
}

module.exports = handler
