import * as path from 'path';
import * as fs from 'fs';
import * as request from 'request';
import * as querystring from 'querystring';
import RaspiCam = require('raspicam');
var resemble = require('resemblejs');
var azure = require('azure-storage');

var clientFromConnectionString = require('azure-iot-device-amqp').clientFromConnectionString;
var Message = require('azure-iot-device').Message;

var connectionString = process.env.WACKCOON1_DEVICE_CONNECTIONSTRING;

var client = clientFromConnectionString(connectionString);
//var client = new device.Client(connectionString, new device.Https());
// Create a message and send it to IoT Hub.
var data = JSON.stringify({ 'deviceId': 'myFirstDevice', 'data': 'mydata' });


function printResultFor(op) {
    return function printResult(err, res) {
        if (err) console.log(op + ' error: ' + err.toString());
        if (res) console.log(op + ' status: ' + res.constructor.name);
    };
}
function sendIOTMessage(data) {
    var message = new Message(data);
    console.log("Sending message: " + message.getData());
    client.sendEvent(message, printResultFor('send'));
}

var connectCallback = function (err) {
    if (err) {
        console.log('Could not connect: ' + err);
    } else {
        console.log('Client connected');
    }
};

client.open(connectCallback);

function createGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

var fileName = createGUID();

let camera = new RaspiCam({
    mode: 'photo',
    timelapse: 10000,
    timeout: 0,
    rotation: 180,
    preview: '100,100,200,200',
    output: path.join(__dirname, 'captures', fileName + '.jpg')
});

//creating azure container stuff
console.log('before creating blob');

var bs = azure.createBlobService();
bs.createContainerIfNotExists('wackcooncontainer', {
    publicAccessLevel: 'blob'
}, function (error, result, response) {
    if (!error) {
        // if result = true, container was created.
        if (result === true) {
            console.log('container create');
        } else {
            // if result = false, container already existed.
            console.log('container exists');
        }
    }
});
console.log('after creating blob');

camera.on("started", () => {
    console.log('started taking photos every second (saved to captures directory)')
});

//when each photo is saved
let lastfile;
camera.on("read", (e, ts, f) => {
    //Checking to see if it is a test file
    let isTempFile = /~/.test(f);
    //If it is not then load up to send to Vision API
    if (!isTempFile) {
        //compare file to last 
        try {
            if (lastfile) {
                let diff = resemble(f).compareTo(lastfile).onComplete(data => {
                    console.log('difference: ' + data.misMatchPercentage)
                });
            }
            lastfile = f;
        } catch (error) {
            console.log(error);

        }


        //List of tags requested, currently only looking for tags
        let params = querystring.stringify({
            "visualFeatures": "Tags"
        });
        //Create headers and form data
        //ToDo: Key should be held somewhere else
        let options = {
            url: 'https://api.projectoxford.ai/vision/v1.0/analyze?' + params,
            headers: { 'Ocp-Apim-Subscription-Key': '48cdc4d0cd6d4bed9f1cb05dcfef72ec', 'Content-Type': 'multipart/form-data' },
            formData: {
                my_file: fs.createReadStream(path.join(__dirname, 'captures', f)),
            }
        };
        //open connection to IOT Hub
        //Returning JSON from call 
        request.post(options, (err, httpResponse, body) => {
            if (err) {
                console.log('Error: ' + err);
            } else {
                //in here we want to see if it is a raccoon and if so, save image
                //for testing, this is the full JSON
                console.log('Success ' + body);
                //we want to parse the JSON to pull out the name and confidence in the name
                try {
                    //parsing json
                    //send to iot hub
                    sendIOTMessage(body);
                    var o = JSON.parse(body);
                    for (var i = 0; i < o.tags.length; i++) {
                        var name = o.tags[i].name;
                        var confidence = o.tags[i].confidence;
                        console.log(name);
                        console.log(confidence);
                        // If we are confident that it is a racoon (or any other word for testing) 
                        // then want to upload to blob storage
                        var myFile = __dirname + '/captures/' + f;
                        var myBlob = createGUID();
                        bs.createBlockBlobFromLocalFile('wackcooncontainer', myBlob, myFile, function (error, result, response) {
                            if (!error) {
                                // file uploaded
                                console.log('successfully uploaded to blob');
                            } else {
                                console.log(error);
                            }
                            //log response either way
                            console.log(response);

                        });

                        console.log(process.env.WACKCOON1_DEVICE_CONNECTIONSTRING);

                        //get the url to the image we want to send. need to check this.

                        // if not, log that it was not a racoon and maybe save image anyway?


                        //delete the one on disk

                    }
                } catch (error) {
                    console.log(error);
                }
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