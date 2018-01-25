'use strict'

const {promisify} = require('util')
const {dirname} = require('path')
const fs = require('fs')

const mkdirp = promisify(require('mkdirp'))
const rimraf = promisify(require('rimraf'))
const glob = promisify(require('glob'))

const readdir = promisify(fs.readdir)
const rename = promisify(fs.rename)
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
  stat,
  ensureDirectoryExists,
  createFile,
  recreateDirectory
}
