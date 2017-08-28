'use strict'

const { mkdtemp } = require('fs')
const { tmpdir } = require('os')
const { join } = require('path')
const { promisify } = require('util')
const rimraf = require('rimraf')

const rimrafAsync = promisify(rimraf)
const mkdtempAsync = promisify(mkdtemp)

async function createTempDirectory() {
  const dirPath = await mkdtempAsync(join(tmpdir(), 'cadastre_'))
  let cleaned = false
  return {
    path: dirPath,
    clean: async () => {
      if (cleaned) return
      await rimrafAsync(dirPath)
      cleaned = true
    },
  }
}

module.exports = { createTempDirectory }
