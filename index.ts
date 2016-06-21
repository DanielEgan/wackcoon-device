import * as path from 'path';
import * as fs from 'fs';
var resemble = require('node-resemble-js');
import * as moment from 'moment';
import * as gpio from 'pi-gpio';
// import * as request from 'request';
// import * as querystring from 'querystring';
// var azure = require('azure-storage');
// var clientFromConnectionString = require('azure-iot-device-amqp').clientFromConnectionString;
// var Message = require('azure-iot-device').Message;

let REVERSE_BUFFER = 60;
let FORWARD_BUFFER = 120;
let DIFFERENCE_THRESHOLD = 20; //percent
let recordingStart = null;
let recordingTimer;

let imagesRoot = path.join('..', 'images');
let imageEvents: any[] = [];

//TRIGGER 1: MOTION SENSOR
// when the IR sensor goes high
// cachedValue is used to debounce the signal
gpio.open(4, "input", function (err) {
    let lastValue = null;
    setInterval(gpio.read(4, function (err, value) {
        if (lastValue === 0 && value === 1) {
            imageEvents.push(Date.now());
            console.log('detected motion');
        }
    }), 200);
});

//TRIGGER 2: IMAGE DIFF
//watch the images folder (up one from -device) for new images to land
let last_file;
fs.watch(imagesRoot, (event, filename) => {
    if (event === 'rename' && /^\d+\.png$/.test(filename) && fs.existsSync(path.join(imagesRoot, filename))) {
        let mismatch;
        let this_file = fs.readFileSync(path.join(imagesRoot, filename));
        if (last_file) {
            resemble(this_file).compareTo(last_file)
                .onComplete(function (data) {
                    if (parseFloat(data.misMatchPercentage) > DIFFERENCE_THRESHOLD)
                        imageEvents.push(Date.now());
                });
            //consider sending diff information to iothub here
        }
        last_file = this_file;
    }
});

setInterval(processFiles, 1000);

function processFiles() {
    fs.readdir(imagesRoot, (err, files) => {
        files.forEach(file => {
            if (/^\d+\.png$/.test(file)) {
                let birthtime = fs.statSync(path.join(imagesRoot, file)).birthtime;
                let match = false;
                imageEvents.forEach(e => {
                    let reverse = moment(e).subtract(REVERSE_BUFFER, 'seconds');
                    let forward = moment(e).add(FORWARD_BUFFER, 'seconds');
                    if (moment(birthtime).isBetween(reverse, forward, null, '[]'))
                        match = true;
                })
                let expired = moment(birthtime).isBefore(moment(Date.now()).subtract(REVERSE_BUFFER, 'seconds'));
                if (match)
                    console.log('cog and save ' + file);
                else if (match || expired)
                    fs.unlinkSync(path.join(imagesRoot, file));
            };
        });
    });
}

// var connectionString = process.env.WACKCOON1_DEVICE_CONNECTIONSTRING;
// var client = clientFromConnectionString(connectionString);

// //var client = new device.Client(connectionString, new device.Https());
// // Create a message and send it to IoT Hub.
// var data = JSON.stringify({ 'deviceId': 'myFirstDevice', 'data': 'mydata' });


// function printResultFor(op) {
//     return function printResult(err, res) {
//         if (err) console.log(op + ' error: ' + err.toString());
//         if (res) console.log(op + ' status: ' + res.constructor.name);
//     };
// }
// function sendIOTMessage(data) {
//     var message = new Message(data);
//     console.log("Sending message: " + message.getData());
//     client.sendEvent(message, printResultFor('send'));
// }

// var connectCallback = function (err) {
//     if (err) {
//         console.log('Could not connect: ' + err);
//     } else {
//         console.log('Client connected');
//     }
// };

//client.open(connectCallback);

// //creating azure container stuff
// console.log('before creating blob');

// var bs = azure.createBlobService();
// bs.createContainerIfNotExists('wackcooncontainer', {
//     publicAccessLevel: 'blob'
// }, function (error, result, response) {
//     if (!error) {
//         // if result = true, container was created.
//         if (result === true) {
//             console.log('container create');
//         } else {
//             // if result = false, container already existed.
//             console.log('container exists');
//         }
//     }
// });
// console.log('after creating blob');

//     //     //List of tags requested, currently only looking for tags
//     //     let params = querystring.stringify({
//     //         "visualFeatures": "Tags"
//     //     });
//     //     //Create headers and form data
//     //     //ToDo: Key should be held somewhere else
//     //     let options = {
//     //         url: 'https://api.projectoxford.ai/vision/v1.0/analyze?' + params,
//     //         headers: { 'Ocp-Apim-Subscription-Key': '48cdc4d0cd6d4bed9f1cb05dcfef72ec', 'Content-Type': 'multipart/form-data' },
//     //         formData: {
//     //             my_file: fs.createReadStream(path.join(__dirname, 'captures', f)),
//     //         }
//     //     };
//     //     //open connection to IOT Hub
//     //     //Returning JSON from call 
//     //     request.post(options, (err, httpResponse, body) => {
//     //         if (err) {
//     //             console.log('Error: ' + err);
//     //         } else {
//     //             //in here we want to see if it is a raccoon and if so, save image
//     //             //for testing, this is the full JSON
//     //             console.log('Success ' + body);
//     //             //we want to parse the JSON to pull out the name and confidence in the name
//     //             try {
//     //                 //parsing json
//     //                 //send to iot hub
//     //                 sendIOTMessage(body);
//     //                 var o = JSON.parse(body);
//     //                 for (var i = 0; i < o.tags.length; i++) {
//     //                     var name = o.tags[i].name;
//     //                     var confidence = o.tags[i].confidence;
//     //                     console.log(name);
//     //                     console.log(confidence);
//     //                     // If we are confident that it is a racoon (or any other word for testing) 
//     //                     // then want to upload to blob storage
//     //                     var myFile = __dirname + '/captures/' + f;
//     //                     var myBlob = createGUID();
//     //                     bs.createBlockBlobFromLocalFile('wackcooncontainer', myBlob, myFile, function (error, result, response) {
//     //                         if (!error) {
//     //                             // file uploaded
//     //                             console.log('successfully uploaded to blob');
//     //                         } else {
//     //                             console.log(error);
//     //                         }
//     //                         //log response either way
//     //                         console.log(response);

//     //                     });

//     //                     console.log(process.env.WACKCOON1_DEVICE_CONNECTIONSTRING);

//     //                     //get the url to the image we want to send. need to check this.

//     //                     // if not, log that it was not a racoon and maybe save image anyway?


//     //                     //delete the one on disk

//     //                 }
//     //             } catch (error) {
//     //                 console.log(error);
//     //             }
//     //         }

//     //         //console.log((err ? 'Error: ' + err : 'Success: ' + body));
//     //     });
// }