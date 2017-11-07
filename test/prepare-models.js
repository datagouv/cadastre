'use strict'

const test = require('ava')
const {prepareSection, prepareParcelle} = require('../lib/convert/pci')

test('prepareSection', t => {
  t.is(prepareSection({
    feuille: '01123000AC01', geometry: {}, properties: {IDU: '123000AC'}
  }).properties.code, 'AC')
  t.is(prepareSection({
    feuille: '011230000Z01', geometry: {}, properties: {IDU: '1230000Z'}
  }).properties.code, 'Z')
})

test('prepareParcelle', t => {
  t.is(prepareParcelle({
    feuille: '01123000AC01', geometry: {}, properties: {IDU: '123000AC0001'}
  }).properties.numero, '1')
  t.is(prepareParcelle({
    feuille: '011230000Z01', geometry: {}, properties: {IDU: '1230000Z0650'}
  }).properties.numero, '650')
  t.throws(() => prepareParcelle({
    feuille: '01123000AC01', geometry: {}, properties: {IDU: null}
  }))
})
