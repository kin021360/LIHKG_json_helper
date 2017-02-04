/**
 * Created by kin021360 on 25/12/2016.
 */
"use strict";

var request = require("request");
//var EventEmitter = require('events').EventEmitter;
var file = require("fs");
//var event = new EventEmitter();

function read(callback) {
    file.readFile(__dirname + "/../error/error.json", "utf8", function (err, data) {
        if (err) {
            //console.log(err);
            callback({errorPost: []});
        } else {
            var temp;
            try {
                temp = JSON.parse(data);
                callback(temp);
            } catch (e) {
                callback({errorPost: []});
            }
        }
    });
}

function write(inputData, callback) {
    file.writeFile(__dirname + "/../error/error.json", inputData, function (err) {
        if (err) {
            console.log(err);
        }
        callback();
    });
}

function deleteUselessField(json) {
    delete json.success;
    delete json.response.page;
    json.response.item_data.forEach(function (value) {
        delete value.page;
    });
}

function callRequest(threadNum, page, tryTime, callback) {
    var options = {
        method: 'GET',
        url: "https://lihkg.com/api_v1/thread/" + threadNum + "/page/" + page,
        headers: {'cache-control': 'no-cache'},
        timeout: 60000
    };
    tryTime++;
    if (tryTime <= 10) {
        request(options, function (error, response, body) {
            if (error) {
                console.log("request error: " + error);
                callRequest(threadNum, page, tryTime, function (res) {
                    callback(res);
                })
            } else if (response.statusCode === 200) {
                try {
                    var bodyObject = JSON.parse(body);
                    callback(bodyObject);
                } catch (e) {
                    console.log(e);
                    callRequest(threadNum, page, tryTime, function (res) {
                        callback(res);
                    })
                }
            } else {
                console.log("http error: statusCode=" + response.statusCode + ", statusMessage=" + response.statusMessage);
                callRequest(threadNum, page, tryTime, function (res) {
                    callback(res);
                })
            }
        });
    } else {
        file.appendFileSync(__dirname + "/../error/maxRetry10.txt", threadNum + "\n");
        callback({"error_message": "maxRetry10"});
    }
}

function handler(threadNum, callback) {
    var currentPage = 1;
    var temp;

    function recursion(page) {
        callRequest(threadNum, page, 0, function (res) {
            //console.log(page);
            if (res && res.success) {
                temp.response.item_data.push(res.response.item_data);
                if (res.response.total_page > currentPage) {
                    currentPage++;
                    recursion(currentPage);
                } else {
                    deleteUselessField(temp);
                    callback(temp);
                }
            }
        });
    }

    callRequest(threadNum, currentPage, 0, function (res) {
        if (res && res.success) {
            temp = res;
            if (res.response.total_page > 1) {
                currentPage++;
                recursion(currentPage);
            } else {
                deleteUselessField(temp);
                callback(temp);
            }
        } else {
            var tempError;
            read(function (errorData) {
                tempError = errorData;
                tempError.errorPost.push({id: threadNum, error_message: res.error_message});
                write(JSON.stringify(tempError), function () {
                    callback();
                });
            })
        }
    });
}

module.exports = handler;

process.on('message', function (message) {
    handler(message, function (data) {
        console.log("process finish!");
        if (data) {
            process.send(JSON.stringify(data));
        } else {
            process.send(null);
        }
        process.exit();
    });
});