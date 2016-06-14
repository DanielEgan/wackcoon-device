var path = require('path');
var fs = require('fs');
var request = require('request');
var querystring = require('querystring');
var RaspiCam = require('raspicam');
var azure = require('azure-storage');
var clientFromConnectionString = require('azure-iot-device-amqp').clientFromConnectionString;
var Message = require('azure-iot-device').Message;
var connectionString = process.env.WACKCOON1_DEVICE_CONNECTIONSTRING;
var client = clientFromConnectionString(connectionString);
//var client = new device.Client(connectionString, new device.Https());
// Create a message and send it to IoT Hub.
var data = [
    { id: 1, message: 'hello' },
    { id: 2, message: 'world' }
];
var messages = [];
data.forEach(function (value) {
    messages.push(new Message(JSON.stringify(value)));
});
console.log('sending ' + messages.length + ' events in a batch');
client.sendEventBatch(messages, printResultFor('send'));
function printResultFor(op) {
    return function printResult(err, res) {
        if (err)
            console.log(op + ' error: ' + err.toString());
        if (res)
            console.log(op + ' status: ' + res.statusCode + ' ' + res.statusMessage);
    };
}
function createGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
var fileName = createGUID();
var camera = new RaspiCam({
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
        }
        else {
            // if result = false, container already existed.
            console.log('container exists');
        }
    }
});
console.log('after creating blob');
camera.on("started", function () {
    console.log('started taking photos every second (saved to captures directory)');
});
//when each photo is saved
camera.on("read", function (e, ts, f) {
    //Checking to see if it is a test file
    var isTempFile = /~/.test(f);
    //If it is not then load up to send to Vision API
    if (!isTempFile) {
        //List of tags requested, currently only looking for tags
        var params = querystring.stringify({
            "visualFeatures": "Tags"
        });
        //Create headers and form data
        //ToDo: Key should be held somewhere else
        var options = {
            url: 'https://api.projectoxford.ai/vision/v1.0/analyze?' + params,
            headers: { 'Ocp-Apim-Subscription-Key': '48cdc4d0cd6d4bed9f1cb05dcfef72ec', 'Content-Type': 'multipart/form-data' },
            formData: {
                my_file: fs.createReadStream(path.join(__dirname, 'captures', f)),
            }
        };
        //open connection to IOT Hub
        //Returning JSON from call 
        request.post(options, function (err, httpResponse, body) {
            if (err) {
                console.log('Error: ' + err);
            }
            else {
                //in here we want to see if it is a raccoon and if so, save image
                //for testing, this is the full JSON
                console.log('Success ' + body);
                //we want to parse the JSON to pull out the name and confidence in the name
                try {
                    //parsing json
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
                            }
                            else {
                                console.log(error);
                            }
                            //log response either way
                            console.log(response);
                        });
                        console.log(process.env.WACKCOON1_DEVICE_CONNECTIONSTRING);
                    }
                }
                catch (error) {
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
process.on('exit', function () { return camera.stop(); });
process.on('SIGINT', function () { return camera.stop(); });
process.on('uncaughtException', function () { return camera.stop(); });
//# sourceMappingURL=index.js.map