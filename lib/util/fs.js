import {promisify} from 'node:util'
import {dirname} from 'node:path'
import fs from 'node:fs'
import {ensureDir, remove} from 'fs-extra'

import glob from 'glob'

const globPromisified = promisify(glob)

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

export {
  globPromisified,
  readdir,
  rename,
  stat,
  ensureDirectoryExists,
  createFile,
  recreateDirectory,
}
