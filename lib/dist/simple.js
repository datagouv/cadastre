import {join} from 'node:path'
import {getCodeDep, isCodeDepartement} from '../util/codes.js'
import {globPromisified, readdir} from '../util/fs.js'

function departementPath(basePath, codeDep) {
  return join(basePath, 'etalab-cadastre', 'geojson', 'departements', codeDep)
}

function communePath(basePath, codeCommune) {
  const codeDep = getCodeDep(codeCommune)
  return join(basePath, 'etalab-cadastre', 'geojson', 'communes', codeDep, codeCommune)
}

function getGeoJSONPath(basePath) {
  return join(basePath, 'etalab-cadastre', 'geojson')
}

function getShapefilePath(basePath) {
  return join(basePath, 'etalab-cadastre', 'shp')
}

function getLayerPath(basePath, codeCommune, layerName) {
  return join(communePath(basePath, codeCommune), `cadastre-${codeCommune}-${layerName}.json.gz`)
}

function departementsPath(basePath) {
  return join(basePath, 'etalab-cadastre', 'geojson', 'communes')
}

async function listDepartements(basePath) {
  const directory = departementsPath(basePath)
  const entries = await readdir(directory)
  return entries.filter(entry => isCodeDepartement(entry))
}

async function listDepartementsFromDepartements(basePath) {
  const directory = join(basePath, 'etalab-cadastre', 'geojson', 'departements')
  const entries = await readdir(directory)
  return entries.filter(entry => isCodeDepartement(entry))
}

async function listLayerFilesByDepartement(basePath, layer, codeDep) {
  const cwd = join(basePath, 'etalab-cadastre', 'geojson', 'communes', codeDep)
  const relativePaths = await globPromisified(`**/cadastre-*-${layer}.json.gz`, {cwd})
  return relativePaths.map(path => join(cwd, path))
}

function departementLayerPath(basePath, layer, codeDep) {
  return join(departementPath(basePath, codeDep), `cadastre-${codeDep}-${layer}.json.gz`)
}

function francePath(basePath) {
  return join(basePath, 'etalab-cadastre', 'geojson', 'france')
}

function franceLayerPath(basePath, layer) {
  return join(francePath(basePath), `cadastre-france-${layer}.json.gz`)
}

export {getGeoJSONPath, getLayerPath, departementPath, communePath, listDepartements, listLayerFilesByDepartement, departementLayerPath, francePath, franceLayerPath, getShapefilePath, listDepartementsFromDepartements}
