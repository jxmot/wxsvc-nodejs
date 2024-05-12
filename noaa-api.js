/*
    NOAA Service Configuration & Helper Functions

    An API for the NOAA's Weather API. See 
        https://www.weather.gov/documentation/services-web-api
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
            if(wcfg.config.getcurr) {
                getCurrent(wcfg.default_station);
                if(wcfg.config.updintvl !== 0) {
                    setInterval(getCurrent, wcfg.config.updintvl, wcfg.default_station);
                }
            }

            if(wcfg.config.getfcast) {
                getPointMeta(wcfg.default_station);
                if(wcfg.config.forintvl !== 0) {
                    setInterval(getPointMeta, wcfg.config.forintvl, wcfg.default_station);
                }
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

        upd.format = 'noaa';

        upd.svc = wcfg.service.name;
        //// url for retrieving icons
        //upd.iconurl = raw.properties.icon;
        
        upd.sta = origin.sta;
        upd.plc = origin.plc;
     
        // date/time of observation
        let d = new Date(raw.properties.timestamp);
        upd.gmt = d.getTime();

        upd.sr  = null;
        upd.ss  = null;

        // date/time of when data was collected
        upd.tstamp = Date.now();

        upd.temp = centToFar(raw.properties.temperature);
        upd.humd = Math.round(raw.properties.relativeHumidity.value);
        upd.tfl  = null;

        upd.wd  = Math.round(raw.properties.windDirection.value);
        upd.ws  = kphToMPH(raw.properties.windSpeed);

        upd.tmax = null;
        upd.tmin = null;

        upd.desc = raw.properties.textDescription;
        upd.main = null;
        upd.id   = null;
        upd.icon = null;
        upd.iconurl = raw.properties.icon;

        upd.wg  = kphToMPH(raw.properties.windGust);
        upd.wch = centToFar(raw.properties.windChill);
        upd.dew = centToFar(raw.properties.dewpoint);
        upd.hix = centToFar(raw.properties.heatIndex);
        upd.bar = paToInchesMerc(raw.properties.barometricPressure);

        // make a copy without references
        wxsvc.currobsv = JSON.parse(JSON.stringify(upd));
        updateObsvText(wxsvc.currobsv);
        sys_evts.emit('WSVC_UPDATE', wxsvc.currobsv);
    };

    /*
    */
    function updateObsvText(wxdata) {
        let obsdate = new Date(wxdata.gmt);
        let gmt = obsdate.toLocaleString('en-US', {timeZone:wcfg.location.timezone, hour12:false});
        gmt = gmt.replace(' ', '');
        let ob = gmt.split(',');
        let time = ob[1].split(':');
        wxsvc.currobsv.text = {};
        wxsvc.currobsv.text.tstamp = ob[0] + ' @ ' + time[0] + ':' + time[1];
    
        wxsvc.currobsv.text.sunup = null;
        wxsvc.currobsv.text.sundn = null;
    
        wxsvc.currobsv.text.feel = null;
        wxsvc.currobsv.text.temp = Math.round(wxdata.temp) + '°F';
        wxsvc.currobsv.text.humd = Math.round(wxdata.humd) + '%';
    
        wxsvc.currobsv.text.thi  = null;
        wxsvc.currobsv.text.tlo  = null;
    
        wxsvc.currobsv.text.wspd = Math.round(wxdata.ws) + ' MPH'
        wxsvc.currobsv.text.wdir = degToCard(wxdata.wd);
        wxsvc.currobsv.text.wmsg = 'Winds are '+wxsvc.currobsv.text.wspd+' from the '+wxsvc.currobsv.text.wdir;
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
            fcast.format = 'noaa';

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
            if(rawtemp.unitCode === 'wmoUnit:degC') 
                tempRet = Math.round(rawtemp.value * 9 / 5 + 32);
            else 
                tempRet = Math.round(rawtemp.value);
        }
        return tempRet;
    }

    /*
    */
    function kphToMPH(rawwind) {
        var windRet = -999.999;

        if(rawwind.value !== null) {
            if(rawwind.unitCode === 'wmoUnit:km_h-1')
                windRet = Math.round(rawwind.value / 1.609344);
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
            if(rawpa.unitCode === 'wmoUnit:Pa')
                mercRet = Math.round(rawpa.value * 0.0002952998);
            else
                mercRet = Math.round(rawpa.value);
        }
        return mercRet;
    };

    /*
        Cardinal        Degree 
        Direction 	    Direction
        N               348.75 -  11.25
        NNE              11.25 -  33.75
        NE               33.75 -  56.25
        ENE              56.25 -  78.75
        E                78.75 - 101.25
        ESE             101.25 - 123.75
        SE              123.75 - 146.25
        SSE             146.25 - 168.75
        S               168.75 - 191.25
        SSW             191.25 - 213.75
        SW              213.75 - 236.25
        WSW             236.25 - 258.75
        W               258.75 - 281.25
        WNW             281.25 - 303.75
        NW              303.75 - 326.25
        NNW             326.25 - 348.75
    */
    const wind_dir = [
        {card:'North', from: 348.75, to:  11.25},
        {card:'NNE',   from:  11.25, to:  33.75},
        {card:'NE',    from:  33.75, to:  56.25},
        {card:'ENE',   from:  56.25, to:  78.75},
        {card:'East',  from:  78.75, to: 101.25},
        {card:'ESE',   from: 101.25, to: 123.75},
        {card:'SE',    from: 123.75, to: 146.25},
        {card:'SSE',   from: 146.25, to: 168.75},
        {card:'South', from: 168.75, to: 191.25},
        {card:'SSW',   from: 191.25, to: 213.75},
        {card:'SW',    from: 213.75, to: 236.25},
        {card:'WSW',   from: 236.25, to: 258.75},
        {card:'West',  from: 258.75, to: 281.25},
        {card:'WNW',   from: 281.25, to: 303.75},
        {card:'NW',    from: 303.75, to: 326.25},
        {card:'NNW',   from: 326.25, to: 348.75}
    ];
    
    function degToCard(deg) {
    let card = '?';
        // North is a special case, because it can be > 348.75
        // or < 11.25. 
        if((deg >= wind_dir[0].from) || (deg <= wind_dir[0].to))
            card = wind_dir[0].card;
        else {
            for(ix = 1; ix < wind_dir.length; ix++) {
                if((deg >= wind_dir[ix].from) && (deg <= wind_dir[ix].to)) {
                    card = wind_dir[ix].card;
                    break;
                }
            }
        }
        return card;
    };

    return wxsvc;
})();
