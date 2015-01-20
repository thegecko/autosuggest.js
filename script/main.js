/*

Long polling for notifications
GET /{domain}/notification/pull

*/

var listGroups = function(state, callback) {
    var template = state.item.template;
    state.item.items = state.item.items || {};
    state.item.items["group1"] = template;
    state.item.items["group2"] = template;
    state.item.items["group3"] = template;
    callback();
};

var listEndpoints = function(state, callback) {
    var template = state.item.template;
    state.item.items = state.item.items || {};
    state.item.items["endpoint1"] = template;
    state.item.items["endpoint2"] = template;
    state.item.items["endpoint3"] = template;
    callback();
};

var listGroupsAndEndpoints = function(state, callback) {
    state.item.items = state.item.items || {};

    var groupTemplate = state.item.groupTemplate;
    state.item.items["group1"] = groupTemplate;
    state.item.items["group2"] = groupTemplate;
    state.item.items["group3"] = groupTemplate;

    var endpointTemplate = state.item.endpointTemplate;
    state.item.items["endpoint1"] = endpointTemplate;
    state.item.items["endpoint2"] = endpointTemplate;
    state.item.items["endpoint3"] = endpointTemplate;
    callback();
};

var listResources = function(state, callback) {
    var template = state.item.template;
    state.item.items = state.item.items || {};
    state.item.items["resource1"] = template;
    state.item.items["resource2"] = template;
    state.item.items["resource3"] = template;
    callback();
};

var template1 = {
    prefill: true,
    items: {
        root: {
            value: "/api/domain",
            items: {
                groups: {
                    description: "List root groups",
                    delimiter: "/",
                    itemFn: listGroups,
                    template: {
                        description: "Read group content",
                        delimiter: "/",
                    },
                    items: {
                        all: {
                            description: "List all groups, not just root (default: false)",
                            delimiter: "?",
                            items: {
                                true: { delimiter: "=" },
                                false: { delimiter: "=" }
                            }
                        }
                    }
                },

                endpoints: {
                    description: "List all endpoints",
                    delimiter: "/",
                    itemFn: listEndpoints,
                    template: {
                        description: "List endpoint's resources meta-information",
                        delimiter: "/",
                        itemFn: listResources,
                        template: {
                            description: "Endpoint's resource representation",
                            delimiter: "/",
                            items: {
                                sync: {
                                    description: "Synchronous or asynchronous (default: false)",
                                    delimiter: "?",
                                    multiDelimiter: "&",
                                    allowOthers: true,
                                    items: {
                                        true: { delimiter: "=" },
                                        false: { delimiter: "=" }
                                    }
                                },
                                cacheOnly: {
                                    description: "Response will come only from cache (default: false)",
                                    delimiter: "?",
                                    multiDelimiter: "&",
                                    allowOthers: true,
                                    items: {
                                        true: { delimiter: "=" },
                                        false: { delimiter: "=" }
                                    }
                                },
                                pri: {
                                    description: "Priority message (default: 0, UDP only)",
                                    delimiter: "?",
                                    multiDelimiter: "&",
                                    allowOthers: true,
                                    items: {
                                        0: { delimiter: "=" },
                                        1: { delimiter: "=" },                                    
                                        2: { delimiter: "=" },                                    
                                        3: { delimiter: "=" },                                    
                                        4: { delimiter: "=" },                                    
                                        5: { delimiter: "=" },                                    
                                        6: { delimiter: "=" },                                    
                                        7: { delimiter: "=" }                                   
                                    }
                                },
                                noResp: {
                                    description: "No waiting for response (default: false)",
                                    delimiter: "?",
                                    multiDelimiter: "&",
                                    allowOthers: true,
                                    items: {
                                        true: { delimiter: "=" },
                                        false: { delimiter: "=" }
                                    }
                                }
                            }
                        }
                    },
                    items: {
                        type: {
                            description: "Filters endpoints by endpoint type",
                            delimiter: "?",
                            multiDelimiter: "&",
                            allowOthers: true,
                            items: {
                                "*": {
                                    delimiter: "=",
                                    placeHolder: "<endpoint type>"
                                }
                            }
                        },
                        stale: {
                            description: "Include stale endpoints (default: false)",
                            delimiter: "?",
                            multiDelimiter: "&",
                            allowOthers: true,
                            items: {
                                true: { delimiter: "=" },
                                false: { delimiter: "=" }
                            }
                        }
                    }
                },

                subscriptions : {
                    delimiter: "/",
                    itemFn: listEndpoints,
                    template: {
                        description: "Read/Delete endpoint subscriptions",
                        delimiter: "/",
                        verbs: ["GET", "DELETE"],
                        itemFn: listResources,
                        template: {
                            description: "Create/Read/Delete resource subscription",
                            delimiter: "/",
                            verbs: ["PUT", "GET", "DELETE"],
                            items: {
                                sync: {
                                    description: "Synchronous or asynchronous (default: false)",
                                    delimiter: "?",
                                    items: {
                                        true: { delimiter: "=" },
                                        false: { delimiter: "=" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

var template2 = {
    prefill: true,
    references: {
        "query": {
            description: "Search text",
            delimiter: "?",
            items: {
                "*": {
                    delimiter: "=",
                    placeHolder: "<search text>",
                    valid: true
                }
            }
        },
        "address": {
            delimiter: "?",
            multiDelimiter: "&",
            items: {
                "*": {
                    delimiter: "=",
                    placeHolder: "<address>",
                    valid: true
                }
            }
        },
        "waypoints": {
            delimiter: "/",
            items: {
                "origin": {
                    "$ref": "#/references/address",
                    allowOthers: true
                },
                "destination": {
                    "$ref": "#/references/address",
                    allowOthers: true
                }
            }
        },
    },
    items: {
        "spotify": {
            value: "http://ws.spotify.com/search/1",
            description: "Spotify API",
            items: {
                "artist": {
                    description: "Search artists",
                    delimiter: "/",
                    items: {
                        "q": { "$ref": "#/references/query" }
                    }
                },
                "album": {
                    description: "Search albums",
                    delimiter: "/",
                    items: {
                        "q": { "$ref": "#/references/query" }
                    }
                },
                "track": {
                    description: "Search tracks",
                    delimiter: "/",
                    items: {
                        "q": { "$ref": "#/references/query" }
                    }
                }
            }
        },
        "google": {
            value: "https://maps.googleapis.com/maps/api",
            description: "Google APIs",
            items: {
                "directions": {
                    description: "Get directions",
                    delimiter: "/",
                    items: {
                        "json": {
                            description: "Return JSON format",
                            "$ref": "#/references/waypoints"
                        },
                        "xml": {
                            description: "Return XML format",
                            "$ref": "#/references/waypoints"
                        }
                    }
                },
                "geocode": {
                    description: "Geocode address",
                    delimiter: "/",
                    items: {
                        "json": {
                            description: "Return JSON format",
                            delimiter: "/",
                            items: {
                                "address": { "$ref": "#/references/address" }
                            }
                        },
                        "xml": {
                            description: "Return XML format",
                            delimiter: "/",
                            items: {
                                "address": { "$ref": "#/references/address" }
                            }
                        }
                    }
                }
            }
        },
    }
};

var template3 = {
    references : {
        "actions" : {
            items : {
                "I will eat" : {
                    "$ref": "#/references/animals"
                },
                "I will cuddle": {
                    "$ref": "#/references/animals"
                },
                "I will sniff" : {
                    "$ref": "#/references/animals"
                }
            }
        },
        "meals" : {
            items : {
                "for lunch" : {
                    "$ref": "#/references/actions"
                },
                "for breakfast": {
                    "$ref": "#/references/actions"
                },
                "for dinner" : {
                    "$ref": "#/references/actions"
                }
            }
        },
        "animals" : {
            items : {
                "a pig" : {},
                "a sheep" : {},
                "a cow" : {}
            }
        },
        "days" : {
            items : {
                "today" : {
                    "$ref": "#/references/meals"
                },
                "tomorrow" : {
                    "$ref": "#/references/meals"
                },
                "next week" : {
                    "$ref": "#/references/meals"
                }
            }
        },
    },
    "$ref": "#/references/days"
};

var sug = new AutoSuggest(document.getElementById("suggest"), template2, function(value, state) {
    console.log(state.item);
  //  document.getElementById("button").disabled = !state.template.valid;
    document.getElementById("button").onclick = function() {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange=function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                document.getElementById("result").innerHTML = xhr.responseText;
            }
        };
        xhr.open("GET", value, true);
        xhr.send();
    }
});

var sug2 = new AutoSuggest(document.getElementById("suggest2"), template2, function(value, state) {
    console.log(value);
    console.log(state.list);
    console.log(state.template);
});

var sug3 = new AutoSuggest(document.getElementById("suggest3"), template3, function(value, state) {
    console.log(value);
    console.log(state.list);
    console.log(state.template);
});