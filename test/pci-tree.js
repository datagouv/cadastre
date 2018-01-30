const test = require('ava')
const {FORMATS} = require('../lib/dist/pci')

test('extractFeuille: edigeo', t => {
  const format = FORMATS.find(f => f.name === 'edigeo')
  t.is(format.extractFeuille('edigeo-12345000AB01.tar.bz2'), '12345000AB01')
})

test('extractFeuille: edigeo-cc', t => {
  const format = FORMATS.find(f => f.name === 'edigeo-cc')
  t.is(format.extractFeuille('edigeo-cc-12345000AB01.tar.bz2'), '12345000AB01')
})

test('extractFeuille: dxf', t => {
  const format = FORMATS.find(f => f.name === 'dxf')
  t.is(format.extractFeuille('dxf-12345000AB01.tar.bz2'), '12345000AB01')
})

test('extractFeuille: dxf-cc', t => {
  const format = FORMATS.find(f => f.name === 'dxf-cc')
  t.is(format.extractFeuille('dxf-cc-12345000AB01.tar.bz2'), '12345000AB01')
})

test('extractFeuille: tiff', t => {
  const format = FORMATS.find(f => f.name === 'tiff')
  t.is(format.extractFeuille('tiff-12345000AB01.zip'), '12345000AB01')
})

test('extractFeuille: mismatch', t => {
  const format = FORMATS.find(f => f.name === 'edigeo')
  t.is(format.extractFeuille('boom-12345000AB01.tar.bz2'), null)
})
