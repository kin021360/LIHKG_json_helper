/**
 * Created by kin021360 on 16/12/2016.
 */
"use strict";

var file = require("fs");
var child_process = require("child_process");
//var requestLihkg=require("./lib/requestLihkg");
//var event = new EventEmitter();
var log4js = require("log4js");
log4js.configure({
    appenders: [{
        type: 'fileSync',
        filename: __dirname + "/log/lihkg.log",
        maxLogSize: 2097152
    }, {
        type: 'console'
    }]
});
var logger = log4js.getLogger("[index.js]");

function logRename(startThread_id, callback) {
    var logPath = __dirname + "/log/";
    file.stat(logPath + "lihkg.log.1", function (error, stats) {
        if (error) {
            callback();
        } else {
            file.renameSync(logPath + "lihkg.log.1", logPath + "lihkg_" + startThread_id + ".log");
            callback();
        }
    })
}

function controller(start, end) {
    var step = start;

    function caller(startThread_id) {

        function forkWorker(startThread_id, callback) {
            var childNodejs = child_process.fork(__dirname + "/lib/requestLihkg.js");
            childNodejs.once('message', function (message) {
                console.log("process finish!");
                if (message) {
                    logger.info("Last threadNum done : " + startThread_id);
                } else {
                    logger.warn("Last threadNum done with error: " + startThread_id);
                }
                callback();
            });
            console.log("now: " + startThread_id);
            childNodejs.send(startThread_id);
        }

        forkWorker(startThread_id, function () {
            var randomNum = 28 + Math.floor(Math.random() * 10) + Math.floor(Math.random() * 10) * 6;
            logRename(startThread_id, function () {
            });
            step++;
            if (step <= end) {
                console.log("delay " + randomNum + "s to start " + step);
                setTimeout(function () {
                    caller(step);
                }, randomNum * 1000);
            }
        });
    }

    if (step <= end) {
        caller(step);
    }
}

// process.argv[2]
// process.argv[3]

controller(2, 3);