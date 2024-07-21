import {convert} from 'geojson2shp'
import schemas from './schemas.js'

export default function shpWorker({srcPath, destPath, layer, targetCrs}) {
  try {
    return convert(srcPath, destPath, {layer, targetCrs, schema: schemas[layer]})
  } catch (error) {
    return error
  }
}
