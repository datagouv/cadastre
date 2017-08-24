const Promise = require('bluebird')
const moment = require('moment')
const { area } = require('@turf/turf')

const { createGeoJSONWritableStream } = require('../util/geo')

class FilesStorage {
  constructor(dest) {
    this.dest = dest
    this.layers = {}
    this.uniqueIndex = new Set()
  }

  registerUnique({ id }) {
    if (this.uniqueIndex.has(id)) return false
    this.uniqueIndex.add(id)
    return true
  }

  getLayer(layerName) {
    if (!(layerName in this.layers)) {
      this.layers[layerName] = createGeoJSONWritableStream(this.dest + '/' + layerName + '.json.gz')
    }
    return this.layers[layerName]
  }

  addToLayer(layerName, feature) {
    this.getLayer(layerName).write(feature)
  }

  handleFeatures(features) {
    features.forEach(f => this.handleFeature(f))
  }

  handleFeature(feature) {
    switch (feature.layer) {
      case 'commune': {
        const commune = this.prepareCommune(feature)
        if (this.registerUnique(commune)) {
          this.addToLayer('communes', commune)
        }
        break
      }
      case 'section': {
        const section = this.prepareSection(feature)
        if (this.registerUnique(section)) {
          this.addToLayer('sections', section)
        }
        break
      }
      case 'parcelle': {
        const parcelle = this.prepareParcelle(feature)
        this.addToLayer('parcelles', parcelle)
        break
      }
      case 'batiment': {
        const batiment = this.prepareBatiment(feature)
        this.addToLayer('batiments', batiment)
        break
      }
      default: {
        this.addToLayer(feature.layer, feature)
      }
    }
  }

  prepareCommune({ properties, geometry, codeCommune }) {
    const id = `fr:commune:${codeCommune}`
    const nom = properties.TEX2
    const dates = parseDates(properties)

    return {
      type: 'Feature',
      id,
      geometry,
      properties: { id, insee: codeCommune, nom, ...dates },
    }
  }

  prepareSection({ properties, geometry }) {
    const id = properties.IDU

    return {
      type: 'Feature',
      id,
      geometry,
      properties: { id, ...properties },
    }
  }

  prepareParcelle({ codeDep, properties, geometry }) {
    const parcelleProperties = {
      idu: codeDep.substr(0, 2) + properties.IDU,
      surface: Math.round(area({ type: 'Feature', properties, geometry })),
      creation: moment(properties.CREAT_DATE, 'YYYYMMDD').format('YYYY-MM-DD'),
      modification: moment(properties.UPDATE_DATE, 'YYYYMMDD').format('YYYY-MM-DD'),
    }
    return {
      type: 'Feature',
      properties: parcelleProperties,
      geometry,
    }
  }

  prepareBatiment({ properties, geometry }) {
    const batimentProperties = {}
    if (properties.TEX) batimentProperties.nom = properties.TEX
    Object.assign(batimentProperties, {
      type: properties.DUR === '01' ? 1 : 2,
      creation: moment(properties.CREAT_DATE, 'YYYYMMDD').format('YYYY-MM-DD'),
      modification: moment(properties.UPDATE_DATE, 'YYYYMMDD').format('YYYY-MM-DD'),
    })
    return {
      type: 'Feature',
      properties: batimentProperties,
      geometry,
    }
  }

  finish() {
    return new Promise((resolve, reject) => {
      const keys = Object.keys(this.layers)
      let count = keys.length
      const streams = keys.map(key => this.layers[key])
      streams.forEach(stream => {
        stream.on('finish', () => {
          count--
          if (count === 0) resolve()
        })
        stream.on('error', reject)
        stream.end()
      })
    })
  }

}

function parseDates(properties) {
  const result = {}
  if (properties.CREAT_DATE) {
    result.created = moment(properties.CREAT_DATE, 'YYYYMMDD').format('YYYY-MM-DD')
  }
  if (properties.UPDATE_DATE) {
    result.updated = moment(properties.UPDATE_DATE, 'YYYYMMDD').format('YYYY-MM-DD')
  }
  return result
}

module.exports = FilesStorage
