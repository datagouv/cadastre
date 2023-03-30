import test from 'ava'
import {parseParcelleIDU, parseSectionIDU} from '../lib/convert/pci.js'

test('parseParcelleIDU', t => {
  t.deepEqual(parseParcelleIDU('123000AC0001'), {com: '123', prefixe: '000', section: 'AC', parcelle: '0001'})
  t.throws(() => parseParcelleIDU('123000AC001')) // Too small
})

test('parseSectionIDU', t => {
  t.deepEqual(parseSectionIDU('123000AC'), {com: '123', prefixe: '000', section: 'AC'})
  t.deepEqual(parseSectionIDU('0260000A'), {com: '026', prefixe: '000', section: '0A'})
  t.throws(() => parseSectionIDU('123000AC001')) // Too long
})
