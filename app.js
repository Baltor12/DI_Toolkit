var os = require('os');
var path = require('path');
var localIP = require("my-local-ip")();
var app = require('express')();
var fs = require('fs');
var http = require('http');
var bodyParser = require('body-parser');
var router = require('express').Router();
var PORT = 55556;
var HOST = localIP;
var dgram = require('dgram');
var client = dgram.createSocket('udp4');
var xmlparser = require('express-xml-bodyparser');

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());
app.use(xmlparser());

require('./routes/devices');
require('./routes/ssdp')(app);
//require('./routes/escop')(app);
require('./routes/dpws');
require('./routes/registry');
require('./routes/eventEndpoint')(app);
require('./routes/serviceInvocation');
require('./routes/swagger')(app);
require('./routes/rpl')(app);
require('./routes/generalHttp')(app);
//require('./routes/client');
//require('./routes/server');

var listener = app.listen(PORT, function() {
    console.log('App is running on http://' + localIP + ':' + listener.address().port); //Listening on port 8888
});