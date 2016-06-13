var path = require('path');
var fs = require('fs');
var request = require('request');
var querystring = require('querystring');
var RaspiCam = require('raspicam');
var azure = require('azure-storage');
var camera = new RaspiCam({
    mode: 'photo',
    timelapse: 10000,
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
                    var o = JSON.parse(body);
                    for (var i = 0; i < o.tags.length; i++) {
                        var name = o.tags[i].name;
                        var confidence = o.tags[i].confidence;
                        console.log(name);
                        console.log(confidence);
                        // If we are confident that it is a racoon (or any other word for testing) 
                        // then want to upload to blob storage
                        console.log('before creating blog');
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
                        console.log('after creating blog');
                        var myFile = __dirname + '/captures/' + f;
                        bs.createBlockBlobFromLocalFile('wackcooncontainer', 'wackcoonblob', myFile, function (error, result, response) {
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
                        console.log(f);
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