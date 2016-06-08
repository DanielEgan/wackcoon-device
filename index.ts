import * as path from 'path';
var RaspiCam = require('raspicam');

let camera = new RaspiCam({
    mode: 'photo',
    timelapse: 1000,
    timeout: 0,
    rotation: 180,
    output: path.join(__dirname, 'captures/%d')
});

camera.on("started", () => {
    console.log('started taking photos every second (saved to captures directory)')
});

//when each photo is saved
camera.on("read", (e, f) => { });

//listen for the process to exit when the timeout has been reached
camera.on("exited", () => { });

//start taking timelapses
camera.start();

console.log('started');