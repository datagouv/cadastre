import process from 'node:process'
import {join} from 'node:path'
import postprocessPrefixesSections from '../post-processing/prefixes-sections.js'
import {
  prepareCommune,
  prepareSection,
  prepareFeuille,
  prepareParcelle,
  prepareBatiment,
  prepareLieuDit,
  prepareSubdivisionFiscale,
} from '../convert/pci.js'
import {createAggregate} from '../aggregate/index.js'
import {communePath} from '../dist/simple.js'
import {Tree} from '../dist/pci.js'
import {writeLayeredFeatures} from '../writers/geojson.js'
import extractCommune from './commune.js'

const handlers = {
  COMMUNE: {renamedInto: 'communes', model: prepareCommune},
  SECTION: {renamedInto: 'sections', model: prepareSection},
  SUBDSECT: {renamedInto: 'feuilles', model: prepareFeuille},
  PARCELLE: {renamedInto: 'parcelles', model: prepareParcelle},
  BATIMENT: {renamedInto: 'batiments', model: prepareBatiment},
  LIEUDIT: {renamedInto: 'lieux_dits', model: prepareLieuDit},
  SUBDFISC: {renamedInto: 'subdivisions_fiscales', model: prepareSubdivisionFiscale},
}

export default async function extractWorker({basePath, codeCommune}, done) {
  const edigeoTree = new Tree(basePath, 'dgfip-pci-vecteur', 'edigeo')
  const destPath = communePath(basePath, codeCommune)
  // BUG: if you don't set the console.log below, it does not work
  console.log(codeCommune)

  const rawAggregate = createAggregate({idKey: 'properties.IDU'})
  const etalabAggregate = createAggregate({idKey: 'properties.id'})

  const extractor = extractCommune(edigeoTree, codeCommune)

  extractor
    .on('feuille', ({feuille, status, reason, layeredFeatures}) => {
      if (status === 'ok') {
        for (const layer of Object.keys(layeredFeatures)) {
          const rawFeatures = layeredFeatures[layer]
          if (layer in handlers) {
            const {model: prepareFeature, renamedInto} = handlers[layer]
            const features = rawFeatures.map(f => {
              try {
                return prepareFeature(f, feuille)
              } catch {
                return null
              }
            })
            etalabAggregate.addFeaturesToLayer(features, renamedInto)
          }

          rawAggregate.addFeaturesToLayer(rawFeatures, layer.toLowerCase())
        }
      } else if (status === 'ignored') {
        console.error('%s | feuille ignorée | %s', feuille, reason)
      }
    })
    .on('end', () => {
      postprocessPrefixesSections(etalabAggregate)
        .then(() => Promise.all([
          writeLayeredFeatures(
            etalabAggregate.getLayeredFeatures(),
            join(destPath, `cadastre-${codeCommune}-{layer}.json.gz`),
          ),
          writeLayeredFeatures(
            rawAggregate.getLayeredFeatures(),
            join(destPath, 'raw', `pci-${codeCommune}-{layer}.json.gz`),
          ),
        ]))
        .then(() => done())
        .catch(error => done(error))
    })
    .on('error', error => {
      console.error('Unable to extract commune %s', codeCommune)
      console.error(error)
      done(error)
    })
}

process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason)
})
