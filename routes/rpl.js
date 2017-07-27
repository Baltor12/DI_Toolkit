var localIP = require("my-local-ip")();
var PORT = 55556;
var HOST = localIP;
var dgram = require('dgram');
var client = dgram.createSocket('udp4');
var requestify = require('requestify');

var devices = require('./devices');

module.exports = function (app) {

    client.on('listening', function () {
        var address = client.address();
        console.log('UDP Client listening on ' + address.address + ":" + address.port);
        client.setBroadcast(true)
        client.setMulticastTTL(128);
        client.addMembership('239.0.0.1', "127.0.0.1");
    });

    client.on('message', function (message, remote) {
        //console.log(remote.address + ':' + remote.port + ' - ' + message);
        var jsonMessage = JSON.parse(message);
        if (jsonMessage.dc !== null && jsonMessage.dc !== '' && jsonMessage.dc !== undefined) {
            for (i = 0; i < devices.deviceIds.length; i++) {
                var devId = devices.deviceIds[i];
                if (devices.devicesInfo[devId] !== undefined) {
                    var body = {
                        url: devices.devicesInfo[devId].swagger,
                        id: devices.devicesInfo[devId].id,
                        cnt: jsonMessage.cnt
                    }
                    requestify.post(jsonMessage.dc, body)
                        .then(function (response) {
                        });
                }
            }
        }
    });

    client.bind(PORT, "127.0.0.1");
};