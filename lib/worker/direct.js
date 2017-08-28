'use strict'

const { EventEmitter } = require('events')
const { join } = require('path')

const FileWriter = require('../output/files')
const extractDepartement = require('../extract/departement')

class DirectWorker extends EventEmitter {

  constructor(srcDir, destDir, writeRaw) {
    super()
    this.srcDir = srcDir
    this.destDir = destDir
    this.writeRaw = writeRaw

    setImmediate(() => this.emit('ready'))
  }

  extractDepartement(codeDep) {
    const writer = new FileWriter(this.destDir, this.writeRaw)
    const extractor = extractDepartement(this.srcDir, codeDep)

    extractor
      .on('start', () => {
        this.emit('start', { total: extractor.total, codeDep })
      })
      .on('feuille', ({ feuille, status, features }) => {
        writer.handleFeuille(feuille, features)
        this.emit('feuille', { feuille, status, codeDep })
      })
      .on('end', () => {
        writer.finish()
          .then(() => {
            this.emit('end', { codeDep })
            this.emit('ready')
          })
          .catch(boom)
      })
      .on('error', boom)
  }

}

function boom(err) {
  throw err
}

module.exports = DirectWorker
