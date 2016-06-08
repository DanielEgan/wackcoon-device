"use strict";
var path = require('path');
var RaspiCam = require('raspicam');
var camera = new RaspiCam({
    mode: 'photo',
    timelapse: 1000,
    timeout: 0,
    rotation: 180,
    preview: '100,100,200,200',
    output: path.join(__dirname, 'captures/%d.jpg')
});
camera.on("started", function () {
    console.log('started taking photos every second (saved to captures directory)');
});
//when each photo is saved
camera.on("read", function (e, f) { });
//listen for the process to exit when the timeout has been reached
camera.on("exited", function () { });
//start taking timelapses
console.log('starting camera...');
camera.start();
function exit() {
    console.log('stopping camera...');
    camera.stop();
}
//do something when app is closing
process.on('exit', exit);
//catches ctrl+c event
process.on('SIGINT', exit);
//catches uncaught exceptions
process.on('uncaughtException', exit);
//# sourceMappingURL=index.js.map