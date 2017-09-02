const fs = require('fs')
const { extname } = require('path')
const split = require('split')
const Promise = require('bluebird')
const debug = require('debug')('cadastre')

function extractHeader(line) {
  return {
    code: line.substr(0, 3),
    valueType: line.substr(3, 1),
    valueFormat: line.substr(4, 1),
    valueSize: parseInt(line.substr(5, 2), 10),
  }
}

const FORMAT_PARSERS = {
  C: rawValue => parseFloat(rawValue),
  R: rawValue => parseFloat(rawValue),
  I: rawValue => parseInt(rawValue, 10),
  N: rawValue => parseInt(rawValue, 10),
  D: rawValue => {
    if (rawValue.length !== 8) return
    return `${rawValue.substr(0, 4)}-${rawValue.substr(4, 2)}-${rawValue.substr(6, 2)}`
  },
}

function parseValue({ valueType, valueFormat, valueSize }, rawValue) {
  if (rawValue.length !== valueSize) {
    debug('[WARN] value size mismatch')
  }

  const formatParse = (valueFormat in FORMAT_PARSERS) ? FORMAT_PARSERS[valueFormat] : x => x

  if (valueType === 'C') return rawValue.split(';').filter(v => Boolean(v)).map(formatParse)
  return formatParse(rawValue)
}

function parseLine(line) {
  if (!line) return

  // Extract header
  const header = extractHeader(line)

  // Extract value
  const rawValue = line.substr(8)
  const parsedValue = parseValue(header, rawValue)

  return Object.assign({}, header, { rawValue, parsedValue })
}

class DescriptorBlock {
  constructor(registry) {
    this.registry = registry
    this.attributes = {}
    this.relatedObjects = []
  }

  addLine(line) {
    if (line.code === 'TEX') return
    if (line.code === 'RTY') {
      this.type = line.parsedValue
    }
    if (line.code === 'RID') {
      this.id = line.parsedValue
    }
    if (line.code === 'SCP') {
      if (line.parsedValue[2] === 'ASS') {
        this.associationType = line.parsedValue[3]
      }
      if (line.parsedValue[2] === 'OBJ') {
        this.objectType = line.parsedValue[3]
      }
    }
    if (line.code === 'FTP') {
      this.relatedObjects.push(line.parsedValue[3])
    }
    if (line.code === 'ATP') {
      if (this.capturingAttribute) {
        debug('[WARN] Already capturing attribute')
      } else {
        this.capturingAttribute = line.parsedValue[3]
      }
    }
    if (line.code === 'ATV') {
      if (this.capturingAttribute) {
        this.attributes[this.capturingAttribute] = line.parsedValue
        this.capturingAttribute = undefined
      } else {
        debug('[WARN] Found orphean attribute')
      }
    }
    if (this.type === 'GEO' && line.code === 'REL') {
      this.srsCode = line.parsedValue
    }
  }

  addToRegistry() {
    if (!this.registry) return
    if (!this.id) {
      debug('[WARN] Descriptor block cannot be registered: No ID found')
    } else if (this.id in this.registry.items) {
      debug('[WARN] Descriptor block cannot be registered: Existing record with same ID: %s', this.id)
    } else if (this.type === 'GEO') {
      this.registry.srsCode = this.srsCode
    } else {
      this.registry.items[this.id] = this
    }
  }

  toJSON() {
    const { id, type, objectType, associationType, attributes, relatedObjects } = this
    return { id, type, objectType, associationType, attributes, relatedObjects }
  }

  finish() {
    this.addToRegistry()
  }
}

function parseFile(path, registry) {
  debug('Start parsing %s', path)

  return new Promise((resolve, reject) => {
    let currentDescriptorBlock

    fs.createReadStream(path)
       .pipe(split())
       .on('data', line => {
         const parsedLine = parseLine(line)
         if (!parsedLine) return
         if (['BOM', 'CSE', 'EOM'].includes(parsedLine.code)) return

         if (parsedLine.code === 'RTY') {
           if (currentDescriptorBlock) {
             currentDescriptorBlock.finish()
           }
           currentDescriptorBlock = new DescriptorBlock(registry)
           currentDescriptorBlock.addLine(parsedLine)
         } else {
           currentDescriptorBlock.addLine(parsedLine)
         }
       })
       .on('error', reject)
       .on('end', () => {
         currentDescriptorBlock.finish()
         resolve()
       })
  })
}

function parsePackage(path) {
  const fileNames = fs.readdirSync(path)
    .filter(fileName => ['E', 'A'].includes(fileName.charAt(0)))
    .filter(fileName => ['.THF', '.GEO', '.VEC'].includes(extname(fileName)))
  debug('Found %d files', fileNames.length)

  const registry = { items: {} }

  return Promise.each(fileNames, fileName => parseFile(path + '/' + fileName, registry))
    .then(() => registry)
}

module.exports = { parseLine, parseFile, parsePackage }
