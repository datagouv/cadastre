'use strict'

const {promisify} = require('util')
const {dirname} = require('path')
const fs = require('fs')
const {ensureDir, remove} = require('fs-extra')

const glob = promisify(require('glob'))

const readdir = promisify(fs.readdir)
const rename = promisify(fs.rename)
const stat = promisify(fs.stat)
const writeFile = promisify(fs.writeFile)

const cache = new Set()

async function ensureDirectoryExists(path) {
  if (cache.has(path)) return
  await ensureDir(path)
}

async function recreateDirectory(path) {
  await remove(path)
  await ensureDir(path)
}

async function createFile(path, data) {
  const directory = dirname(path)
  await ensureDirectoryExists(directory)
  return writeFile(path, data, {mode: 0o644})
}

module.exports = {
  glob,
  readdir,
  rename,
  stat,
  ensureDirectoryExists,
  createFile,
  recreateDirectory
}
