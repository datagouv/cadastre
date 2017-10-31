'use strict'

const test = require('ava')
const {parseLine} = require('../lib/parse/raw')

test('parseLine-COR', t => {
  const line = 'CORCC23:+579588.05;+6680876.27;'
  t.deepEqual(parseLine(line).parsedValue, [579588.05, 6680876.27])
})
