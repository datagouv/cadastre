import {get} from 'lodash-es'

class Aggregate {
  constructor({idKey}) {
    this._layeredFeatures = {}
    this._uniqueIndex = new Set()
    this._idKey = idKey
  }

  getId(feature) {
    return get(feature, this._idKey)
  }

  addFeaturesToLayer(features, layer) {
    for (const feature of features) this.addFeatureToLayer(feature, layer)
  }

  addFeatureToLayer(feature, layer) {
    if (!feature) {
      return
    }

    if (!(layer in this._layeredFeatures)) {
      this._layeredFeatures[layer] = []
    }

    const id = this.getId(feature)
    if (id) {
      const key = `${layer}:${id}`
      if (this._uniqueIndex.has(key)) {
        return
      }

      this._uniqueIndex.add(key)
    }

    this._layeredFeatures[layer].push(feature)
  }

  getLayeredFeatures() {
    return this._layeredFeatures
  }

  getFeatures(layer) {
    return this._layeredFeatures[layer]
  }
}

function createAggregate(options) {
  return new Aggregate(options)
}

export {Aggregate, createAggregate}
