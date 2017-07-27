var deviceIds = [];
var devices = {};
var http = require('http');
var eyes = require('eyes');
var parser = require('xml2json');
var xml2js = require('xml2js');
var http = require('http');
var async = require('async');
var o2x = require('object-to-xml');
var localIP = require("my-local-ip")();
var PORT = 55556;
var request = require('request')



function deviceRequest(json, disType) {
    if (disType == 'escop') {
        async.waterfall([
            function (callback) {
                if (!isInArray(deviceIds, json.id)) {
                    deviceIds.push(json.id.replace(/\s+/g, '_'));
                    console.log('Added Device : ' + json.id);
                    console.log("=======================");
                    //Get the swagger details
                    http.get(json.url, function (res) {
                        var body = '';
                        res.on('data', function (chunk) {
                            body += chunk;
                        });
                        res.on('end', function () {
                            callback(null, body);
                        });
                    }).on('error', function (e) {
                        console.log("Got error: " + e.message);
                        callback(err);
                    });
                }
            },
            function (swagJson, callback) {
                swagJson = JSON.parse(swagJson);
                var deviceDetails = {};
                // construct the device JSON
                deviceDetails.id = json.id.replace(/\s+/g, '_');
                deviceDetails.type = 'escop';
                deviceDetails.metaURL = json.url;
                deviceDetails.schemes = swagJson.schemes;
                deviceDetails.address = swagJson.basePath;
                //Finalize the schemes for connecting to the device
                for (i = 0; i < swagJson.schemes.length; i++) {
                    if (swagJson.schemes[i] == 'http') {
                        var pathKeys = Object.keys(swagJson.paths);
                        for (j = 0; j < pathKeys.length; j++) {
                            async.waterfall([
                                function (callback) {
                                    var url = swagJson.schemes[i] + "://" + swagJson.host + "/" + swagJson.basePath + pathKeys[j];
                                    callback(null, url);
                                },
                                function (url, callback) {
                                    var resJson = {};
                                    http.get(url, function (res) {
                                        var body = '';
                                        res.on('data', function (chunk) {
                                            body += chunk;
                                        });
                                        res.on('end', function () {
                                            resJson = JSON.parse(body);
                                            // get the names of the elements
                                            if ((resJson != null) || (resJson != undefined)) {
                                                var subDetails = [];
                                                Object.keys(resJson.children).forEach(function (key) {
                                                    //Get Control URl, Method and arguments if any
                                                    var method = 'POST',
                                                        controlUrl = '',
                                                        argumentFormat = 'json',
                                                        argument = '{}';
                                                    if (resJson.class == 'services') {
                                                        if (resJson.children[key].class == 'process') {
                                                            argument = JSON.parse('{"destUrl":"http://hostname"}');
                                                            controlUrl = resJson.children[key].links.notifs;
                                                        } else {
                                                            controlUrl = resJson.children[key].links.self;
                                                        }
                                                    } else if (resJson.class == 'events') {
                                                        argument = JSON.parse('{"destUrl":"http://hostname"}');
                                                        controlUrl = resJson.children[key].links.notifs;
                                                    } else if (resJson.class == 'data') {
                                                        method = 'GET';
                                                        controlUrl = resJson.children[key].links.self;
                                                    }
                                                    subDetails.push({
                                                        "id": resJson.children[key].id,
                                                        "type": resJson.children[key].class,
                                                        "method": method,
                                                        "controlUrl": controlUrl,
                                                        "argumentFormat": argumentFormat,
                                                        "argument": argument,
                                                        "links": resJson.children[key].links
                                                    });
                                                });
                                                deviceDetails[resJson.class] = subDetails;
                                                callback(null, deviceDetails);
                                            }
                                        });
                                    }).on('error', function (e) {
                                        console.log("Got error: " + e.message);
                                        callback(err);
                                    });
                                }
                            ],
                                function (err, result) {
                                    devices[result.id] = result;
                                });
                        }
                    } else if (swagJson.schemes[i] == 'https') {

                    }
                }
                callback(null, deviceDetails);
            }
        ], function (err, result) { });
    } else if (disType == 'ssdp') {
        var devId = lookup(json, 'device')[0].friendlyName[0];
        devId = devId.replace(/\s+/g, '_');
        if (!isInArray(deviceIds, devId)) {
            deviceIds.push(devId);
            console.log('Added Device : ' + devId);
            console.log("=======================");
            var deviceDetails = {};
            // construct the device JSON
            deviceDetails.id = devId;
            deviceDetails.swagger = "http://" + localIP + ":" + PORT + "/RTU/" + devId + "/api/swagger.json";
            deviceDetails.protocol = 'ssdp';
            deviceDetails.schemes = ['http'];
            if ((lookup(json, 'URLBase') != null) && (lookup(json, 'URLBase').length != 0)) {
                deviceDetails.address = lookup(json, 'URLBase')[0];
            }

            if ((lookup(json, 'modelName') != null) && (lookup(json, 'modelName').length != 0)) {
                deviceDetails.modelName = lookup(json, 'modelName')[0];
            } else {
                deviceDetails.modelName = '';
            }

            if ((lookup(json, 'serialNumber') != null) && (lookup(json, 'serialNumber').length != 0)) {
                deviceDetails.serialNumber = lookup(json, 'serialNumber')[0];
            } else {
                deviceDetails.serialNumber = '';
            }

            if ((lookup(json, 'presentationURL') != null) && (lookup(json, 'presentationURL').length != 0)) {
                deviceDetails.metaURL = lookup(json, 'presentationURL')[0];
            } else {
                deviceDetails.metaURL = '';
            }
            deviceDetails.services = [];
            deviceDetails.events = [];
            if ((lookup(json, 'serviceList') != null) && (lookup(json, 'serviceList').length != 0)) {
                var serviceList = (lookup(json, 'serviceList'));
                async.forEachLimit(serviceList[0].service, 1, function (service, loopCallback) {
                    var serviceJson = {};
                    async.waterfall([
                        function (callback) {
                            if (service.serviceId != null && service.serviceId != undefined) {
                                serviceJson.id = service.serviceId[0];
                            }
                            if (service.controlURL != null && service.controlURL != undefined) {
                                serviceJson.controlUrl = service.controlURL[0];
                            }
                            //Add events
                            if (service.eventSubURL != undefined && service.eventSubURL != null) {
                                deviceDetails.events.push({
                                    id: serviceJson.id,
                                    url: service.eventSubURL[0]
                                });
                            }
                            if (service.SCPDURL != null && service.SCPDURL != undefined) {
                                serviceJson.metaURL = service.SCPDURL[0];
                                //Add the actions to the service gathered from the service description
                                serviceJson.actions = [];
                                callback(null, service.SCPDURL[0]);
                            } else {
                                callback(null, null);
                            }
                        },
                        function (metaURL, callback) {
                            if (metaURL != null && metaURL != undefined && metaURL != '') {
                                if (metaURL.indexOf("http") > -1) {
                                    http.get(metaURL, function (res) {
                                        var body = '';
                                        res.on('data', function (chunk) {
                                            body += chunk;
                                        });
                                        res.on('end', function () {
                                            callback(null, body);
                                        });
                                    }).on('error', function (e) {
                                        console.log("Got error: " + e.message);
                                        callback(err);
                                    });
                                } else {
                                    callback(null, null);
                                }
                            }
                        },
                        function (xml, callback) {
                            var checker = new xml2js.Parser();
                            if (xml != null) {
                                checker.parseString(xml, function (err, result) {
                                    if (err) {
                                        callback(err);
                                    } else {
                                        callback(null, result);
                                    }
                                });
                            } else {
                                callback(null, null);
                            }
                        },
                        function (xmlJson, callback) {
                            //Get the actions for the services
                            if (xmlJson != null) {
                                var actionListJson = lookup(xmlJson, 'actionList');
                                var stateListJson = lookup(xmlJson, 'serviceStateTable');
                                //Add the actions to the device info
                                for (var j = 0; j < actionListJson[0].action.length; j++) {
                                    var actionDetails = {
                                        id: '',
                                        arguments: []
                                    };
                                    actionDetails.id = actionListJson[0].action[j].name[0]; //Action name
                                    //Get the argument list
                                    for (var k = 0; k < actionListJson[0].action[j].argumentList[0].argument.length; k++) {
                                        var argumentDetails = {};
                                        argumentDetails.id = actionListJson[0].action[j].argumentList[0].argument[k].name[0];
                                        argumentDetails.direction = actionListJson[0].action[j].argumentList[0].argument[k].direction[0];
                                        argumentDetails.stateVariable = actionListJson[0].action[j].argumentList[0].argument[k].relatedStateVariable[0];
                                        //Getting details of the state variable for the related state variable
                                        for (var l = 0; l < stateListJson[0].stateVariable.length; l++) {
                                            if (stateListJson[0].stateVariable[l].name[0] == argumentDetails.stateVariable) {
                                                var stateDetails = {
                                                    sendEvents: false,
                                                    multicast: false
                                                };
                                                //Add the state variable attributes
                                                if (stateListJson[0].stateVariable[l]['$'] != undefined && stateListJson[0].stateVariable[l]['$'] != null) {
                                                    var sendEvents = stateListJson[0].stateVariable[l]['$'].sendEvents;
                                                    var multicastVar = stateListJson[0].stateVariable[l]['$'].multicast;
                                                    if (sendEvents != undefined && sendEvents != null) {
                                                        if (sendEvents == 'yes') {
                                                            stateDetails.sendEvents = true;
                                                        }
                                                    }
                                                    if (multicastVar != undefined && multicastVar != null) {
                                                        if (multicastVar == 'yes') {
                                                            stateDetails.sendEvents = true;
                                                        }
                                                    }
                                                }
                                                //Add datatype
                                                if (stateListJson[0].stateVariable[l].dataType != undefined && stateListJson[0].stateVariable[l].dataType != null) {
                                                    stateDetails.dataType = stateListJson[0].stateVariable[l].dataType[0];
                                                }
                                                //Add default value
                                                if (stateListJson[0].stateVariable[l].defaultValue != undefined && stateListJson[0].stateVariable[l].defaultValue != null) {
                                                    stateDetails.defaultValue = stateListJson[0].stateVariable[l].defaultValue[0];
                                                }
                                                //Add allowed value list
                                                if (stateListJson[0].stateVariable[l].allowedValueList != undefined && stateListJson[0].stateVariable[l].allowedValueList != null) {
                                                    for (var m = 0; m < stateListJson[0].stateVariable[l].allowedValueList[0].allowedValue.length; m++) {
                                                        stateDetails.allowedValue.push(stateListJson[0].stateVariable[l].allowedValueList[0].allowedValue[m]);
                                                    }
                                                }
                                                //Add allowed ranges
                                                if (stateListJson[0].stateVariable[l].allowedValueRange != undefined && stateListJson[0].stateVariable[l].allowedValueRange != null) {
                                                    //Add maximum value
                                                    if (stateListJson[0].stateVariable[l].allowedValueRange[0].maximum != undefined && stateListJson[0].stateVariable[l].allowedValueRange[0].maximum != null) {
                                                        stateDetails.range.max = stateListJson[0].stateVariable[l].allowedValueRange[0].maximum[0];
                                                    }
                                                    //Add minimum value
                                                    if (stateListJson[0].stateVariable[l].allowedValueRange[0].minimum != undefined && stateListJson[0].stateVariable[l].allowedValueRange[0].minimum != null) {
                                                        stateDetails.range.min = stateListJson[0].stateVariable[l].allowedValueRange[0].minimum[0];
                                                    }
                                                    //Add step value
                                                    if (stateListJson[0].stateVariable[l].allowedValueRange[0].step != undefined && stateListJson[0].stateVariable[l].allowedValueRange[0].step != null) {
                                                        stateDetails.range.step = stateListJson[0].stateVariable[l].allowedValueRange[0].step[0];
                                                    }

                                                }
                                                //Add the details to the main argument
                                                argumentDetails.stateDetails = stateDetails;
                                            }
                                        }
                                        //Add the Arguments to the actions
                                        actionDetails.arguments.push(argumentDetails);
                                    }
                                    //Determining the type of operation
                                    var inDir = false;
                                    var outDir = false;
                                    for (var k = 0; k < actionDetails.arguments.length; k++) {
                                        if (actionDetails.arguments[k].direction == 'in') {
                                            inDir = true;
                                        } else if (actionDetails.arguments[k].direction == 'out') {
                                            outDir = true;
                                        }
                                    }
                                    if (inDir & outDir) {
                                        actionDetails.type = 'process';
                                    } else if (inDir & !outDir) {
                                        actionDetails.type = 'operation';
                                    } else if (!inDir & outDir) {
                                        actionDetails.type = 'query';
                                    }
                                    //Add the actions to the device table
                                    serviceJson.actions.push(actionDetails);
                                }
                            }
                            callback(null, serviceJson);
                        }
                    ], function (err, result) {
                        deviceDetails.services.push(result);
                        loopCallback();
                    });
                }, function (err) {
                    deviceDetails.rplServices = {};
                    deviceDetails.rplEvents = {};
                    async.forEachLimit(deviceDetails.services, 1, function (service, loopCallback) {
                        async.forEachLimit(service.actions, 1, function (action, loopCallback) {
                            var actService = {};
                            actService.id = action.id;
                            actService.class = action.type;
                            actService.links = {
                                self: "http://" + localIP + ":" + PORT + "/RTU/" + devId + "/services/" + action.id,
                                info: "http://" + localIP + ":" + PORT + "/RTU/" + devId + "/services/" + action.id + "/info"
                            };
                            actService.meta = {
                                deviceId: devId,
                                deviceType: 'ssdp',
                                sensorType: action.id,
                                serviceType: action.type,
                                parentServiceId: service.id
                            };
                            deviceDetails.rplServices[action.id] = actService;
                            loopCallback();
                        }, function (err) {
                            loopCallback();
                        });
                    }, function (err) {
                        devices[deviceDetails.id] = deviceDetails;
                    });
                });
            }
        }
    } else if (disType == 'dpws') {
        var dpw = require('./dpws');
        async.waterfall([
            function (callback) {
                //Search the device Id in the json
                var devId = findEntity(json, 'dpws:FriendlyName');
                devId.text = devId.text.replace(/\s+/g, '_');
                if (devId.text != null) {
                    if (!isInArray(deviceIds, devId.text)) {
                        deviceIds.push(devId.text); // Store device Id to list of discovered devices
                        console.log('Added Device : ' + devId.text);
                        console.log("=======================");
                    }
                    //Building the device JSON
                    var deviceDetails = {};
                    deviceDetails.id = devId.text;
                    deviceDetails.swagger = "http://" + localIP + ":" + PORT + "/RTU/" + devId.text + "/api/swagger.json";
                    deviceDetails.protocol = 'dpws';
                    deviceDetails.schemes = ['http'];
                    deviceDetails.address = json.ip;
                    deviceDetails.metaURL = '';
                    deviceDetails.services = [];
                    //Get the list of services
                    var relationship = findEntity(json, 'dpws:Relationship');
                    for (var i = 0; i < relationship._children.length; i++) {
                        if (relationship._children[i].tag == 'dpws:Hosted') {
                            var serviceJson = {
                                id: '',
                                controlUrl: []
                            };
                            var hosted = relationship._children[i];
                            //Initially Get the service Id
                            for (var j = 0; j < hosted._children.length; j++) {
                                if (hosted._children[j].tag == 'dpws:ServiceId') {
                                    serviceJson.id = hosted._children[j].text;
                                }

                                if (hosted._children[j].tag == 'dpws:Types') {
                                    serviceJson.types = hosted._children[j].text;
                                }

                                if (hosted._children[j].tag == 'wsa:EndpointReference') {
                                    serviceJson.controlUrl.push(hosted._children[j]._children[0].text);
                                }
                            }
                            //Add the services to main json
                            deviceDetails.services.push(serviceJson);
                        }
                    }
                    callback(null, deviceDetails);
                }
            },
            function (devDetails, callback) {
                async.forEachLimit(devDetails.services, 1, function (service, loopCallback) {
                    async.forEachLimit(service.controlUrl, 1, function (url, lpCallback) {
                        dpw.enquireDetails(url, function (wsdlJson) {
                            if (wsdlJson != undefined && wsdlJson != null) {
                                var wsdlOperations = [];
                                for (var i = 0; i < wsdlJson.length; i++) {
                                    if (wsdlJson[i].tag == 'wsdl:definitions') {
                                        //Associate elements and complex types
                                        var elements = [];
                                        var complexTypes = [];
                                        for (var j = 0; j < wsdlJson[i]._children.length; j++) {
                                            if (wsdlJson[i]._children[j].tag == 'wsdl:types') {
                                                var schema = wsdlJson[i]._children[j]._children[0];
                                                for (var k = 0; k < schema._children.length; k++) {
                                                    //Save elements
                                                    if (schema._children[k].tag == 'xs:element') {
                                                        var elementDetails = {};
                                                        elementDetails.id = schema._children[k].attrib.name;
                                                        var dataType = schema._children[k].attrib.type;
                                                        if (dataType.indexOf('xs:') > -1) {
                                                            elementDetails.complexType = false;
                                                        } else {
                                                            elementDetails.complexType = true;
                                                        }
                                                        elementDetails.dataType = dataType.slice(dataType.indexOf(':') + 1);
                                                        elementDetails.default = schema._children[k].attrib.default || '';
                                                        elementDetails.fixed = schema._children[k].attrib.fixed || '';
                                                        elementDetails.maxOccurs = schema._children[k].attrib.maxOccurs || '';
                                                        elementDetails.minOccurs = schema._children[k].attrib.minOccurs || '';
                                                        elements.push(elementDetails);
                                                    }
                                                    //Save complex type
                                                    if (schema._children[k].tag == 'xs:complexType') {
                                                        var complexDetails = {
                                                            elements: []
                                                        };
                                                        complexDetails.id = schema._children[k].attrib.name;
                                                        //Iterate through the sequence 
                                                        for (var l = 0; l < schema._children[k]._children[0]._children.length; l++) {
                                                            if (schema._children[k]._children[0]._children[l].tag == 'xs:element') {
                                                                var eleSchema = schema._children[k]._children[0]._children[l];
                                                                var elementDetails = {};
                                                                elementDetails.id = eleSchema.attrib.name;
                                                                var dataType = eleSchema.attrib.type;
                                                                if (dataType.indexOf('xs:') > -1) {
                                                                    elementDetails.complexType = false;
                                                                } else {
                                                                    elementDetails.complexType = true;
                                                                }
                                                                elementDetails.dataType = dataType.slice(dataType.indexOf(':') + 1);
                                                                elementDetails.default = eleSchema.attrib.default || '';
                                                                elementDetails.fixed = eleSchema.attrib.fixed || '';
                                                                elementDetails.maxOccurs = eleSchema.attrib.maxOccurs || '';
                                                                elementDetails.minOccurs = eleSchema.attrib.minOccurs || '';
                                                                complexDetails.elements.push(elementDetails);
                                                            }
                                                        }
                                                        complexTypes.push(complexDetails.elements);
                                                    }
                                                }
                                            }
                                        }
                                        //Associate message formats with its types
                                        var messages = [];
                                        for (var j = 0; j < wsdlJson[i]._children.length; j++) {
                                            var msgDetails = {};
                                            if (wsdlJson[i]._children[j].tag == 'wsdl:message') {
                                                msgDetails.id = wsdlJson[i]._children[j].attrib.name;
                                                for (l = 0; l < wsdlJson[i]._children[j]._children.length; l++) {
                                                    var partSchema = wsdlJson[i]._children[j]._children[l];
                                                    //mapping element
                                                    if (partSchema.attrib.element != undefined && partSchema.attrib.element != null && partSchema.attrib.element != '') {
                                                        var eleName = partSchema.attrib.element;
                                                        eleName = eleName.slice(eleName.indexOf(':') + 1);
                                                        for (k = 0; k < elements.length; k++) {
                                                            if (elements[k].id == eleName) {
                                                                msgDetails.element = elements[k];
                                                            }
                                                        }
                                                    }
                                                    //mapping type
                                                    if (partSchema.attrib.type != undefined && partSchema.attrib.type != null && partSchema.attrib.type != '') {
                                                        var typeName = partSchema.attrib.type;
                                                        typeName = typeName.slice(typeName.indexOf(':') + 1);
                                                        for (k = 0; k < complexTypes.length; k++) {
                                                            if (complexTypes[k].id == typeName) {
                                                                msgDetails.element = complexTypes[k];
                                                            }
                                                        }
                                                    }
                                                }
                                                messages.push(msgDetails);
                                            }
                                        }
                                        //Adding the operations
                                        for (var j = 0; j < wsdlJson[i]._children.length; j++) {
                                            if (wsdlJson[i]._children[j].tag == 'wsdl:portType') {
                                                for (var k = 0; k < wsdlJson[i]._children[j]._children.length; k++) {
                                                    var op = wsdlJson[i]._children[j]._children[k];
                                                    var operationDetails = {};
                                                    operationDetails.id = op.attrib.name;
                                                    //Sort the operation type
                                                    for (var l = 0; l < op._children.length; l++) {
                                                        //Operation input
                                                        if (op._children[l].tag == 'wsdl:input') {
                                                            var messageDetails = {};
                                                            //Associatng message details
                                                            for (var m = 0; m < messages.length; m++) {
                                                                var messageId = op._children[l].attrib.message;
                                                                messageId = messageId.slice(messageId.indexOf(':') + 1);
                                                                if (messageId == messages[m].id) {
                                                                    messageDetails = messages[m];
                                                                }
                                                            }
                                                            operationDetails.input = {
                                                                id: op._children[l].attrib.name,
                                                                action: op._children[l].attrib['wsam:Action'],
                                                                message: messageDetails
                                                            }
                                                        }

                                                        //Operation output
                                                        if (op._children[l].tag == 'wsdl:output') {
                                                            var messageDetails = {};
                                                            //Associatng message details
                                                            for (var m = 0; m < messages.length; m++) {
                                                                var messageId = op._children[l].attrib.message;
                                                                messageId = messageId.slice(messageId.indexOf(':') + 1);
                                                                if (messageId == messages[m].id) {
                                                                    messageDetails = messages[m];
                                                                }
                                                            }
                                                            operationDetails.output = {
                                                                id: op._children[l].attrib.name,
                                                                action: op._children[l].attrib['wsam:Action'],
                                                                message: messageDetails
                                                            }
                                                            if (operationDetails.input == undefined) {
                                                                if (op._children.length == 1) {
                                                                    operationDetails.type = 'notification';
                                                                } else {
                                                                    operationDetails.type = 'solicitResponse';
                                                                }
                                                            } else {
                                                                operationDetails.type = 'requestResponse';
                                                            }
                                                        }

                                                        //Operation input
                                                        if (op._children[l].tag == 'wsdl:fault') {
                                                            var messageDetails = {};
                                                            //Associatng message details
                                                            for (var m = 0; m < messages.length; m++) {
                                                                var messageId = op._children[l].attrib.message;
                                                                messageId = messageId.slice(messageId.indexOf(':') + 1);
                                                                if (messageId == messages[m].id) {
                                                                    messageDetails = messages[m];
                                                                }
                                                            }
                                                            operationDetails.fault = {
                                                                id: op._children[l].attrib.name,
                                                                action: op._children[l].attrib['wsam:Action'],
                                                                message: messageDetails
                                                            }
                                                        }
                                                    }
                                                    if (operationDetails.output == undefined) {
                                                        operationDetails.type = 'oneWay';
                                                    }
                                                    wsdlOperations.push(operationDetails);
                                                }
                                            }
                                        }
                                    }
                                }
                                //Store the operations to the device details
                                for (var i = 0; i < devDetails.services.length; i++) {
                                    if (devDetails.services[i].controlUrl == url) {
                                        devDetails.services[i].operations = wsdlOperations;
                                    }
                                }
                            }
                            lpCallback();
                        });
                    }, function (err) {
                        loopCallback();
                    });
                }, function (err) {
                    callback(null, devDetails);
                });
            }, function (devDetails, callback) {
                devDetails.rplServices = {};
                devDetails.rplEvents = {};
                for (var i = 0; i < devDetails.services.length; i++) {
                    var oper = devDetails.services[i].operations;
                    for (var j = 0; j < oper.length; j++) {
                        var actService = {};
                        var actEvent = {};
                        if (oper[j].type === 'notification') {
                            actEvent.id = oper[j].id;
                            actEvent.class = 'event';
                            actEvent.links = {
                                self: "http://" + localIP + ":" + PORT + "/RTU/" + devDetails.id + "/events/" + oper[j].id,
                                info: "http://" + localIP + ":" + PORT + "/RTU/" + devDetails.id + "/events/" + oper[j].id + "/info",
                                notifs: "http://" + localIP + ":" + PORT + "/RTU/" + devDetails.id + "/events/" + oper[j].id + "/notifs"
                            };
                            actEvent.meta = {
                                deviceId: devDetails.id,
                                sensorType: oper[j].id,
                                deviceType: 'dpws',
                                parentServiceId: devDetails.services[i].id
                            };
                            devDetails.rplEvents[oper[j].id] = actEvent;
                        } else {
                            actService.id = oper[j].id;
                            if (oper[j].type === 'requestResponse') {
                                actService.class = 'query';
                            } else if (oper[j].type === 'oneWay') {
                                actService.class = 'operation';
                            }
                            actService.links = {
                                self: "http://" + localIP + ":" + PORT + "/RTU/" + devDetails.id + "/services/" + oper[j].id,
                                info: "http://" + localIP + ":" + PORT + "/RTU/" + devDetails.id + "/services/" + oper[j].id + "/info"
                            };
                            actService.meta = {
                                deviceId: devDetails.id,
                                deviceType: 'dpws',
                                sensorType: oper[j].id,
                                serviceType: oper[j].type,
                                parentServiceId: devDetails.services[i].id
                            };
                            devDetails.rplServices[oper[j].id] = actService;
                        }
                    }
                }
                callback(null, devDetails);
            }
        ], function (err, result) {
            devices[result.id] = result;
        });
    }
}

module.exports = {
    deviceIds: deviceIds,
    devicesInfo: devices,
    deviceRequest: deviceRequest
};

// Function to check the array
function isInArray(array, search) {
    return array.indexOf(search) >= 0;
};

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

/**
 * Method to find data in DPWS JSON message (Json formed from SOAP xml)
 */
function findEntity(json, tagName) {
    var strJson = JSON.stringify(json);
    var reply = {
        data: {},
        children: json.details,
        iterate: true
    };
    if (strJson.indexOf(tagName) >= 0) {
        do {
            reply = iterateFor(reply.children, tagName);
        } while (reply.children.length > 0 && reply.iterate);

        if (reply.data.text != null && reply.data.text != undefined) {
            return reply.data;
        }
    }
    return reply.data;
}

/**
 * Metod for refactoring iterative for loop
 */
function iterateFor(jsonData, tagName) {
    var reply = {
        data: {},
        children: [],
        iterate: true
    };
    for (var j = 0; j < jsonData.length; j++) {
        if (jsonData[j].tag == tagName) {
            reply.data = jsonData[j];
            reply.children = [];
            reply.iterate = false;
            break;
        } else if (jsonData[j]._children.length > 0) {
            reply.data = {};
            for (k = 0; k < jsonData[j]._children.length; k++) {
                reply.children.push(jsonData[j]._children[k]);
            }
        }
    }
    if ((Object.keys(reply.data).length == 0) && (reply.children.length == 0)) {
        reply.iterate = false;
    }
    return reply;
}