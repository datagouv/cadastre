'use strict'

const { EventEmitter } = require('events')

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
    const extractor = extractDepartement(this.srcDir, this.destDir, codeDep, this.writeRaw)

    extractor
      .on('start', () => {
        this.emit('start', { total: extractor.total, codeDep })
      })
      .on('commune', () => {
        this.emit('commune')
      })
      .on('end', () => {
        this.emit('end', { codeDep })
        this.emit('ready')
      })
      .on('error', boom)
  }

}

function boom(err) {
  throw err
}

module.exports = DirectWorker
