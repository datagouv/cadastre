'use strict'

const test = require('ava')
const { prepareSection, prepareParcelle } = require('../lib/models')

test('prepareSection', t => {
  t.is(prepareSection({
    codeDep: '01', geometry: {}, properties: { IDU: '123000AC' },
  }).properties.code, 'AC')
  t.is(prepareSection({
    codeDep: '01', geometry: {}, properties: { IDU: '1230000Z' },
  }).properties.code, 'Z')
})

test('prepareParcelle', t => {
  t.is(prepareParcelle({
    codeDep: '01', geometry: {}, properties: { IDU: '123000AC0001' },
  }).properties.numero, '1')
  t.is(prepareParcelle({
    codeDep: '01', geometry: {}, properties: { IDU: '1230000Z0650' },
  }).properties.numero, '650')
})
