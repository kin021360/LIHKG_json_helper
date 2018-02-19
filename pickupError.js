/**
 * Created by as on 27/1/2018.
 */
"use strict";

const requestLihkg = require("./lib/requestLihkg");
const file = require("fs");
const log4js = require("log4js");
log4js.configure({
    appenders: [{
        type: 'console'
    }]
});
const logger = log4js.getLogger("[pickupError.js]");

const errMsg = {
    "沒有相關文章": null,
    "該會員帳號已被封鎖": null
};

function writeJson(threadNum, inputData, callback) {
    file.writeFile(__dirname + "/json/thread_" + threadNum + ".json", inputData, function (err) {
        if (err) {
            console.log(err);
        }
        callback();
    });
}

function getErrIds(callback) {
    file.readFile("./error/error.json", "utf8", function (err, data) {
        if (err) {
            console.log(err);
            callback(null);
        } else {
            let pickupIds = [];
            const errorPosts = JSON.parse(data).errorPost;
            errorPosts.forEach(function (value) {
                if (!errMsg.hasOwnProperty(value.error_message)) {
                    pickupIds.push(value.id);
                }
            });
            logger.info("Number of ids have to pick up: " + pickupIds.length);
            callback(pickupIds);
        }
    });
}

function getThreadData(threadNum) {
    return new Promise(function (resolve, reject) {
        requestLihkg(threadNum, function (data) {
            if (data) {
                resolve(data);
            } else {
                console.log("ThreadId: " + threadNum + " has no data");
                reject();
            }
        });
    });
}

function getDataAndWrite(thread) {
    return new Promise(function (resolve, reject) {
        getThreadData(thread).then(function (result) {
            writeJson(thread, JSON.stringify(result), function () {
                resolve();
            });
        }).catch(resolve);
    });
}

function getTwoItems(currentIndex, array) {
    if (currentIndex < 0 || currentIndex >= array.length) {
        return [];
    }
    if (currentIndex !== array.length - 1) {
        return [array[currentIndex], array[currentIndex + 1]];
    } else {
        return [array[currentIndex]];
    }
}

function controller(ids) {
    const errIds = ids;

    function caller(startIndex) {

        function worker(sIndex, callback) {
            const threadsToGet = getTwoItems(sIndex, errIds);
            let promises = [];

            threadsToGet.forEach(function (value) {
                promises.push(getDataAndWrite(value));
            });

            Promise.all(promises).then(function (results) {
                callback();
            });
        }

        worker(startIndex, function () {
            let randomNum = 11 + Math.floor(Math.random() * 10) + Math.floor(Math.random() * 10) * 6;
            const step = startIndex += 2;
            if (step < errIds.length) {
                console.log("delay " + randomNum + "s to start index" + step + " of total " + errIds.length + " - 1");
                setTimeout(function () {
                    caller(step);
                }, randomNum * 1000);
            }
        });
    }

    if (ids.length > 0) {
        console.log("Total: " + ids.length);
        caller(0);
    }
}

getErrIds(function (array) {
    controller(array);
});