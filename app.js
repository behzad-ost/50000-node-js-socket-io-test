var ipv4 = require('http').createServer(handler)
  , io = require('socket.io').listen(ipv4)
  , fs = require('fs')
  , libGeoIP = require('libGeoIP').libGeoIP;

var ipv6 = require('http').createServer(handler)
  , fs = require('fs')
//  , io = require('socket.io').listen(ipv6)

io.enable('browser client minification');
io.enable('browser client etag');
io.enable('browser client gzip');
io.set('log level', 0);
//https://github.com/LearnBoost/socket.io/issues/609
io.set('transports', [ 'websocket', 'htmlfile', 'xhr-polling' ]);

ipv4.listen(80);
ipv6.listen(80, '2604:3500:1:4:0:50:100:cd34');

geo = new libGeoIP('/var/www/support/GeoLiteCity.dat');
var country_counts = {'US':0};

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200, {"Content-Type": "text/html"});
    res.end(data);
  });
}

function get_country_counts(socket, direction) {
  var cc = [];
  if (socket) { 
    var address = socket.handshake.address.address;
    var country = geo.query(address).country_code;
    if (country_counts[country]) { 
      if (direction == 'connect') {
        country_counts[country]++;
      } else {
        country_counts[country]--;
      }
    } else {
      country_counts[country] = direction == 'connect' ? 1 : 0;
    }
    for (var key in country_counts) {
      cc.push([key,country_counts[key]]); 
    };
  }
  return cc;
}

io.sockets.on('connection', function (socket) {
  io.sockets.emit('50k', { 'watchers':io.sockets.manager.server.connections });
  var cc = get_country_counts(socket, 'connect');
  io.sockets.emit('country', { 'graph':cc });

  socket.on('disconnect', function (socket) {
    io.sockets.emit('50k', { 'watchers':io.sockets.manager.server.connections });
    // obviously, on a disconnect, we don't have the remote address
    //var cc = get_country_counts(socket, 'disconnect');
    //io.sockets.emit('country', { 'graph':cc });
  });
});
