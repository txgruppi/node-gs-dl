var EventEmitter = require('events').EventEmitter;
var util = require('util');
var https = require('https');
var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');
var uuid = require('uuid');
var crypto = require('crypto');
var GS = require('grooveshark-streaming');
var concat = require('concat-stream');

function GSDL() {
  GSDL.super_.call(this);
  this.groovesharkURL = {
    hostname: 'grooveshark.com',
    path: '/more.php',
    method: 'POST',
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.5 (KHTML, like Gecko) Chrome/19.0.1084.56 Safari/536.5',
      'content-type': 'application/json'
    }
  };
  this.token = null;
  this.uuid = uuid.v4();
  this.session = this._generateRandomHash('md5');
  this.defaultRequestJson = {
    header: {
      client: 'mobileshark',
      clientRevision: '20120830',
      uuid: this.uuid,
      session: this.session
    },
    parameters: {
      country: {
        ID: 223,
        CC1: 0,
        CC2: 0,
        CC3: 0,
        CC4: 1073741824,
        DMA: 534,
        IPR: 0
      }
    }
  };
  this.song = {
    title: null,
    artist: null,
    id: null
  };
}

util.inherits(GSDL, EventEmitter);

GSDL.prototype._generateRandomHash = function(type) {
  return crypto.createHash(type).update('' + Math.random()).update('' + new Date()).digest('hex');
}

GSDL.prototype._generateRequestToken = function(method, token) {
  var secret = 'gooeyFlubber';
  var rnd = this._generateRandomHash('md5').substr(0, 6);
  var tokenSource = util.format('%s:%s:%s:%s', method, token, secret, rnd);
  var hash = crypto.createHash('sha1').update(tokenSource).digest('hex');
  return rnd + hash;
}

GSDL.prototype.getCommunicationToken = function(callback) {
  var gsdl = this;
  // FIXME: Clone object
  var json = JSON.parse(JSON.stringify(this.defaultRequestJson));
  json.method = 'getCommunicationToken';
  json.parameters.secretKey = crypto.createHash('md5').update(json.header.session).digest('hex');
  json = JSON.stringify(json);

  // FIXME: Clone object
  var reqOptions = JSON.parse(JSON.stringify(this.groovesharkURL));
  reqOptions.headers['content-length'] = json.length;
  reqOptions.headers['origin'] = 'http://grooveshark.com';
  reqOptions.headers['accept'] = '*/*';
  reqOptions.headers['accept-encoding'] = '';
  reqOptions.headers['accept-language'] = 'en-US,en;q=0.8';

  gsdl.emit('info', 'Requesting communication token');
  var req = https.request(reqOptions);
  req.on('response', function(res){
    res.pipe(concat(function(data){
      var data = JSON.parse(data);
      if (data && data.result) {
        callback && callback.call && callback(null, data.result);
      } else {
        callback && callback.call && callback("Can't get token.");
      }
    }));
  });
  req.on('error', function(err){
    callback && callback.call && callback(err);
  });
  req.write(json);
  req.end();
}

GSDL.prototype.getInfoFromToken = function(token, callback) {
  var gsdl = this;
  this.getCommunicationToken(function(err, ctoken){
    if (err) {
      return callback && callback.call && callback(err);
    }
    // FIXME: Clone object
    var json = JSON.parse(JSON.stringify(gsdl.defaultRequestJson));
    json.method = 'getSongFromToken';
    json.parameters.token = token;
    json.header.token = gsdl._generateRequestToken(json.method, ctoken);
    json = JSON.stringify(json);
   
    // FIXME: Clone object
    var reqOptions = JSON.parse(JSON.stringify(gsdl.groovesharkURL));
    reqOptions.headers['content-length'] = json.length;
    reqOptions.headers['origin'] = 'http://grooveshark.com';
    reqOptions.headers['accept'] = '*/*';
    reqOptions.headers['accept-encoding'] = '';
    reqOptions.headers['accept-language'] = 'en-US,en;q=0.8';

    gsdl.emit('info', 'Requesting song info');
    var req = https.request(reqOptions);
    req.on('response', function(res){
      res.pipe(concat(function(data){
        var data = JSON.parse(data);
        if (data && data.result && data.result.SongID) {
          callback && callback.call && callback(null, data.result);
        } else {
          callback && callback.call && callback("Can't get ID.");
        }
      }));
    });
    req.on('error', function(err){
      callback && callback.call && callback(err);
    });
    req.write(json);
    req.end();
  });
};

GSDL.prototype.download = function(songID, filename, callback) {
  var gsdl = this;
  var filePath = path.join(process.cwd(), filename);
  fs.stat(filePath, function(err, stat){
    var bytesStart = 0;
    if (!err && stat) {
      bytesStart = stat.size;
    }
    if (songID && songID.SongID) {
      songID = songID.SongID;
    }
    gsdl.emit('info', 'Requesting stream url');
    GS.Grooveshark.getStreamingUrl(songID, function(err, streamUrl) {
      if (err) {
        return callback && callback.call && callbac(err);
      }
      gsdl.emit('info', 'Starting download');
      streamUrl = url.parse(streamUrl);
      streamUrl.headers = {};
      if (bytesStart) {
        streamUrl.headers['range'] = 'bytes=' + bytesStart + '-';
        gsdl.emit('info', 'Resuming download at ' + bytesStart + ' bytes');
      }
      var req = http.request(streamUrl);
      req.on('response', function(res) {
        var completed = bytesStart;
        var total = parseInt(res.headers['content-length'], 10) + bytesStart;
        var file = fs.createWriteStream(filePath, {flags: 'a'});
        res.on('data', function(c){
          completed += c.length;
          var perc = completed / total * 100;
          gsdl.emit('progress', {filename:filename, completed: completed, total: total, percentage: perc});
        });
        res.on('end', function() {
          gsdl.emit('end');
          callback && callback.call && callback();
        });
        res.pipe(file);
      });
      req.on('error', function(err){
        callback && callback.call && callback(err);
      });
      req.end();
    });
  });
}

GSDL.prototype.buildFilenameFromInfo = function(info) {
  info = info || {};
  return (info.ArtistName || 'Unknown').trim() + ' - ' + (info.Name || 'Unknown').trim() + '.mp3';
}

GSDL.prototype.getTokenFromURL = function(songUrl) {
  if (/^[a-z0-9]+$/i.test(songUrl)) {
    return songUrl;
  }
  songUrl = url.parse(songUrl);
  if (songUrl.host == 'grooveshark.com' || songUrl.hash.substr(0, 4) == '#!/s') {
    return songUrl.hash.split('/').pop().split('?').shift();
  }
  return null;
}

module.exports = GSDL;
