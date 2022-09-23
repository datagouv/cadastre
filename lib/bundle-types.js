const TIFF_RAW_FILE_PATTERN = /^(\d{7})(\w{10})(\d{7}).tif$/i
const EDIGEO_RAW_FILE_PATTERN = /^edigeo([a-z\d]{2})([a-z\d]{10}).tar.bz2$/i
const DXF_RAW_FILE_PATTERN = /^dxf([a-z\d]{2})([a-z\d]{10}).tar.bz2$/i

function isFeuilleEdigeo(fileName) {
  return Boolean(EDIGEO_RAW_FILE_PATTERN.test(fileName))
}

function getFeuilleFromEdigeoFileName(fileName, codeDep) {
  return codeDep.slice(0, 2) + fileName.match(EDIGEO_RAW_FILE_PATTERN)[2]
}

function isFeuilleDxf(fileName) {
  return Boolean(DXF_RAW_FILE_PATTERN.test(fileName))
}

function getFeuilleFromDxfFileName(fileName, codeDep) {
  return codeDep.slice(0, 2) + fileName.match(DXF_RAW_FILE_PATTERN)[2]
}

function isFeuilleTiff(fileName) {
  return Boolean(TIFF_RAW_FILE_PATTERN.test(fileName))
}

function inspectTiffFileName(fileName, codeDep) {
  const [, prefix, feuilleSuffix, suffix] = fileName.match(TIFF_RAW_FILE_PATTERN)
  return {
    feuille: codeDep.slice(0, 2) + feuilleSuffix,
    georefFileName: `GEO_${prefix}${feuilleSuffix}${suffix}.TXT`,
    locFileName: `${prefix}${feuilleSuffix}.LOC`,
  }
}

const IMAGE_PROPS = {
  isImageFeuille: isFeuilleTiff,
  extractImageMeta: inspectTiffFileName,
}

const BUNDLE_TYPES = [
  {name: 'edigeo', isFeuille: isFeuilleEdigeo, extractFeuille: getFeuilleFromEdigeoFileName, ...IMAGE_PROPS},
  {name: 'edigeo-cc', isFeuille: isFeuilleEdigeo, extractFeuille: getFeuilleFromEdigeoFileName, ...IMAGE_PROPS},
  {name: 'dxf', isFeuille: isFeuilleDxf, extractFeuille: getFeuilleFromDxfFileName, ...IMAGE_PROPS},
  {name: 'dxf-cc', isFeuille: isFeuilleDxf, extractFeuille: getFeuilleFromDxfFileName, ...IMAGE_PROPS},
]

export default {
  BUNDLE_TYPES,
  IMAGE_PROPS,
  isFeuilleDxf,
  isFeuilleEdigeo,
  isFeuilleTiff,
  getFeuilleFromDxfFileName,
  getFeuilleFromEdigeoFileName,
  inspectTiffFileName,
}
