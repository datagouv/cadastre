/* eslint no-process-exit: off */
'use strict'

const { resolve, join } = require('path')
const { readdir, rename } = require('fs')
const { promisify } = require('util')

const mkdirp = require('mkdirp')
const Promise = require('bluebird')
const decompress = require('decompress')

const mkdirpAsync = promisify(mkdirp)
const readdirAsync = promisify(readdir)
const renameAsync = promisify(rename)

async function handler(srcDir, destDir) {
  srcDir = resolve(srcDir)
  destDir = resolve(destDir)

  const files = await readdirAsync(srcDir)
  const departements = getDepartements(files)

  await Promise.each(departements, async codeDep => {
    const depDir = join(destDir, 'departements', codeDep)
    await mkdirpAsync(depDir)

    /* Decompress */

    const archiveName = `dep${codeDep}.zip`
    const archivePath = join(srcDir, archiveName)

    await decompress(archivePath, depDir, { strip: 10 })

    /* Rename files */

    await renameFeuilleArchives(codeDep, depDir)

    console.log('  prepared departement %s', codeDep)
  })
}

const EDIGEO_RAW_FILE_PATTERN = /^edigeo([a-z0-9]{2})([a-z0-9]{3})([a-z0-9]{3})([a-z0-9]{2})([a-z0-9]{2}).tar.bz2$/i

async function renameFeuilleArchives(codeDep, depDir) {
  const files = await readdirAsync(depDir)
  const notRenamedFiles = files.filter(f => {
    const match = f.match(EDIGEO_RAW_FILE_PATTERN)
    if (!match) {
      console.log('unknown file: %s', f)
      return false
    }
    return true
  })
  await Promise.each(notRenamedFiles, async fileName => {
    const result = fileName.toUpperCase().match(EDIGEO_RAW_FILE_PATTERN)
    const originalPath = join(depDir, fileName)
    const newFileName = `${codeDep.substr(0, 2)}${result[2]}-${result[3]}-${result[4]}-${result[5]}.tar.bz2`
    const newPath = join(depDir, newFileName)
    await renameAsync(originalPath, newPath)
  })
}

function getDepartements(files) {
  return files
    .map(f => {
      const res = f.match(/^dep([0-9A-Z]{2,3}).zip$/)
      if (res) return res[1]
      return res ? res[1] : null
    })
    .filter(res => Boolean(res))
}

module.exports = handler
