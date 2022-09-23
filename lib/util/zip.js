import {dirname} from 'node:path'
import fs from 'node:fs'
import yazl from 'yazl'
import {ensureDirectoryExists} from './fs.js'

class WritableZipFile {
  constructor(path) {
    this.path = path
  }

  // Archive is lazily created
  _createArchive() {
    if (this._zipFile) return
    this._zipFile = new yazl.ZipFile()
    const directory = dirname(this.path)

    this._promise = ensureDirectoryExists(directory)
      .then(() => new Promise((resolve, reject) => {
        this._zipFile.outputStream
          .pipe(fs.createWriteStream(this.path))
          .on('error', reject)
          .on('close', resolve)
      }))
    // TODO: Unhandled rejection
  }

  addBuffer(buffer, internalPath, options) {
    if (!this._zipFile) this._createArchive() // TODO: Unhandled rejection
    this._zipFile.addBuffer(buffer, internalPath, options || {})
  }

  addFile(path, internalPath, options) {
    if (!this._zipFile) this._createArchive() // TODO: Unhandled rejection
    this._zipFile.addFile(path, internalPath, options || {})
  }

  async end() {
    if (!this._zipFile) return
    this._zipFile.end()
    return this._promise
  }
}

export default {WritableZipFile}
