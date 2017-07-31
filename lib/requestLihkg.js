/**
 * Created by kin021360 on 25/12/2016.
 */
"use strict";

const request = require("request");
//var EventEmitter = require('events').EventEmitter;
const file = require("fs");
//var event = new EventEmitter();
const log4js = require("log4js");
log4js.configure({
    appenders: [{
        type: 'console'
    }]
});
const logger = log4js.getLogger("[requestLihkg.js]");


function readError(callback) {
    file.readFile(__dirname + "/../error/error.json", "utf8", function (err, data) {
        if (err) {
            //console.log(err);
            callback({errorPost: []});
        } else {
            try {
                let temp = JSON.parse(data);
                callback(temp);
            } catch (e) {
                callback({errorPost: []});
            }
        }
    });
}

function writeError(inputData, callback) {
    file.writeFile(__dirname + "/../error/error.json", inputData, function (err) {
        if (err) {
            console.log(err);
        }
        callback();
    });
}

function writeJson(threadNum, inputData, callback) {
    file.writeFile(__dirname + "/../json/thread_" + threadNum + ".json", inputData, function (err) {
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
    let options = {
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
                });
            } else if (response.statusCode === 200) {
                try {
                    let bodyObject = JSON.parse(body);
                    callback(bodyObject);
                } catch (e) {
                    console.log(e);
                    callRequest(threadNum, page, tryTime, function (res) {
                        callback(res);
                    });
                }
            } else {
                console.log("http error: statusCode=" + response.statusCode + ", statusMessage=" + response.statusMessage);
                callRequest(threadNum, page, tryTime, function (res) {
                    callback(res);
                });
            }
        });
    } else {
        file.appendFileSync(__dirname + "/../error/maxRetry10.txt", threadNum + "\n");
        logger.debug("function callRequest: maxRetry10, try time=" + tryTime);
        callback({"error_message": "maxRetry10"});
    }
}

function handler(threadNum, callback) {
    let currentPage = 1;
    let temp;

    function recursion(page) {
        callRequest(threadNum, page, 0, function (res) {
            //console.log(page);
            if (res && res.success) {
                res.response.item_data.forEach(function (value) {
                    temp.response.item_data.push(value);
                });
                if (res.response.total_page > currentPage) {
                    currentPage++;
                    recursion(currentPage);
                } else {
                    deleteUselessField(temp);
                    callback(temp);
                }
            } else {
                logger.debug("function recursion: callRequest - callback error, res=" + res);
                readError(function (errorData) {
                    let tempError = errorData;
                    tempError.errorPost.push({id: threadNum, error_message: res.error_message});
                    writeError(JSON.stringify(tempError), function () {
                        callback();
                    });
                });
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
            logger.debug("function handler: callRequest - callback error, res=" + res);
            readError(function (errorData) {
                let tempError = errorData;
                tempError.errorPost.push({id: threadNum, error_message: res.error_message});
                writeError(JSON.stringify(tempError), function () {
                    callback();
                });
            });
        }
    });
}

module.exports = handler;

process.on('message', function (message) {
    handler(message, function (data) {
        if (data) {
            writeJson(message, JSON.stringify(data), function () {
                process.send(true);
                process.exit();
            });
        } else {
            process.send(false);
            process.exit();
        }
    });
});