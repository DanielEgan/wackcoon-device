import * as path from 'path';
import RaspiCam = require('raspicam');
var needle = require('needle');
var querystring = require('querystring');

let camera = new RaspiCam({
    mode: 'photo',
    timelapse: 10000,
    timeout: 0,
    rotation: 180,
    preview: '100,100,200,200',
    output: path.join(__dirname, 'captures/%d.jpg')
});

camera.on("started", () => {
    console.log('started taking photos every second (saved to captures directory)')
});

//when each photo is saved
camera.on("read", (e, f) => {

    var params = querystring.stringify({
        "visualFeatures": "Tags"
    });
    console.log(f);
    var data = JSON.stringify({
        file: 'captures/' + f,
        content_type: 'image/png'
    });

    var options = {
        headers: { 'Ocp-Apim-Subscription-Key': '48cdc4d0cd6d4bed9f1cb05dcfef72ec', 'Content-Type': 'image/jpg' },
        multipart: true
    }

    needle.post('https://api.projectoxford.ai/vision/v1.0/analyze?' + params, data, options, function (err, resp) {
        // you can pass params as a string or as an object.
        console.log(err);
        console.log(resp.body);
    });

});

//listen for the process to exit when the timeout has been reached
camera.on("exited", () => { });

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