const {chain, keyBy} = require('lodash')
const {union, buffer, truncate, cleanCoords} = require('@turf/turf')
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
      const prefixeSections = union(...sections.map(s => buffer(s, 0.00001, {units: 'degrees'})))
      prefixeSections.properties = properties
      prefixeSections.id = id
      return cleanCoords(truncate(prefixeSections, {precision: 5, mutate: true}), {mutate: true})
    })
    .value()
  etalabAggregate.addFeaturesToLayer(prefixesSections, 'prefixes_sections')
}

module.exports = postprocessPrefixesSections
