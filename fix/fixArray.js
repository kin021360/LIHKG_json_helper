/**
 * Created by as on 24/3/2017.
 */
"use strict";

var file = require("fs");

function read(threadNum, callback) {
    file.readFile("L:/json/thread_" + threadNum + ".json", "utf8", function (err, data) {
        if (err) {
            //console.log(err);
            callback(null);
        } else {
            callback(data);
        }
    });
}

function write(threadNum,inputData, callback) {
    file.writeFile("L:/json2/thread_"+threadNum+".json", inputData, function (err) {
        if (err) {
            console.log(err);
        }
        callback();
    });
}

function recur(thread, max, callback) {
    function call() {
        var newItem=[];
        function fixarray(object) {
            object.forEach(function(value){
                if (Array.isArray(value)) {
                    fixarray(value);
                } else {
                    newItem.push(value);
                }
            });
        }
        read(thread, function (res) {
            var th;
            var oldItem;
            if (res) {
                try{
                    th=JSON.parse(res);
                    oldItem=JSON.parse(res).response.item_data;
                    fixarray(oldItem);
                    th.response.item_data=newItem;
                    write(thread,JSON.stringify(th),function () {
                        if (thread < max) {
                            thread++;
                            call();
                        } else {
                            callback();
                        }
                    });
                }catch (e){
                    console.log("this thread cannot parse to json: "+thread);
                    if (thread < max) {
                        thread++;
                        call();
                    } else {
                        callback();
                    }
                }
            }else {
                if (thread < max) {
                    thread++;
                    call();
                } else {
                    callback();
                }
            }
        });
    }
    call();
}

recur(1,109000,function () {

});



