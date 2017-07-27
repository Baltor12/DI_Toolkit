var eventRegistry = [];
var eventId = 0;

var dpws = require('./dpws');

/**
 * Function to register the event invoker details
 * @param {*} obj 
 */
function registerEventInvokers(devId, id, obj) {
    var invoker = {};
    if (obj.destUrl !== undefined && obj.destUrl !== null && obj.destUrl !== '') {
        invoker.id = eventId;
        invoker.deviceId = devId;
        invoker.eventId = id;
        invoker.destUrl = obj.destUrl;
        if (obj.clientData !== undefined && obj.clientData !== null && obj.clientData !== '') {
            invoker.clientData = obj.clientData;
        }else{
            invoker.clientData = '';
        }
        eventRegistry.push(invoker);
        eventId++;
        dpws.registerEvents(devId, id);
    }
}

module.exports = {
    eventRegistry: eventRegistry,
    registerEventInvokers: registerEventInvokers
};