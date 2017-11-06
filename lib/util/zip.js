'use strict'

const fs = require('fs')
const yazl = require('yazl')

class WritableZipFile {

  constructor(path) {
    this._zipFile = new yazl.ZipFile()
    this._promise = new Promise((resolve, reject) => {
      this._zipFile.outputStream
        .pipe(fs.createWriteStream(path))
        .on('error', reject)
        .on('close', resolve)
    })
  }

  addBuffer(buffer, internalPath, options) {
    this._zipFile.addBuffer(buffer, internalPath, options || {})
  }

  end() {
    this._zipFile.end()
    return this._promise
  }

}

module.exports = {WritableZipFile}
