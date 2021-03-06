var GSDL = require('./gs-dl');
var util = require('util');

exports.run = function(args) {
  var onProgress = false;

  args = args.slice(2);

  if (args.length != 1) {
    console.error("Usage: gs-dl <songUrl|songToken>");
    return process.exit(1);
  }

  var gsdl = new GSDL();
  gsdl.on('info', function(message) {
    console.log("[INFO] %s", message);
  });
  gsdl.on('end', function(){
    onProgress = false;
    console.log('\n[INFO] Download finished');
  });
  gsdl.on('progress', function(info){
    onProgress = true;
    process.stdout.write(util.format("\r[INFO] %s -> %s% (%s/%s)", info.filename, info.percentage.toFixed(2), info.completed, info.total));
  });
  gsdl.getInfoFromToken(gsdl.getTokenFromURL(args[0]), function(err, info){
    if (err) {
      console.error(err);
      process.exit(1);
    }
    gsdl.download(info, gsdl.buildFilenameFromInfo(info));
  });
}
