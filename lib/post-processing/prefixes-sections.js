const {chain, keyBy} = require('lodash')
const {truncate, cleanCoords} = require('@turf/turf')
const union = require('@turf/union').default
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
  let result
  features.forEach(f => {
    if (result) {
      result = union(result, f)
    } else {
      result = f
    }
  })
  return result
}

module.exports = postprocessPrefixesSections
