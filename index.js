"use strict";
var path = require('path');
var RaspiCam = require('raspicam');
var camera = new RaspiCam({
    mode: 'photo',
    timelapse: 1000,
    timeout: 0,
    rotation: 180,
    output: path.join(__dirname, 'captures/%d')
});
camera.on("started", function () {
    console.log('started taking photos every second (saved to captures directory)');
});
//when each photo is saved
camera.on("read", function (e, f) { });
//listen for the process to exit when the timeout has been reached
camera.on("exited", function () { });
//start taking timelapses
camera.start();
//# sourceMappingURL=index.js.map