#!/usr/bin/env node

var CLI = require('./lib/cli');

if (require.main === module) {
  CLI.run(process.argv);
}
