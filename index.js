"use strict";
var path = require('path');
var fs = require('fs');
var request = require('request');
var querystring = require('querystring');
var RaspiCam = require('raspicam');
var camera = new RaspiCam({
    mode: 'photo',
    timelapse: 1000,
    timeout: 0,
    rotation: 180,
    preview: '100,100,200,200',
    output: path.join(__dirname, 'captures', '%d.jpg')
});
camera.on("started", function () {
    console.log('started taking photos every second (saved to captures directory)');
});
//when each photo is saved
camera.on("read", function (e, ts, f) {
    if (!f.search(/~/)) {
        var params = querystring.stringify({
            "visualFeatures": "Tags"
        });
        var options = {
            url: 'https://api.projectoxford.ai/vision/v1.0/analyze?' + params,
            headers: { 'Ocp-Apim-Subscription-Key': '48cdc4d0cd6d4bed9f1cb05dcfef72ec', 'Content-Type': 'multipart/form-data' },
            formData: {
                my_file: fs.createReadStream(path.join(__dirname, 'captures', f)),
            }
        };
        request.post(options, function (err, httpResponse, body) {
            console.log((err ? 'Error: ' + err : 'Success: ' + body));
        });
    }
});
//start taking timelapses
console.log('starting camera...');
camera.start();
//catch crashes and unexpected exits
process.on('exit', function () { return camera.stop(); });
process.on('SIGINT', function () { return camera.stop(); });
process.on('uncaughtException', function () { return camera.stop(); });
//# sourceMappingURL=index.js.map