#!/usr/bin/env node

var CLI = require('./lib/cli');

if (require.main === module) {
  CLI.run(process.argv);
}

//var gsdl = new GSDL();
//gsdl.on('progress', console.log);
//gsdl.on('end', function(){ console.log('>> END <<'); });
//gsdl.on('info', function(message) { console.log(message); });
//console.log(gsdl.getTokenFromURL('http://grooveshark.com/#!/s/Timber/6BKC1D?src=5'));
//console.log(gsdl.getTokenFromURL('6BKC1D'));
//gsdl.getInfoFromToken(gsdl.getTokenFromURL('http://grooveshark.com/#!/s/Timber/6BKC1D?src=5'), function(err, info){
  //gsdl.download(info, gsdl.buildFilenameFromInfo(info));
//});
