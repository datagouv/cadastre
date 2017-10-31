'use strict'

const {tmpdir} = require('os')
const {join} = require('path')

const {mkdtemp, rimraf} = require('./fs')

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

module.exports = {createTempDirectory}
