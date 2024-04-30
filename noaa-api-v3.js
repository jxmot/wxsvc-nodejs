/*
    NOAA Service Configuration & Helper Functions

    An API for the NOAA's Weather API. See 
        https://forecast-v3.weather.gov/documentation
    for information.
*/
module.exports = (function()  {

    wxsvc = {
        currobsv: {},
        forecast: {}
    };

    const https = require('https');

    let wcfg = require('./cfg/wxsvc-noaa-cfg.js');

    const UPARTS_STATIONS     = 0;
    const UPARTS_OBSERVATIONS = UPARTS_STATIONS + 1;
    const UPARTS_CURRENT      = UPARTS_OBSERVATIONS + 1;
    const UPARTS_POINTS       = UPARTS_CURRENT + 1;
    const UPARTS_FORECAST     = UPARTS_POINTS + 1;
    const UPARTS_GRIDPOINTS   = UPARTS_FORECAST + 1;

    const HEADER_ACCJSON      = 0;
    const HEADER_ACCXML       = 1;

    const LOC_LAT             = 0;
    const LOC_LON             = 1;

    let sys_evts = {};

    let log = undefined;

    /*
    */
    wxsvc.init = function(evts, _log = undefined) {
        // will need to send events that will trigger
        // a data transfer to the clients
        sys_evts = evts;

        log = _log;

        sys_evts.on('WSVC_START', () => {
            getCurrent(wcfg.default_station);
            if(wcfg.config.updintvl !== 0) {
                setInterval(getCurrent, wcfg.config.updintvl, wcfg.default_station);
            }

            getPointMeta(wcfg.default_station);
            if(wcfg.config.forintvl !== 0) {
                setInterval(getPointMeta, wcfg.config.forintvl, wcfg.default_station);
            }
        });
    };

    /*
    */
    function getCurrent(idx) {
        let opt = {
            hostname: wcfg.service.hostname,
            method: 'GET',
            path: wcfg.urlparts[UPARTS_STATIONS] + '/' + wcfg.stations[idx].id + wcfg.urlparts[UPARTS_OBSERVATIONS] + wcfg.urlparts[UPARTS_CURRENT],
            headers: {
                'accept':wcfg.headeraccept[HEADER_ACCJSON]
                ,'user-agent':wcfg.useragent
            }
        };

        let req = https.request(opt, res => {
            let data = '';
            let origin = {sta: wcfg.stations[idx].id, plc: wcfg.stations[idx].label};

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', function(d) {
                log('getCurrent status code: ' + res.statusCode);
                if(res.statusCode === 200) {
                    parseStationCurrent(data.toString(), origin);
                } else log('getCurrent ERROR from NOAA');
            });
        });

        req.on('error', (err) => {
            log('getCurrent Error: ' + err);
        }); 
    
        // send the request
        req.end();
    };

    /*
        "temperature": {
            "value": 22.800000000000011,
            "unitCode": "unit:degC",
            "qualityControl": "qc:V"
        },

    */
    function parseStationCurrent(data, origin) {
        // console.log(data);

        let upd = {};
        let raw = JSON.parse(data);

        upd.format = 'noaa-v3';

        upd.svc = wcfg.service.name;

        upd.sta = origin.sta;
        upd.plc = origin.plc;
     
        // date/time of observation
        let d = new Date(raw.properties.timestamp);
        upd.gmt = d.getTime();

        // date/time of when data was collected
        upd.tstamp = Date.now();

        upd.t   = centToFar(raw.properties.temperature);
        upd.h   = Math.round(raw.properties.relativeHumidity.value);
        upd.wd  = Math.round(raw.properties.windDirection.value);
        upd.ws  = metsToMPH(raw.properties.windSpeed);
        upd.wg  = metsToMPH(raw.properties.windGust);
        upd.wch = centToFar(raw.properties.windChill);
        upd.txt = raw.properties.textDescription;
        upd.dew = centToFar(raw.properties.dewpoint);
        upd.hix = centToFar(raw.properties.heatIndex);
        upd.bar = paToInchesMerc(raw.properties.barometricPressure);

        // make a copy without references
        wxsvc.currobsv = JSON.parse(JSON.stringify(upd));

        sys_evts.emit('WSVC_UPDATE', wxsvc.currobsv);
    };

    /*
    */
    function getPointMeta(idx) {

        let path = wcfg.urlparts[UPARTS_POINTS] + '/';
        path = path + wcfg.stations[idx].loc[LOC_LAT] + ',' + wcfg.stations[idx].loc[LOC_LON];

        let opt = {
            hostname: wcfg.service.hostname,
            method: 'GET',
            path: path, 
            headers: {
                'accept':wcfg.headeraccept[HEADER_ACCJSON],
                'user-agent':wcfg.useragent
            }
        };

        let req = https.request(opt, res => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', function() {
                log('getPointMeta status code: ' + res.statusCode);

                if(res.statusCode === 200) {
                    let meta = JSON.parse(data.toString());
                    let grid = {
                        cwa: meta.properties.cwa,
                        gridX: meta.properties.gridX,
                        gridY: meta.properties.gridY,
                        idx: idx
                    };
                    getForecast(grid);
                } else log('getPointMeta ERROR from NOAA');
            });
        });

        req.on('error', (err) => {
            log('getPointMeta Error: ' + err);
        }); 
    
        // send the request
        req.end();
    };

    /*
    */
    function getForecast(grid) {

        let path = wcfg.urlparts[UPARTS_GRIDPOINTS] + '/';
        path = path + grid.cwa + '/';
        path = path + grid.gridX + ',' + grid.gridY;
        path = path + wcfg.urlparts[UPARTS_FORECAST];

        let opt = {
            hostname: wcfg.service.hostname,
            method: 'GET',
            path: path, 
            headers: {
                'accept':wcfg.headeraccept[HEADER_ACCJSON],
                'user-agent':wcfg.useragent
            }
        };

        let req = https.request(opt, res => {
            let data = '';
            let origin = {sta: wcfg.stations[grid.idx].id, plc: wcfg.stations[grid.idx].label};

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', function() {
                log('getForecast status code: ' + res.statusCode);
                if(res.statusCode === 200) {
                    parseForecast(data.toString(), origin);
                } else log('getForecast ERROR from NOAA');
            });
        });

        req.on('error', (err) => {
            log('getForecast Error: ' + err);
        }); 
    
        // send the request
        req.end();
    };

    /*

        | DAY 1 | DAY 2 | DAY 3 |       <- "slots" 0,2,4
        +-------+-------+-------+
        |NIGHT 1|NIGHT 2|NIGHT 3|       <- "slots" 1,3,5


        |       | DAY 2 | DAY 3 |
        +-------+-------+-------+
        |NIGHT 1|NIGHT 2|NIGHT 3|       <- if first period is "night"
                                           then put it in slot 1

        fcast = {
            sta: ,
            plc: ,
            svc: ,
            per: [],
            gmt: ,
            tstamp: 
        }

        per = {
            slot: ,
            name: ,
            icon: ,
            alt: ,
            text: 
        }

    */
    function parseForecast(data, origin) {

        let fcast = {};
        let per = {};

        let raw = JSON.parse(data);

        if(raw.properties.updated === undefined) {
            log('parseForecast Error: ' + JSON.stringify(raw));
            log('parseForecast resending last forecast');
            sys_evts.emit('WSVC_FORCST', wxsvc.forecast);
        } else {
            fcast.format = 'noaa-v3';

            // the data provider
            fcast.svc = wcfg.service.name;
            // station code & named location
            fcast.sta = origin.sta;
            fcast.plc = origin.plc;

            // date/time of observation
            let d = new Date(raw.properties.updated);
            fcast.gmt = d.getTime();
            // date/time of when data was collected
            fcast.tstamp = Date.now();
    
            let nextslot = 0;
            let end = 5;
            fcast.per = [];
    
            for(ix = 0;ix <= end; ix++) {
                if(ix === 0) {
                    let tmp = raw.properties.periods[ix].name.toLowerCase();
                    if(tmp.includes('night')) {
                        nextslot = 1;
                        end -= 1;
                    }
                    else nextslot = 0;
                }
    
                per.slot = nextslot;
                per.name = raw.properties.periods[ix].name;
                per.icon = raw.properties.periods[ix].icon;
                per.alt  = raw.properties.periods[ix].shortForecast;
                per.text = raw.properties.periods[ix].detailedForecast;
                fcast.per.push(JSON.parse(JSON.stringify(per)));
                per = {};
                nextslot += 1;
            }
    
            // break the reference and notify...
            wxsvc.forecast = JSON.parse(JSON.stringify(fcast));
            sys_evts.emit('WSVC_FORCST', wxsvc.forecast);
        }
    };

    /*
    */
    function centToFar(rawtemp) {
        var tempRet = -999.999;

        if(rawtemp.value !== null) {
            // http://codes.wmo.int/common/unit
            if(rawtemp.unitCode === 'unit:degC') 
                tempRet = Math.round(rawtemp.value * 9 / 5 + 32);
            else 
                tempRet = Math.round(rawtemp.value);
        }
        return tempRet;
    }

    /*
    */
    function metsToMPH(rawwind) {
        var windRet = -999.999;

        if(rawwind.value !== null) {
            if(rawwind.unitCode === 'unit:m_s-1')
                windRet = Math.round(rawwind.value / 0.44704);
            else
                windRet = Math.round(rawwind.value);
        }
        return windRet;
    };

    /*
    */
    function paToInchesMerc(rawpa) {
        let mercRet = -999.999

        if(rawpa.value !== null) {
            if(rawpa.unitCode === 'unit:pa')
                mercRet = Math.round(rawpa.value * 0.0002952998);
            else
                mercRet = Math.round(rawpa.value);
        }
        return mercRet;
    };

    return wxsvc;
})();
