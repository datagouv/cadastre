/* eslint no-process-exit: off */
import {join} from 'node:path'
import bluebird from 'bluebird'
import decompress from 'decompress'
import {keyBy, mapValues} from 'lodash-es'
import {readdir, createFile, ensureDirectoryExists} from '../util/fs.js'
import {WritableZipFile} from '../util/zip.js'
import {Tree} from '../dist/pci.js'
import {BUNDLE_TYPES} from '../bundle-types.js'

async function handler(archivesPath, targetPath, bundleTypeName, image) {
  const archives = await readdir(archivesPath)
  const depArchives = archives.filter(f => f.match(/dep([\da-z]{2,3}).zip$/i))
  const bundleType = BUNDLE_TYPES.find(bt => bt.name === bundleTypeName)

  // Init all trees
  const trees = {bundle: new Tree(targetPath, 'dgfip-pci-vecteur', bundleType.name)}
  if (image) {
    trees.image = new Tree(targetPath, 'dgfip-pci-image', 'tiff')
  }

  // Ensure fs is ready
  await Promise.all(Object.values(trees).map(
    tree => ensureDirectoryExists(tree.getDepartementsArchivesPath()),
  ))

  await bluebird.mapSeries(depArchives, async depArchive => {
    const codeDep = depArchive.match(/dep([\da-z]{2,3}).zip$/i)[1]

    const archives = mapValues(
      trees,
      tree => new WritableZipFile(tree.getDepartementArchivePath(codeDep)),
    )

    console.log('  start importing departement %s', codeDep)
    console.time('  imported departement ' + codeDep)

    const files = await decompress(join(archivesPath, depArchive), {strip: 10})
    const indexedFiles = keyBy(files, 'path')

    await Promise.all(files.map(async file => {
      // Regular bundle
      if (bundleType.isFeuille(file.path)) {
        const feuille = bundleType.extractFeuille(file.path, codeDep)
        const targetFeuillePath = trees.bundle.getFeuillePath(feuille)
        archives.bundle.addBuffer(file.data, trees.bundle.getFeuillePathInArchive(feuille), {compress: false})
        return createFile(targetFeuillePath, file.data)
      }

      // Image
      if (image && bundleType.isImageFeuille(file.path)) {
        const {feuille, georefFileName, locFileName} = bundleType.extractImageMeta(file.path, codeDep)
        const feuilleArchivePath = trees.image.getFeuillePath(feuille)
        const feuilleArchive = new WritableZipFile(feuilleArchivePath)
        feuilleArchive.addBuffer(file.data, file.path)
        if (georefFileName in indexedFiles) {
          const georefFile = indexedFiles[georefFileName]
          feuilleArchive.addBuffer(georefFile.data, georefFileName)
        }

        if (locFileName in indexedFiles) {
          const locFile = indexedFiles[locFileName]
          feuilleArchive.addBuffer(locFile.data, locFileName)
        }

        await feuilleArchive.end()
        archives.image.addFile(feuilleArchivePath, trees.image.getFeuillePathInArchive(feuille), {compress: false})
      }
    }))

    // Flush open archives
    await Promise.all(Object.values(archives).map(archive => archive.end()))

    console.timeEnd('  imported departement ' + codeDep)
  })
}

export default handler
