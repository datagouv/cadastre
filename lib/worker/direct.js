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
    const src = join(this.srcDir, `dep${codeDep}.zip`)
    const dest = this.destDir

    this.currentDepartement = codeDep

    const writer = new FileWriter(dest, this.writeRaw)
    const extractor = extractDepartement(src, codeDep)

    extractor
      .on('start', () => {
        this.emit('start', { total: extractor.total, codeDep: this.currentDepartement })
      })
      .on('feuille', ({ feuille, status, features }) => {
        writer.handleFeuille(feuille, features)
        this.emit('feuille', { feuille, status, codeDep: this.currentDepartement })
      })
      .on('end', () => {
        writer.finish()
          .then(() => {
            this.emit('end', { codeDep: this.currentDepartement })
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
