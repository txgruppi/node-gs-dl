#!/usr/bin/env node

var CLI = require('./lib/cli');

if (require.main === module) {
  CLI.run(process.argv);
} else {
  module.exports.GSDL = require('./lib/gs-dl');
  module.exports.CLI = require('./lib/cli');
}
