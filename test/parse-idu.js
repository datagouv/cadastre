'use strict'

const test = require('ava')
const {parseParcelleIDU, parseSectionIDU} = require('../lib/convert/pci')

test('parseParcelleIDU', t => {
  t.deepEqual(parseParcelleIDU('123000AC0001'), {com: '123', prefix: '000', section: 'AC', parcelle: '0001'})
  t.throws(() => parseParcelleIDU('123000AC001')) // Too small
})

test('parseSectionIDU', t => {
  t.deepEqual(parseSectionIDU('123000AC'), {com: '123', prefix: '000', section: 'AC'})
  t.throws(() => parseParcelleIDU('123000AC001')) // Too long
})
