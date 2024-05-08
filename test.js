/* ************************************************************************ */
// Events
const EventEmitter = require('events');
const evts = new EventEmitter();

let wxsvcUpReady = false;
let wxsvcFcReady = false;

const cfg = require('./cfg/wxsvc-cfg.js');
const wsvc = require(cfg.api);
wsvc.init(evts, console.log);

evts.on('WSVC_UPDATE', (m) => {
    wxsvcUpReady = true;
    //var data = Object.assign({}, m, {tstamp : Date.now()});
    console.log(`WSVC_UPDATE : ${JSON.stringify(m)}`);
});

evts.on('WSVC_FORCST', (m) => {
    wxsvcFcReady = true;
    //var data = Object.assign({}, m, {tstamp : Date.now()});
    console.log(`WSVC_FORCST : ${JSON.stringify(m)}`);
});

evts.emit('WSVC_START');

/*

WSVC_UPDATE

{
    "format": "owm-v25",
    "svc": "OpenWeatherMap",
    "iconurl": "https://openweathermap.org/img/w/",
    "sta": "60630",
    "plc": "Chicago, Illinois",
    "gmt": 1714453623000,
    "sr": 1714474045000,
    "ss": 1714524473000,
    "tstamp": 1714453755897,
    "t": 56.05,
    "h": 67,
    "wd": 290,
    "ws": 5.75,
    "tmax": 58.03,
    "tmin": 51.42,
    "desc": "overcast clouds",
    "main": "Clouds",
    "icon": "https://openweathermap.org/img/w/04n.png"
}

*/

/*
function retrieve() {
    //var data = Object.assign({}, {co: wsvc.currobsv, fc: wsvc.forecast}, {tstamp : Date.now()});
    console.log(`retrieve current  : ${JSON.stringify(wsvc.currobsv)}`);
    console.log(`retrieve forecast : ${JSON.stringify(wsvc.forecast)}`);
};

let invId = setInterval(() => {
    if(wxsvcUpReady && wxsvcFcReady) {
        retrieve();
        clearInterval(invId);
    }
}, 5000);
*/

