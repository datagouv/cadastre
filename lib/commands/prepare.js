/* eslint no-process-exit: off */
'use strict'

const {join} = require('path')

const Promise = require('bluebird')
const decompress = require('decompress')

const {readdir, createFile, ensureDirectoryExists} = require('../util/fs')
const {WritableZipFile} = require('../util/zip')
const {feuillePath, departementArchivePath, feuillePathInArchive, departementsArchivesPath} = require('../distributions/dgfip-pci-vecteur')

const EDIGEO_RAW_FILE_PATTERN = /^edigeo([a-z0-9]{2})([a-z0-9]{10}).tar.bz2$/i

async function handler(archivesPath, targetPath) {
  const archives = await readdir(archivesPath)
  const depArchives = archives.filter(f => f.match(/dep([0-9A-Z]{2,3}).zip$/i))
  await ensureDirectoryExists(departementsArchivesPath(targetPath))

  for (const depArchive of depArchives) {
    const codeDep = depArchive.match(/dep([0-9A-Z]{2,3}).zip$/i)[1]
    const edigeoDepArchive = new WritableZipFile(departementArchivePath(targetPath, codeDep))

    console.log('  preparing departement %s', codeDep)
    console.time('  prepared departement ' + codeDep)

    const files = await decompress(join(archivesPath, depArchive), {strip: 10})

    await Promise.each(files, async file => {
      if (isFeuilleEdigeo(file.path)) {
        const feuille = getFeuilleFromFileName(file.path, codeDep)
        const targetFeuillePath = feuillePath(targetPath, feuille)
        edigeoDepArchive.addBuffer(file.data, feuillePathInArchive(feuille), {compress: false})
        return createFile(targetFeuillePath, file.data)
      }
    })

    await edigeoDepArchive.end()

    console.timeEnd('  prepared departement ' + codeDep)
  }
}

function isFeuilleEdigeo(fileName) {
  return Boolean(fileName.match(EDIGEO_RAW_FILE_PATTERN))
}

function getFeuilleFromFileName(fileName, codeDep) {
  return codeDep.substr(0, 2) + fileName.match(EDIGEO_RAW_FILE_PATTERN)[2]
}

module.exports = handler
