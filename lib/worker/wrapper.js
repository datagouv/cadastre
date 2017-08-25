'use strict'

const { fork } = require('child_process')
const { join } = require('path')
const { EventEmitter } = require('events')

let workerNum = 1

class WorkerWrapper extends EventEmitter {

  constructor(srcDir, destDir, writeRaw) {
    super()
    this.id = workerNum++
    this.srcDir = srcDir
    this.destDir = destDir
    this.writeRaw = writeRaw
    this.worker = fork(join(__dirname, 'child'))

    this.worker.on('message', ({ eventName, errorMessage, total, feuille, status }) => {
      if (eventName === 'ready') {
        this.ready = true
        return this.emit('ready')
      }
      if (eventName === 'start') {
        return this.emit('start', { total, codeDep: this.currentDepartement })
      }
      if (eventName === 'end') {
        return this.emit('end', { codeDep: this.currentDepartement })
      }
      if (eventName === 'feuille') {
        return this.emit('feuille', { feuille, status, codeDep: this.currentDepartement })
      }
      if (eventName === 'error') {
        return this.handleError(new Error(errorMessage))
      }
    })
  }

  handleError(err) {
    this.errored = true
    this.emit('error', err)
  }

  extractDepartement(codeDep) {
    if (!this.ready) throw new Error('Worker not ready yet!')
    if (this.errored) throw new Error('Worker errored')

    const src = join(this.srcDir, `dep${codeDep}.zip`)
    const dest = this.destDir

    this.currentDepartement = codeDep

    this.worker.send({
      action: 'extract',
      writeRaw: this.writeRaw,
      codeDep,
      src,
      dest,
    })
    this.ready = false
  }

}

module.exports = WorkerWrapper
