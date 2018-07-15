const TIFF_RAW_FILE_PATTERN = /^([0-9]{7})([a-z0-9_]{10})([0-9]{7}).TIF$/i
const EDIGEO_RAW_FILE_PATTERN = /^edigeo([a-z0-9]{2})([a-z0-9]{10}).tar.bz2$/i
const DXF_RAW_FILE_PATTERN = /^dxf([a-z0-9]{2})([a-z0-9]{10}).tar.bz2$/i

function isFeuilleEdigeo(fileName) {
  return Boolean(fileName.match(EDIGEO_RAW_FILE_PATTERN))
}

function getFeuilleFromEdigeoFileName(fileName, codeDep) {
  return codeDep.substr(0, 2) + fileName.match(EDIGEO_RAW_FILE_PATTERN)[2]
}

function isFeuilleDxf(fileName) {
  return Boolean(fileName.match(DXF_RAW_FILE_PATTERN))
}

function getFeuilleFromDxfFileName(fileName, codeDep) {
  return codeDep.substr(0, 2) + fileName.match(DXF_RAW_FILE_PATTERN)[2]
}

function isFeuilleTiff(fileName) {
  return Boolean(fileName.match(TIFF_RAW_FILE_PATTERN))
}

function inspectTiffFileName(fileName, codeDep) {
  const [, prefix, feuilleSuffix, suffix] = fileName.match(TIFF_RAW_FILE_PATTERN)
  return {
    feuille: codeDep.substr(0, 2) + feuilleSuffix,
    georefFileName: `GEO_${prefix}${feuilleSuffix}${suffix}.TXT`,
    locFileName: `${prefix}${feuilleSuffix}.LOC`
  }
}

const IMAGE_PROPS = {
  isImageFeuille: isFeuilleTiff,
  extractImageMeta: inspectTiffFileName
}

const BUNDLE_TYPES = [
  {name: 'edigeo', isFeuille: isFeuilleEdigeo, extractFeuille: getFeuilleFromEdigeoFileName, ...IMAGE_PROPS},
  {name: 'edigeo-cc', isFeuille: isFeuilleEdigeo, extractFeuille: getFeuilleFromEdigeoFileName, ...IMAGE_PROPS},
  {name: 'dxf', isFeuille: isFeuilleDxf, extractFeuille: getFeuilleFromDxfFileName, ...IMAGE_PROPS},
  {name: 'dxf-cc', isFeuille: isFeuilleDxf, extractFeuille: getFeuilleFromDxfFileName, ...IMAGE_PROPS}
]

module.exports = {
  BUNDLE_TYPES,
  IMAGE_PROPS,
  isFeuilleDxf,
  isFeuilleEdigeo,
  isFeuilleTiff,
  getFeuilleFromDxfFileName,
  getFeuilleFromEdigeoFileName,
  inspectTiffFileName
}
