import * as path from 'path';
import * as fs from 'fs';
import * as request from 'request';
import * as querystring from 'querystring';
import RaspiCam = require('raspicam');
var azure = require('azure-storage');

let camera = new RaspiCam({
    mode: 'photo',
    timelapse: 10000,
    timeout: 0,
    rotation: 180,
    preview: '100,100,200,200',
    output: path.join(__dirname, 'captures', '%d.jpg')
});

camera.on("started", () => {
    console.log('started taking photos every second (saved to captures directory)')
});

//when each photo is saved
camera.on("read", (e, ts, f) => {
    let isTempFile = /~/.test(f);
    if (!isTempFile) {
        let params = querystring.stringify({
            "visualFeatures": "Tags"
        });

        let options = {
            url: 'https://api.projectoxford.ai/vision/v1.0/analyze?' + params,
            headers: { 'Ocp-Apim-Subscription-Key': '48cdc4d0cd6d4bed9f1cb05dcfef72ec', 'Content-Type': 'multipart/form-data' },
            formData: {
                my_file: fs.createReadStream(path.join(__dirname, 'captures', f)),
            }
        };

        request.post(options, (err, httpResponse, body) => {
            if (err) {
                console.log('Error: ' + err);

            } else {
                //in here we want to see if it is a raccoon and if so, save image
                var tagName = indoors;
                var tags = body.tags;
                var hasTag = function (tagName) {
                    var i = null;
                    for (i = 0; tags.length > i; i += 1) {
                        if (tags[i].tagName === tagName) {
                            console.log('found indoors tag');
                        }
                    }
                    console.log('no indoors tag');
                };

                console.log('Success' + body);

            }
            //console.log((err ? 'Error: ' + err : 'Success: ' + body));
        });
    }
});

//start taking timelapses
console.log('starting camera...');
camera.start();

//catch crashes and unexpected exits
process.on('exit', () => camera.stop());
process.on('SIGINT', () => camera.stop());
process.on('uncaughtException', () => camera.stop());