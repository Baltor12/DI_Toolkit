var dpws = require('dpws');
var devices = require('./devices');
var uuid = require('node-uuid');
var localIP = require('my-local-ip')();
var PORT = 55556;
var HOST = localIP;
var request = require('request')
var ipAddr = 'http://' + localIP + ':' + PORT


var self = module.exports = {
    client: dpws.createClient({
        action: 'http://docs.oasis-open.org/ws-dd/ns/discovery/2009/01/Probe',
        messageId: 'uuid:P37f46a46-4b03-4b16-9380-413c0f52d348',
        to: ' urn:schemas-xmlsoap-org:ws:2005:04:discovery',
        udpAddrCli: '239.255.255.250',
        udpPortCli: 1655
    }),

    //Query the device details after constructing the required variables
    formDevice: function (device) {
        if (device.xaddrs != null || device.xaddrs != undefined) {
            var opts = {
                action: 'http://schemas.xmlsoap.org/ws/2004/09/mex/GetMetadata/Request',
                messageId: 'uuid:P37f46a46-4b03-4b16-9380-413c0f52d348',
                to: device.xaddrs,
            }
            self.client.invoke(opts, function (err, reply) {
                var json = {
                    ip: device.xaddrs,
                    details: reply
                };
                devices.deviceRequest(json, 'dpws');
            })
        }
    },

    //Query the device details after constructing the required variables
    enquireDetails: function (url, cb) {
        if (url != null || url != undefined || url != '') {
            var opts = {
                action: 'http://schemas.xmlsoap.org/ws/2004/09/mex/GetMetadata/Request',
                messageId: '',
                to: url,
            }

            self.client.invoke(opts, function (err, reply) {
                cb(reply);
            })
        }
    },

    //Register to Events 
    registerEvents: function (deviceId, id) {
        var serviceUrl = '';
        var address = ipAddr + '/dpws/' + deviceId + '/' + id + '/eventSink';
        var filter = '';
        var parentService = devices.devicesInfo[deviceId].rplEvents[id].meta.parentServiceId;
        var services = devices.devicesInfo[deviceId].services;
        for (var i = 0; i < services.length; i++) {
            if (services[i].id === parentService) {
                serviceUrl = services[i].controlUrl[0];
                filter = services[i].controlUrl[0] + '/' + services[i].types + '/' + id;
                var xml = eventInvocationBody(serviceUrl, filter, address);
                request({
                    uri: serviceUrl,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/xml'
                    },
                    body: xml,
                    timeout: 10000,
                },
                    function (err, resp, body) {
                        if (err) {
                            console.log(err);
                            return cb(err)
                        }
                    });
            }
        }
    }
}

function eventInvocationBody(to, filter, address) {
    return '<?xml version="1.0" encoding="UTF-8"?>' +
        '<s12:Envelope xmlns:s12="http://www.w3.org/2003/05/soap-envelope" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:wse="http://schemas.xmlsoap.org/ws/2004/08/eventing" xmlns:ew="http://www.example.com/warnings">' +
        '<s12:Header>' +
        '<wsa:Action>http://schemas.xmlsoap.org/ws/2004/08/eventing/Subscribe</wsa:Action>' +
        '<wsa:MessageID>uuid:' + uuid.v4() + '</wsa:MessageID>' +
        '<wsa:ReplyTo><wsa:Address>' + address + '</wsa:Address></wsa:ReplyTo>' +
        '<wsa:To>' + to + '</wsa:To>' +
        '</s12:Header>' +
        '<s12:Body>' +
        '<wse:Subscribe>' +
        '<wse:Filter>' + filter + '</wse:Filter>' +
        '<wse:Delivery Mode="http://schemas.xmlsoap.org/ws/2004/08/eventing/DeliveryModes/Push">' +
        '<wse:NotifyTo>' +
        '<wsa:Address>' + address + '</wsa:Address>' +
        '</wse:NotifyTo>' +
        '</wse:Delivery>' +
        '</wse:Subscribe>' +
        '</s12:Body>' +
        '</s12:Envelope>'
}

self.client.probe(self.formDevice);