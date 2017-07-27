var os = require('os');
var localIP = require("my-local-ip")();
var ssdp = require("peer-ssdp");
var SERVER = os.type() + "/" + os.release() + " UPnP/1.1 famium/0.0.1";
var uuid = "6bd5eabd-b7c8-4f7b-ae6c-a30ccdeb5988";
var peer = ssdp.createPeer();
var eyes = require('eyes');
var parser = require('xml2json');
var xml2js = require('xml2js');
var http = require('http');
var async = require('async');
var o2x = require('object-to-xml');
var devices = require('./devices');

var xmlToSend = [
    {
        "Buf_Type_Id": 1,
        "Buf_Type_Name": "Breakfast"
    },
    {
        "Buf_Type_Id": 2,
        "Buf_Type_Name": "Lunch"
    },
    {
        "Buf_Type_Id": 3,
        "Buf_Type_Name": "Dinner"
    }
];


module.exports = function (app) {
    peer.on("ready", function () {
        console.log("ready");
        onReady();
    }).on("notify", function (headers, address) {
        addDevice(headers, address);
    }).on("search", function (headers, address) {
        var ST = headers.ST;
        var headers = {
            LOCATION: "http://{{networkInterfaceAddress}}:55556/upnp/devices/6bd5eabd-b7c8-4f7b-ae6c-a30ccdeb5988/desc.xml",
            SERVER: SERVER,
            ST: "upnp:rootdevice",
            USN: "uuid:" + uuid + "::upnp:rootdevice",
            'BOOTID.UPNP.ORG': 1
        };
        peer.reply(headers, address);
    }).on("found", function (headers, address) {
        addDevice(headers, address);
    }).on("close", function () {
        console.log("close");
    }).start();

    var onReady = function () {
        console.log("notify SSDP alive message");
        peer.alive({
            NT: "upnp:rootdevice",
            USN: "uuid:" + uuid + "::upnp:rootdevice",
            LOCATION: "http://{{networkInterfaceAddress}}:55556/upnp/devices/6bd5eabd-b7c8-4f7b-ae6c-a30ccdeb5988/desc.xml",
            SERVER: SERVER
        });

        console.log("search for rootdevices");
        peer.search({
            ST: "upnp:rootdevice"
        });

        /*setTimeout(function () {
            console.log("notify SSDP byebye message");
            peer.byebye({
                NT: "upnp:rootdevice",
                USN: "uuid:" + uuid + "::upnp:rootdevice",
                LOCATION: "http://{{networkInterfaceAddress}}:55556/upnp/devices/6bd5eabd-b7c8-4f7b-ae6c-a30ccdeb5988/desc.xml",
                SERVER: SERVER
            }, function () {
                peer.close();
            });
        }, 180000);*/
    };

    /**
     * Function to add the devices to the discovered devices
     */
    function addDevice(headers, address) {
        //first it must not be the same application (usually this is not the case)
        if (address.adderss != localIP) {
            if ((headers.LOCATION != '') && (headers.LOCATION != undefined)) {
                async.waterfall([
                    function (callback) {
                        http.get(headers.LOCATION, function (res) {
                            var response_data = '';
                            res.setEncoding('utf8');
                            res.on('data', function (chunk) {
                                response_data += chunk;
                            });
                            res.on('end', function () {
                                callback(null, response_data)
                            });
                            res.on('error', function (err) {
                                callback(err);
                            });
                        });
                    },
                    function (xml, callback) {
                        var checker = new xml2js.Parser();
                        checker.parseString(xml, function (err, result) {
                            if (err) {
                                callback(err);
                            } else {
                                var stringJson = lookup(result, 'service');
                                if (stringJson != null) {
                                    callback(null, result);
                                } else {
                                    callback(null, {});
                                }
                            }
                        });
                    }
                ], function (err, result) {
                    if (err) {
                        console.log('Got error');
                        console.log(err);
                    } else {
                        //eyes.inspect(result.root);
                        if (result != {} && result.length != 0 && result.root != undefined) {
                            //console.log(result.root);
                            devices.deviceRequest(result.root, 'ssdp');
                        }
                    }
                });
            }
        }
    }

    function lookup(obj, k) {
        if (typeof (obj) != 'object') {
            return null;
        }
        var result = null;
        if (obj.hasOwnProperty(k)) {
            return obj[k];
        } else {
            for (var o in obj) {
                result = lookup(obj[o], k);
                if (result == null) continue;
                else break;
            }
        }
        return result;
    }


    app.get('/upnp/devices/6bd5eabd-b7c8-4f7b-ae6c-a30ccdeb5988/desc.xml', function (req, res, next) {
        res.set('Content-Type', 'text/xml');
        res.send(o2x({
            '?xml version="1.0" encoding="utf-8"?': null,
            restaurants: {
                restaurant: xmlToSend
            }
        }));
    });

}