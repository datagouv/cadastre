import test from 'ava'
import {prepareSection, prepareParcelle} from '../lib/convert/pci.js'

test('prepareSection', t => {
  t.is(prepareSection({
    geometry: {}, properties: {IDU: '123000AC'},
  }, '01123000AC01').properties.code, 'AC')
  t.is(prepareSection({
    geometry: {}, properties: {IDU: '1230000Z'},
  }, '011230000Z01').properties.code, 'Z')
})

test('prepareParcelle', t => {
  t.is(prepareParcelle({
    geometry: {}, properties: {IDU: '123000AC0001'},
  }, '01123000AC01').properties.numero, '1')
  t.is(prepareParcelle({
    geometry: {}, properties: {IDU: '1230000Z0650'},
  }, '011230000Z01').properties.numero, '650')
  t.throws(() => prepareParcelle({
    geometry: {}, properties: {IDU: null},
  }, '01123000AC01'))
})
