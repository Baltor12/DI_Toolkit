const PORT = 5015;
var localIP = require("my-local-ip")();
const MULTICAST_ADDR = '239.0.0.1';
const dgram = require('dgram');
const server = dgram.createSocket("udp4");
var cnt = 1;

var news = [
   "Borussia Dortmund wins German championship",
   "Tornado warning for the Bay Area",
   "More rain for the weekend",
   "Android tablets take over the world",
   "iPad2 sold out",
   "Nation's rappers down to last two samples"
];

server.bind(PORT, function(){
    server.setBroadcast(true);
    server.setMulticastTTL(128);
    server.addMembership(MULTICAST_ADDR, "127.0.0.1");
    setInterval(broadcastNew, 5000);
});

function broadcastNew() {
    news = "{\"dc\":\"http://" + localIP + ":" + PORT + "/RPL/RTU\", \"cnt\":" + cnt + "}"
    var message = new Buffer(news);
    server.send(message, 0, message.length, 5012, MULTICAST_ADDR);
    console.log("Sent " + message + " to the wire...");
    //server.close();
    cnt++
}