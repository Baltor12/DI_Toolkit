var http = require('http');

var devices = require('./devices');

module.exports = function (app) {
    app.get('/devices', function (req, res) {
        res.send(devices.deviceIds);
    });

    app.get('/devicesInfo', function (req, res) {
        res.send(devices.devicesInfo);
    });
};