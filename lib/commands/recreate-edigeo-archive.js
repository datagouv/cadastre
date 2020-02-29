const bluebird = require('bluebird')
const decompress = require('decompress')
const {reprojectArchive} = require('edigeo-reproject')
const {WritableZipFile} = require('../util/zip')

async function handler(src, dest, from, dep) {
  const files = await decompress(src, {strip: 10})
  const feuilles = files.filter(f => f.path.endsWith('.tar.bz2'))
  const reproject = f => reprojectArchive(f, dep, from === 'L93' ? 'L93toCC' : 'CCtoL93')
  const destArchive = new WritableZipFile(dest)
  await bluebird.map(feuilles, async f => {
    const buffer = await reproject(f.data)
    destArchive.addBuffer(buffer, f.path, {compress: false})
  }, {concurrency: 8})
  await destArchive.end()
  console.log('Terminé!')
}

module.exports = handler
