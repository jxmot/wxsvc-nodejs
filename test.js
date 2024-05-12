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
    console.log(`WSVC_UPDATE : ${JSON.stringify(m,null,4)}`);
});

evts.on('WSVC_FORCST', (m) => {
    wxsvcFcReady = true;
    //var data = Object.assign({}, m, {tstamp : Date.now()});
    console.log(`WSVC_FORCST : ${JSON.stringify(m,null,4)}`);
});

evts.emit('WSVC_START');

/*
function retrieve() {
    //var data = Object.assign({}, {co: wsvc.currobsv, fc: wsvc.forecast}, {tstamp : Date.now()});
    console.log(`retrieve current  : ${JSON.stringify(wsvc.currobsv,null,4)}`);
    console.log(`retrieve forecast : ${JSON.stringify(wsvc.forecast,null,4)}`);
};

let invId = setInterval(() => {
    if(wxsvcUpReady && wxsvcFcReady) {
        retrieve();
        clearInterval(invId);
    }
}, 5000);
*/

