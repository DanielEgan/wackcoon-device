import * as path from 'path';
import * as fs from 'fs';
var resemble = require('node-resemble-js');
import * as moment from 'moment'
import { store } from './store';
var spawn = require("child_process").spawn;

let REVERSE_BUFFER = 60;
let FORWARD_BUFFER = 120;
let DIFFERENCE_THRESHOLD = 1; //percent
let recordingStart = null;
let recordingTimer;

let imagesRoot = path.join('../', 'wackcoon-camera');

let imageEvents: any[] = [];

//start with a clean folder
fs.readdir(imagesRoot, (err, files) => {
    files.forEach(file => {
        if (/^[\d_]+\.png$/.test(file)) {
            console.log('deleting ' + path.join(imagesRoot, file));
            fs.unlinkSync(path.join(imagesRoot, file));
        }
    })
});

//TRIGGER 1: MOTION SENSOR
// when the IR sensor goes high
// cachedValue is used to debounce the signal
/*let pin = 7;
gpio.open(pin, "input", function (err) {
    let lastValue = null;
    setInterval(() => { gpio.read(pin, (err, value) => {
        if (lastValue === 0 && value === 1) {
            imageEvents.push(Date.now());
            console.log('detected motion');
        }
    })}, 200);
});*/

//TRIGGER 2: IMAGE DIFF
//watch the images folder (up one from -device) for new images to land
let last_file;
fs.watch(imagesRoot, (event, filename) => {
    if (event === 'rename' && /^[\d_]+\.png$/.test(filename) && fs.existsSync(path.join(imagesRoot, filename))) {
        let mismatch;
        let this_file = fs.readFileSync(path.join(imagesRoot, filename));
        
        if (last_file) {
            console.log('comparing');
            resemble(this_file).compareTo(last_file)
                .onComplete(function (data) {
                    console.log('here');
                    
                    // console.log('mismatch: ' + data.misMatchPercentage);
                    if (parseFloat(data.misMatchPercentage) > DIFFERENCE_THRESHOLD)
                        imageEvents.push(Date.now());
                });
            //consider sending diff information to iothub here
        }
        last_file = this_file;
    }
});

setInterval(processFiles, 4000);

function processFiles() {
    fs.readdir(imagesRoot, (err, files) => {
        files.forEach(file => {
            let filepath = path.join(imagesRoot, file);
            if (/^\d+\.png$/.test(file)) {
                console.log('processing ' + file);

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
                    console.log('cogging ' + file);

                    store.cog(filepath, result => {
                        console.log(result);
                        console.log('sending to hub');

                        store.sendToHub(result)



                        result.tags.forEach(t => {
                            console.log(t.name);
                            console.log(t.confidence);


                            if (t.name == 'raccoon') {
                                var process = spawn('python', ["turnon.py"]);
                                setTimeout(() => { var process = spawn('python', ["turnon.py"]); }, 5000);
                                console.log('WE FOUND A RACCOON!!!');
                                console.log('WE FOUND A RACCOON!!!');
                                console.log('WE FOUND A RACCOON!!!');
                                console.log('WE FOUND A RACCOON!!!');
                                console.log('WE FOUND A RACCOON!!!');
                                console.log('SHOOT IT WITH WATER!!!');
                                console.log('                   __        .-.');
                                console.log('               .-"` .` .    |\\| ');
                                console.log('       _(\-/)_" ,  .   ,\  /\\\/ ');
                                console.log('      {(#b^d#)} .   ./,  |/\\\/  ');
                                console.log('      `-.(Y).-`  ,  |  , |\.-`   ');
                                console.log('           /~/,_/~~~\,__.-`         ');
                                console.log('          ////~    // ~\\');
                                console.log('         ==`==`   ==`   ==  ');


                            }


                            /*                            // if confident, upload to blob storage
                                                        store.save(filepath, result => {
                            
                                                        });*/

                        });


                    });

                }
                if (match || expired)
                    fs.unlinkSync(filepath);
            };
        });
    });
}
