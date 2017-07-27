var localIP = require("my-local-ip")();
var PORT = 55556;
var HOST = localIP;
var dgram = require('dgram');
var cnt = 1;

var devices = require('./devices');

var news = "{\"dc\":\"http://" + localIP + ":" + PORT + "/RPL/RTU\"}";

module.exports = function(app) {
    var server = dgram.createSocket("udp4");
    server.bind(function() {
        server.setBroadcast(true)
        server.setMulticastTTL(128);
        server.addMembership('239.0.0.1',localIP);
        setInterval(broadcastNew, 10000);
    });

    function broadcastNew() {
        news = "{\"dc\":\"http://" + localIP + ":" + PORT + "/RPL/RTU\", \"cnt\":" + cnt + "}"
        var message = new Buffer(news);
        server.send(message, 0, message.length, 55556, "239.0.0.1");
        //console.log("Probed with message " + message);
        cnt++;
    }

    app.post('/RPL/RTU', function(req, res) {
        console.log(req.body);
        devices.deviceRequest(req.body, 'escop');
        res.send("Success");
    });
}