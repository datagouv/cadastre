const {chain, keyBy} = require('lodash')
const {union, truncate, cleanCoords, polygon, multiPolygon} = require('@turf/turf')
const unstableUnion = require('martinez-polygon-clipping').union
const communes = keyBy(require('@etalab/cog/data/communes.json'), 'code')

function postprocessPrefixesSections(etalabAggregate) {
  const sections = etalabAggregate.getFeatures('sections')
  const prefixesSections = chain(sections)
    .groupBy(s => s.properties.prefixe)
    .map(sections => {
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
        if (ancienne in communes) {
          properties.ancienne = ancienne
          properties.nom = communes[ancienne].nom
        }
      }
      const prefixeSections = dissolve(sections)
      prefixeSections.properties = properties
      prefixeSections.id = id
      return cleanCoords(truncate(prefixeSections, {precision: 7, mutate: true}), {mutate: true})
    })
    .value()
  etalabAggregate.addFeaturesToLayer(prefixesSections, 'prefixes_sections')
}

function dissolve(features) {
  if (features.length === 0) {
    throw new Error('A least one feature must be passed to dissolve')
  }
  if (features.length === 1) {
    return features[0]
  }
  try {
    return union(...features)
  } catch (err) {
    console.error('JSTS union has failed: retrying with martinez')
    return martinezUnion(features)
  }
}

function martinezUnion(features) {
  let unioned
  features.forEach(f => {
    if (unioned) {
      unioned = unstableUnion(unioned, f.geometry.coordinates)
    } else {
      unioned = f.geometry.coordinates
    }
  })
  if (unioned.length === 0) {
    return null
  }
  if (unioned.length === 1) {
    return polygon(unioned[0], {})
  }
  return multiPolygon(unioned, {})
}

module.exports = postprocessPrefixesSections
