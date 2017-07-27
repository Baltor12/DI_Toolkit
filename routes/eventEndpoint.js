var registry = require('./registry');
var requestify = require('requestify');

module.exports = function (app) {
    //Endpoint for events from Escop
    app.post('/sample/:eventId', function (req, res) {
        res.send("Success");
    });

    //Endpoint for events from DPWS
    app.post('/dpws/:deviceId/:eventId/eventSink', function (req, res) {
        postEvents(req.params.deviceId, req.params.eventId, req.body);
        res.send("Success");
    });
};

/**
 * Function that post events to the MES or other devices which registers to the events.
 * @param {*} deviceId 
 * @param {*} eventId 
 * @param {*} body 
 */
function postEvents(deviceId, eventId, body) {
    var postBody = {};
    var payload = {};
    var lookUpBody = lookup(body, 's12:body')[0];
    payload.value = lookup(lookUpBody, '_');
    payload.type = lookup(lookUpBody, 'xsi:type').substring(3);
    payload.state = '';
    for (var i = 0; i < registry.eventRegistry.length; i++) {
        if (registry.eventRegistry[i].deviceId === deviceId && registry.eventRegistry[i].eventId === eventId) {
            postBody.clientData = registry.eventRegistry[i].clientData;
            postBody.id = registry.eventRegistry[i].id;
            postBody.lastEmit = new Date().getTime();
            postBody.eventId = eventId;
            postBody.payload = payload;
            requestify.post(registry.eventRegistry[i].destUrl, postBody)
                .then(function (response) {
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