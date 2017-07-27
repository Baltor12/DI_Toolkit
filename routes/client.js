const PORT = 5015;
var localIP = require("my-local-ip")();
const MULTICAST_ADDR = '239.0.0.1';
const dgram = require('dgram');
const client = dgram.createSocket('udp4');

client.on('listening', function () {
    var address = client.address();
    console.log('UDP Client listening on ' + address.address + ":" + address.port);
    client.setBroadcast(true)
    client.setMulticastTTL(128); 
    client.addMembership(MULTICAST_ADDR, "127.0.0.1");
});

client.on('message', function (message, remote) {   
    console.log('From: ' + remote.address + ':' + remote.port +' - ' + message);
});

client.bind(PORT, "127.0.0.1");