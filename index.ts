import * as path from 'path';
import * as fs from 'fs';
var request = require('request');
import RaspiCam = require('raspicam');
var querystring = require('querystring');

let camera = new RaspiCam({
    mode: 'photo',
    timelapse: 1000,
    timeout: 0,
    rotation: 180,
    preview: '100,100,200,200',
    output: path.join(__dirname, 'captures/%d.jpg')
});

camera.on("started", () => {
    console.log('started taking photos every second (saved to captures directory)')
});

//when each photo is saved
camera.on("read", (e, ts, f) => {

    let params = querystring.stringify({
        "visualFeatures": "Tags"
    });

    let options = {
        url: 'https://api.projectoxford.ai/vision/v1.0/analyze?' + params,
        headers: { 'Ocp-Apim-Subscription-Key': '48cdc4d0cd6d4bed9f1cb05dcfef72ec', 'Content-Type': 'multipart/form-data' },
        formData: {
            my_file: fs.createReadStream(__dirname + '/captures/' + f),
        }
    };

    request.post(options, (err, httpResponse, body) => {
        console.log((err ? 'Error: ' + err : 'Success: ' + body));
    });

});

//start taking timelapses
console.log('starting camera...');
camera.start();

//catch crashes and unexpected exits
process.on('exit', () => camera.stop());
process.on('SIGINT', () => camera.stop());
process.on('uncaughtException', () => camera.stop());