var devices = require('./devices');
var http = require('http');
var requestify = require('requestify');

/**
     * Function to invoke service in the device
     * @param {*} deviceId 
     * @param {*} serviceId 
     */
function invokeService(devId, serviceId) {
    var devInfo = devices.devicesInfo[devId];
    var controlUrl = '';
    var body = {};
    if (devInfo.rplServices[serviceId] !== undefined) {
        var parentId = devInfo.rplServices[serviceId].meta.parentServiceId;
        if (devInfo.rplServices[serviceId].meta.parentServiceId !== undefined) {
            for (i = 0; i < devInfo.services.length; i++) {
                if (devInfo.services[i].id === parentId) {
                    controlUrl = devInfo.services[i].controlUrl;
                    for (j = 0; j < devInfo.services[i].actions.length; j++) {
                        var action = devInfo.services[i].actions[j];
                        if (devInfo.services[i].actions[j].id === serviceId) {
                            var argumentId = devInfo.services[i].actions[j].arguments[0].id;
                            var arg = {};
                            arg[argumentId] = true;
                            body[serviceId] = arg;
                        }
                    }
                }
            }
        }
    }
    if (controlUrl !== '' && controlUrl !== undefined) {
        requestify.post(controlUrl, body)
            .then(function (response) {
            });
    }
}
module.exports = {
    invokeService: invokeService
};