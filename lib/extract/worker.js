const {join} = require('path')
const postprocessPrefixesSections = require('../post-processing/prefixes-sections')

const m = require('../convert/pci')
const {createAggregate} = require('../aggregate')
const {communePath} = require('../dist/simple')
const {Tree} = require('../dist/pci')
const {writeLayeredFeatures} = require('../writers/geojson')
const extractCommune = require('./commune')

const handlers = {
  COMMUNE: {renamedInto: 'communes', model: m.prepareCommune},
  SECTION: {renamedInto: 'sections', model: m.prepareSection},
  SUBDSECT: {renamedInto: 'feuilles', model: m.prepareFeuille},
  PARCELLE: {renamedInto: 'parcelles', model: m.prepareParcelle},
  BATIMENT: {renamedInto: 'batiments', model: m.prepareBatiment},
  LIEUDIT: {renamedInto: 'lieux_dits', model: m.prepareLieuDit},
  SUBDFISC: {renamedInto: 'subdivisions_fiscales', model: m.prepareSubdivisionFiscale}
}

module.exports = async function ({basePath, codeCommune, layers}, done) {
  const edigeoTree = new Tree(basePath, 'dgfip-pci-vecteur', 'edigeo')
  const destPath = communePath(basePath, codeCommune)

  const rawAggregate = createAggregate({idKey: 'properties.IDU'})
  const etalabAggregate = createAggregate({idKey: 'properties.id'})

  const extractor = extractCommune(edigeoTree, codeCommune)

  extractor
    .on('feuille', ({feuille, status, reason, layeredFeatures}) => {
      if (status === 'ok') {
        Object.keys(layeredFeatures).forEach(layer => {
          const rawFeatures = layeredFeatures[layer]
          if (layer in handlers) {
            const {model: prepareFeature, renamedInto} = handlers[layer]
            const features = rawFeatures.map(f => {
              try {
                return prepareFeature(f, feuille)
              } catch (err) {
                return null
              }
            })
            etalabAggregate.addFeaturesToLayer(features, renamedInto)
          }
          rawAggregate.addFeaturesToLayer(rawFeatures, layer.toLowerCase())
        })
      } else if (status === 'ignored') {
        console.error('%s | feuille ignorée | %s', feuille, reason)
      }
    })
    .on('end', () => {
      postprocessPrefixesSections(etalabAggregate)
      Promise.all([
        writeLayeredFeatures(
          etalabAggregate.getLayeredFeatures(),
          join(destPath, `cadastre-${codeCommune}-{layer}.json.gz`)
        ),
        writeLayeredFeatures(
          rawAggregate.getLayeredFeatures(),
          join(destPath, 'raw', `pci-${codeCommune}-{layer}.json.gz`)
        )
      ])
        .then(() => done())
        .catch(err => done(err))
    })
    .on('error', err => {
      console.error('Unable to extract commune %s', codeCommune)
      console.error(err)
      done(err)
    })
}

process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason)
})
