'use strict'

const { promisify } = require('util')

const { readdir, rename, mkdtemp, stat } = require('fs')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')

exports.readdir = promisify(readdir)
exports.rename = promisify(rename)
exports.mkdtemp = promisify(mkdtemp)
exports.stat = promisify(stat)
exports.mkdirp = promisify(mkdirp)
exports.rimraf = promisify(rimraf)
