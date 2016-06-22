import * as path from 'path';
import * as fs from 'fs';
var resemble = require('node-resemble-js');
import * as moment from 'moment';
// import * as gpio from 'pi-gpio';
import { store } from './store';

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
// gpio.open(4, "input", function (err) {
//     let lastValue = null;
//     setInterval(() => { gpio.read(4, function (err, value) {
//         if (lastValue === 0 && value === 1) {
//             imageEvents.push(Date.now());
//             console.log('detected motion');
//         }
//     })}, 200);
// });

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
            let filepath = path.join(imagesRoot, file);
            if (/^\d+\.png$/.test(file)) {
                let birthtime = fs.statSync(filepath).birthtime;
                let match = false;
                imageEvents.forEach(e => {
                    let reverse = moment(e).subtract(REVERSE_BUFFER, 'seconds');
                    let forward = moment(e).add(FORWARD_BUFFER, 'seconds');
                    if (moment(birthtime).isBetween(reverse, forward, null, '[]'))
                        match = true;
                })
                let expired = moment(birthtime).isBefore(moment(Date.now()).subtract(REVERSE_BUFFER, 'seconds'));
                if (match) {
                    store.cog(filepath, result => {
                        result.tags.forEach(t => {
                            console.log(t.name);
                            console.log(t.confidence);

                            // if confident, upload to blob storage
                            store.save(filepath, result => {

                            });

                        });

                        // store.sendToHub()

                    });

                }
                else if (match || expired)
                    fs.unlinkSync(filepath);
            };
        });
    });
}