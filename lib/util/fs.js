'use strict'

const {promisify} = require('util')
const {tmpdir} = require('os')
const {join, dirname} = require('path')
const fs = require('fs')

const mkdirp = promisify(require('mkdirp'))
const rimraf = promisify(require('rimraf'))
const glob = promisify(require('glob'))

const readdir = promisify(fs.readdir)
const rename = promisify(fs.rename)
const mkdtemp = promisify(fs.mkdtemp)
const stat = promisify(fs.stat)
const writeFile = promisify(fs.writeFile)

const cache = new Set()

async function ensureDirectoryExists(path) {
  if (cache.has(path)) return
  await mkdirp(path)
}

async function recreateDirectory(path) {
  await rimraf(path)
  await mkdirp(path)
}

async function createTempDirectory() {
  const dirPath = await mkdtemp(join(tmpdir(), 'cadastre_'))
  let cleaned = false
  return {
    path: dirPath,
    clean: async () => {
      if (cleaned) return
      await rimraf(dirPath)
      cleaned = true
    }
  }
}

async function createFile(path, data) {
  const directory = dirname(path)
  await ensureDirectoryExists(directory)
  return writeFile(path, data, {mode: 0o644})
}

module.exports = {
  mkdirp,
  rimraf,
  glob,
  readdir,
  rename,
  mkdtemp,
  stat,
  ensureDirectoryExists,
  createTempDirectory,
  createFile,
  recreateDirectory
}
