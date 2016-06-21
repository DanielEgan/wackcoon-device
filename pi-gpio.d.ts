declare module 'pi-gpio' {
    export function open(pin:number, direction:string, callback:(err) => void)
    export function read(pin:number, callback:(err:Error, value:number) => void)
}