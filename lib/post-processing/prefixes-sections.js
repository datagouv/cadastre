const {groupBy, keyBy} = require('lodash')
const {union, truncate, cleanCoords, polygon, multiPolygon} = require('@turf/turf')
const mapshaper = require('mapshaper')
const communesAnciennes = keyBy(
  require('@etalab/decoupage-administratif/data/communes.json').filter(c => c.type !== 'commune-actuelle'),
  'code'
)

async function postprocessPrefixesSections(etalabAggregate) {
  const sections = etalabAggregate.getFeatures('sections')
  const groupedSections = groupBy(sections, s => s.properties.prefixe)
  const prefixesSections = await Promise.all(Object.keys(groupedSections).map(async k => {
    const sections = groupedSections[k]
    const [s] = sections
    const {commune, prefixe} = s.properties
    const id = commune + prefixe
    const properties = {
      id,
      commune,
      prefixe
    }
    if (prefixe !== '000') {
      const ancienne = commune.substring(0, 2) + prefixe
      if (ancienne in communesAnciennes) {
        properties.ancienne = ancienne
        properties.nom = communesAnciennes[ancienne].nom
      }
    }

    const prefixeSections = await dissolve(sections)

    if (!prefixeSections) {
      console.log('Unable to process layer prefixe_sections')
      return
    }

    prefixeSections.properties = properties
    prefixeSections.id = id
    return cleanCoords(truncate(prefixeSections, {precision: 7, mutate: true}), {mutate: true})
  }))
  etalabAggregate.addFeaturesToLayer(prefixesSections.filter(Boolean), 'prefixes_sections')
}

async function dissolve(features) {
  if (features.length === 0) {
    throw new Error('A least one feature must be passed to dissolve')
  }

  if (features.length === 1) {
    return {...features[0]}
  }

  try {
    return union(...features)
  } catch (error) {
    console.error('JSTS union has failed: retrying with mapshaper')
    return mapshaperUnion(features)
  }
}

async function mapshaperUnion(features) {
  const input = JSON.stringify({type: 'FeatureCollection', features})
  const cmd = '-i input.geojson -dissolve2 -o output.geojson'

  return new Promise((resolve, reject) => {
    mapshaper.applyCommands(cmd, {'input.geojson': input}, (err, output) => {
      if (err) {
        return reject(err)
      }

      const {geometries} = JSON.parse(output['output.geojson'])
      const polygons = geometries.filter(g => g.type === 'Polygon').map(g => g.coordinates)
      if (polygons.length === 0) {
        return resolve(null)
      }

      if (polygons.length === 1) {
        return resolve(polygon(polygons[0], {}))
      }

      return resolve(multiPolygon(polygons, {}))
    })
  })
}

module.exports = postprocessPrefixesSections
