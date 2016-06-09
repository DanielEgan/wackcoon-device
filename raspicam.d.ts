declare module 'raspicam' {
    class RaspiCam {
        constructor(options: RaspiCam.RaspiCamOptions);
        foo: string;
        on(event: string, callback: (err?:Error, timestamp?:any, file?:any) => void);
        start():void;
        stop():void;
    }
    namespace RaspiCam {

        interface RaspiCamOptions {
            mode: string,
            timelapse: number,
            timeout: number,
            rotation: number,
            preview: string,
            output: string
        }
    }

    export = RaspiCam;
}


// declare var RaspiCam: RaspiCam;

// export = RaspiCam;