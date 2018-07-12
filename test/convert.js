const test = require('ava')
const {prepareSection} = require('../lib/convert/pci')

test('prepareSection', t => {
  const feature = {
    geometry: true,
    properties: {
      TEX: '0A',
      IDU: '0260000A',
      DATE_OBS: '2011-02-23',
      DATE_MAJ: '2014-02-28'
    }
  }
  t.deepEqual(prepareSection(feature, '010260000A01'), {
    type: 'Feature',
    id: '010260000A',
    geometry: true,
    properties: {
      id: '010260000A',
      commune: '01026',
      prefixe: '000',
      code: 'A',
      created: '2011-02-23',
      updated: '2014-02-28'
    }
  })
})
