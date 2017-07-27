var localIP = require('my-local-ip')();
var PORT = 55556;
var HOST = localIP;
var ipAddr = 'http://' + localIP + ':' + PORT

var devices = require('./devices');
var registry = require('./registry');
var serviceInvocation = require('./serviceInvocation');

module.exports = function (app) {
    var swagger = {
        basePath: 'LS_0/RTU/LS_0_LU_0_HMI',
        paths: {
            '/events': {
                'get': {
                    'summary': 'Get event list',
                    'description': 'Get list of all events',
                    'operationId': 'getEvents',
                    'responses': {
                        '200': {
                            'schema': {
                                '$ref': '#/definitions/NodeInfo'
                            },
                            'description': 'Return NodeInfo object, class notifs were children contains list of events\n'
                        },
                        '500': {
                            'schema': {
                                '$ref': '#/definitions/Message'
                            },
                            'description': 'Getting event list failed due to the server error.'
                        }
                    }
                }
            },
            '/services': {
                'get': {
                    'summary': 'Get services list',
                    'description': 'Get list of all services',
                    'operationId': 'getServices',
                    'responses': {
                        '200': {
                            'schema': {
                                '$ref': '#/definitions/NodeInfo'
                            },
                            'description': 'Return NodeInfo object, class notifs were children contains list of services\n'
                        },
                        '500': {
                            'schema': {
                                '$ref': '#/definitions/Message'
                            },
                            'description': 'Getting services list failed due to the server error.'
                        }
                    }
                }
            },
            '/data': {
                'get': {
                    'summary': 'Get data list',
                    'description': 'Get list of all datas',
                    'operationId': 'getDatas',
                    'responses': {
                        '200': {
                            'schema': {
                                '$ref': '#/definitions/NodeInfo'
                            },
                            'description': 'Return NodeInfo object, class notifs were children contains list of datas\n'
                        },
                        '500': {
                            'schema': {
                                '$ref': '#/definitions/Message'
                            },
                            'description': 'Getting data list failed due to the server error.'
                        }
                    }
                }
            }
        },
        host: '127.0.0.1:5012',
        schemes: [
            'http'
        ],
        definitions: {
            'Message': {
                'description': "An object response or error message. It is based on the <a href='http://www.restapitutorial.com/'>REST API Tutorial</a>",
                'required': [
                    'code',
                    'status',
                    'message'
                ],
                'properties': {
                    'code': {
                        'description': 'Contains the HTTP response status code as an integer.',
                        'type': 'integer'
                    },
                    'data': {
                        'description': "Contains the response body. In the case of 'error' or 'fail' statuses, this contains the cause, or exception name.",
                        'type': 'string'
                    },
                    'message': {
                        'description': "Only used for 'fail' and 'error' statuses to contain the error message. For internationalization (i18n) purposes, this could contain a message number or code, either alone or contained within delimiters",
                        'type': 'string'
                    },
                    'status': {
                        'description': "Contains the text: 'success', 'fail', or 'error'. Where 'fail' is for HTTP status response values from 500-599, 'error' is for statuses 400-499, and 'success' is for everything else (e.g. 1XX, 2XX and 3XX responses)",
                        'enum': [
                            'success',
                            'fail',
                            'error'
                        ]
                    }
                }
            },
            'NodeInfo': {
                'description': 'An object describing a node in a eScopRTU tree',
                'required': [
                    'id',
                    'links',
                    'class'
                ],
                'properties': {
                    'children': {
                        'description': 'An array of child nodes, which should contain at least the same information as NodeInfo',
                        '$ref': '#/definitions/NodeInfo'
                    },
                    'links': {
                        'description': 'An object with links, at least with self URL which point to that resource',
                        '$ref': '#/definitions/Links'
                    },
                    'id': {
                        'description': 'ID of the node',
                        'type': 'string'
                    },
                    'class': {
                        'default': 'node',
                        'description': 'Class of the current resource.',
                        'type': 'string'
                    }
                },
                'discriminator': 'id'
            },
            'Links': {
                'description': 'An object describing a storage for links',
                'required': [
                    'self'
                ],
                'properties': {
                    'parent': {
                        'description': '(Optional) URL which points to the parent resource',
                        'type': 'string'
                    },
                    'notifs': {
                        'description': '(Optional) URL which points to list of notifications for current resource',
                        'type': 'string'
                    },
                    'self': {
                        'description': 'URL which points to current resource',
                        'type': 'string'
                    },
                    'info': {
                        'description': '(Optional) URL which points to info resource',
                        'type': 'string'
                    }
                }
            }
        },
        swagger: '2.0',
        info: {
            'x-meta': {
            },
            'description': 'This is a common description of REST API for all eScop devices. The document\ndescribes eScopRTU API. The other devices like eScop SimpleIO and eScop Service Manager\nuses subset of of functions from this API.\nThe description of the devices and their functions\nis provided in deliverable D3.4 Physical layer specification.\n<BR>\nThe eScopRTU REST API provides for basic resources\n* /data\n* /notifs\n* /events\n* /services\n\nThe */data* resources are used to access the RAW data from the underlying physical device. \nThey are meant for reading and writing directly to the I/Os or control algorithm.\n<BR>\nThe */notifs* (notifications) resource is meant for managing all the subscription for various\nresources on the device. One can find list of all notifications.\n<BR>\nThe content of */events* resource depends on the current device configuration.\nIt provides access to the all evens defined in the services which are running\non the eScopRTU.\n<BR>\nThe */services* resource contains list of available services on the RTU. These\nservices can managed by SERVICE MANAGER. New service can be described e.q. using\nStructured Text Language (STL). Specification of the service description is part \nof the deliverable D3.4 Physical layer specifications.\n',
            'title': 'eScopRTU API',
            'version': '2.0.0'
        }
    }

    var format = {
        id: 'LS_0_LU_0_HMI',
        links: {},
        meta: {},
        children: {},
        class: 'events'
    }

    /**
     * Function that provides HTTP method for providing the device swaggers 
     */
    app.get('/RTU/:deviceId/api/swagger.json', function (req, res) {
        var devId = req.params.deviceId;
        swagger.basePath = '/RTU/' + devId;
        swagger.host = HOST + ':' + PORT;
        swagger.info['x-meta'].deviceId = devId;
        swagger.info['x-meta'].protocol = devices.devicesInfo[devId].protocol;
        swagger.info['x-meta'].deviceType = devices.devicesInfo[devId].protocol;
        swagger.info['x-meta'].modelName = devices.devicesInfo[devId].modelName;
        swagger.info['x-meta'].serialNumber = devices.devicesInfo[devId].serialNumber;
        res.send(swagger);
    });

    /**
     * Function that provides HTTP method for providing the device events 
     */
    app.get('/RTU/:deviceId/events', function (req, res) {
        var devId = req.params.deviceId;
        format.id = devId;
        format.class = 'events';
        format.links = {
            self: ipAddr + '/RTU/' + devId + '/events',
            info: ipAddr + '/RTU/' + devId + '/events/info',
            parent: ipAddr + '/RTU/' + devId
        }
        format.meta.deviceId = devId;
        format.meta.modelName = devices.devicesInfo[devId].modelName;
        format.meta.serialNumber = devices.devicesInfo[devId].serialNumber;
        format.children = devices.devicesInfo[devId].rplEvents;
        res.send(format);
    });

    /**
     * Function that provides HTTP method for providing the device services 
     */
    app.get('/RTU/:deviceId/services', function (req, res) {
        var devId = req.params.deviceId;
        format.id = devId;
        format.class = 'services';
        format.links = {
            self: ipAddr + '/RTU/' + devId + '/services',
            info: ipAddr + '/RTU/' + devId + '/services/info',
            parent: ipAddr + '/RTU/' + devId
        }
        format.meta.deviceId = devId;
        format.meta.modelName = devices.devicesInfo[devId].modelName;
        format.meta.serialNumber = devices.devicesInfo[devId].serialNumber;
        if (devices.devicesInfo[devId].rplServices !== undefined) {
            format.children = devices.devicesInfo[devId].rplServices;
        } else {
            format.children = {};
        }
        res.send(format);
    });

    /**
     * Function that provides HTTP method for providing the device data 
     */
    app.get('/RTU/:deviceId/data', function (req, res) {
        var devId = req.params.deviceId;
        format.id = devId;
        format.class = 'data';
        format.links = {
            self: ipAddr + '/RTU/' + devId + '/data',
            info: ipAddr + '/RTU/' + devId + '/data/info',
            parent: ipAddr + '/RTU/' + devId
        }
        format.meta.deviceId = devId;
        format.meta.modelName = devices.devicesInfo[devId].modelName;
        format.meta.serialNumber = devices.devicesInfo[devId].serialNumber;
        format.children = {};
        res.send(format);
    });

    /**
     * Function that registes events for invocation
     */
    app.post('/RTU/:deviceId/events/:eventId/notifs', function (req, res) {
        registry.registerEventInvokers(req.params.deviceId, req.params.eventId, req.body);
        res.send({ 'response': 'success' });
    });

    app.get('/RTU/:deviceId/events/:eventId', function (req, res) {
        var devId = req.params.deviceId;
        var eventId = req.params.eventId;
        var replyJson = {
            meta: {},
            payload:{
                value:50,
                type:"integer"
            }
        };
        replyJson.meta.messageFormat = "http://" + localIP + ":" + PORT + "/message/service";
        replyJson.meta.deviceId = devId;
        replyJson.time = new Date().getTime();
        res.send(replyJson);
    });

    /**
     * Function that provides HTTP method for providing the service data 
     */
    app.get('/RTU/:deviceId/services/:serviceId', function (req, res) {
        var devId = req.params.deviceId;
        var serviceId = req.params.serviceId;
        var replyJson = {
            meta: {}
        };
        var devSer = [];
        devSer = devices.devicesInfo[devId].services;
        if (devices.devicesInfo[devId].protocol === "ssdp") {
            for (i = 0; i < devSer.length; i++) {
                for (j = 0; j < devSer[i].actions.length; j++) {
                    if (devSer[i].actions[j].id === serviceId) {
                        if (devSer[i].actions[j].arguments.length !== 0) {
                            if (devSer[i].actions[j].arguments[0].stateDetails !== undefined) {
                                if (devSer[i].actions[j].arguments[0].stateDetails.dataType !== undefined) {
                                    replyJson.type = devSer[i].actions[j].arguments[0].stateDetails.dataType;
                                }
                                if (devSer[i].actions[j].arguments[0].stateDetails.defaultValue !== undefined) {
                                    replyJson.value = devSer[i].actions[j].arguments[0].stateDetails.defaultValue;
                                }
                            }
                        }
                    }
                }
            }
        }
        replyJson.meta.deviceId = devId;
        replyJson.meta.messageFormat = "http://" + localIP + ":" + PORT + "/message/service";
        replyJson.time = new Date().getTime();
        res.send(replyJson);
    });

    /**
     * Function that provides HTTP method for providing the service data 
     */
    app.get('/RTU/:deviceId/services/:serviceId/info', function (req, res) {
        var devId = req.params.deviceId;
        var serviceId = req.params.serviceId;
        var replyJson = {
            meta: {}
        };
        var devSer = [];
        devSer = devices.devicesInfo[devId].services;
        for (i = 0; i < devSer.length; i++) {
            for (j = 0; j < devSer[i].actions.length; j++) {
                if (devSer[i].actions[j].id === serviceId) {
                    if (devSer[i].actions[j].arguments.length !== 0) {
                        if (devSer[i].actions[j].arguments[0].stateDetails !== undefined) {
                            if (devSer[i].actions[j].arguments[0].stateDetails.dataType !== undefined) {
                                replyJson.type = devSer[i].actions[j].arguments[0].stateDetails.dataType;
                            }
                            if (devSer[i].actions[j].arguments[0].stateDetails.defaultValue !== undefined) {
                                replyJson.value = devSer[i].actions[j].arguments[0].stateDetails.defaultValue;
                            }
                        }
                    }
                }
            }
        }
        replyJson.meta.deviceId = devId;
        replyJson.meta.messageFormat = "http://" + localIP + ":" + PORT + "/message/service";
        replyJson.time = new Date().getTime();
        res.send(replyJson);
    });

    /**
     * Function for sepcifing the message format
     */
    app.get('/message/service', function (req, res) {
        message = {
            dataTypeFormat: "type",
            timeFormat: "time",
            valueFormat: "value",
            stateFormat: "state"
        }
        res.send(message);
    });

    app.post('/RTU/:deviceId/services/:serviceId', function (req, res) {
        var devId = req.params.deviceId;
        var serviceId = req.params.serviceId;
        var devInfo = devices.devicesInfo[devId];
        if (devInfo.protocol === "ssdp") {
            serviceInvocation.invokeService(devId, serviceId);
        }
        res.send({ 'response': 'success' });
    });
}