import * as request from 'request';
import * as querystring from 'querystring';
import * as fs from 'fs';
import * as path from 'path';
import * as azure from 'azure-storage';
let Message = require('azure-iot-device').Message;
let clientFromConnectionString = require('azure-iot-device-amqp').clientFromConnectionString;

export module store {

    export function cog(file: string, callback: (result: any) => void) {
        // List of tags requested, currently only looking for tags
        let params = querystring.stringify({
            "visualFeatures": "Tags"
        });

        //TODO: Key should be held somewhere else
        let options = {
            url: 'https://api.projectoxford.ai/vision/v1.0/analyze?' + params,
            headers: { 'Ocp-Apim-Subscription-Key': '48cdc4d0cd6d4bed9f1cb05dcfef72ec', 'Content-Type': 'multipart/form-data' },
            formData: {
                my_file: fs.createReadStream(file),
            }
        };

        request.post(options, (err, httpResponse, body) => {
            if (err) console.log('Error: ' + err);
            callback(JSON.parse(body));
        });
    }

    export function sendToHub(data) {
        let client = clientFromConnectionString(process.env.WACKCOON1_DEVICE_CONNECTIONSTRING);
        client.open(err => console.log(err ? 'Could not connect: ' + err : 'Client connected'));
            console.log('aobut to send ' + data);
            console.log('stringify? ' + JSON.stringify(data));
            var message = new Message(JSON.stringify(data));
            console.log("Sending message: " + message.getData());
            client.sendEvent(message, printResultFor('send'));
        
    }

    export function save(file: string, callback: (result: any) => void) {
        let bs = azure.createBlobService();
        bs.createContainerIfNotExists(
            'wackcooncontainer',
            { publicAccessLevel: 'blob' },
            function (error, result, response) {
                if (!error) console.log(result ? 'container created' : 'container existed');
            }
        );
        bs.createBlockBlobFromLocalFile('wackcooncontainer', createGUID(), file, (error, result, response) => {
            if (error) console.log(error);
            console.log('create blog response: ' + response);
        });
    }

    function printResultFor(op) {
        return function printResult(err, res) {
            if (err) console.log(op + ' error: ' + err.toString());
            if (res) console.log(op + ' status: ' + res.constructor.name);
        };
    }

    function createGUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

}
