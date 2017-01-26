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
        type: 'file',
        filename: __dirname + "/log/lihkg.log"
    }, {
        type: 'console'
    }]
});
var logger = log4js.getLogger("[index.js]");

function write(threadNum, inputData) {
    file.writeFileSync(__dirname + "/json/thread_" + threadNum + ".json", inputData);
}

function controller(start, end) {
    var logPath = __dirname + "/log/";
    var step = start;

    function caller(startThread_id) {
        var ramdomNum = 28 + Math.floor(Math.random() * 10) + Math.floor(Math.random() * 10) * 6;
        var childNodejs = child_process.fork(__dirname + "/lib/requestLihkg.js");
        childNodejs.send(startThread_id);
        console.log("now: " + startThread_id);
        childNodejs.once('message', function (message) {
            if (message) {
                write(startThread_id, message);
            }
            logger.info("Last threadNum done : " + startThread_id);
            if (file.statSync(logPath + "lihkg.log").size / (1024 * 1024) > 2) {
                file.renameSync(logPath + "lihkg.log", logPath + "lihkg_" + step + ".log");
            }
            step++;
            if (step <= end) {
                console.log("delay " + ramdomNum + "s to start " + step);
                setTimeout(function () {
                    caller(step);
                }, ramdomNum * 1000);
            }
        });
    }

    if (step <= end) {
        caller(step);
    }
}

// process.argv[2]
// process.argv[3]

controller(2, 2);