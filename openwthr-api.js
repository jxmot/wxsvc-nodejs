/*
    Interface to the Open Weather Map API


        https://openweathermap.org/current

        https://openweathermap.org/forecast5


    All APIs : 
        https://openweathermap.org/api

    Icons:
        https://openweathermap.org/weather-conditions
*/
module.exports = (function()  {

    wxsvc = {
        currobsv: {},
        forecast: {}
    };

    const https = require('https');

    let wcfg = require('./cfg/wxsvc-openwm-cfg.js');

    const UPARTS_PATHBASE = 0;
    const UPARTS_WEATHER  = UPARTS_PATHBASE + 1;
    const UPARTS_FORECAST = UPARTS_WEATHER + 1;
    const UPARTS_LAT      = UPARTS_FORECAST + 1;
    const UPARTS_LON      = UPARTS_LAT + 1;
    const UPARTS_ZIP      = UPARTS_LON + 1;
    const UPARTS_ID       = UPARTS_ZIP + 1;
    const UPARTS_UNITS    = UPARTS_ID + 1;
    const UPARTS_MODE     = UPARTS_UNITS + 1;
    const UPARTS_APPID    = UPARTS_MODE + 1;

    const LOC_LAT         = 0;
    const LOC_LON         = 1;

    let sys_evts = {};

    let log = undefined;
    let dummyLog = () => {
    };
    
    /*
    */
    wxsvc.init = function(evts, _log = dummyLog) {
        // will need to send events that will trigger
        // a data transfer to the clients
        sys_evts = evts;

        log = _log;

        sys_evts.on('WSVC_START', () => {
            if(wcfg.config.getcurr) {
                getCurrent(wcfg.location);
                if(wcfg.config.updintvl !== 0) {
                    setInterval(getCurrent, wcfg.config.updintvl, wcfg.location);
                }
            }

            if(wcfg.config.getfcast) {
                getForecast(wcfg.location);
                if(wcfg.config.forintvl !== 0) {
                    setInterval(getForecast, wcfg.config.forintvl, wcfg.location);
                }
            }
        });
    };

    /*
    */
    function getCurrent(location) {

        let path = wcfg.urlparts[UPARTS_PATHBASE] + wcfg.urlparts[UPARTS_WEATHER];
        path = path + wcfg.urlparts[UPARTS_ID] + location.code;
        path = path + wcfg.urlparts[UPARTS_UNITS];
        path = path + wcfg.urlparts[UPARTS_MODE] + wcfg.service.datamode;
        path = path + wcfg.urlparts[UPARTS_APPID];
        path = path + wcfg.service.appid;

        let opt = {
            hostname: wcfg.service.hostname,
            method: 'GET',
            path: path,
            headers: {
                'user-agent':wcfg.useragent
            }
        };

        let req = https.request(opt, res => {
            let data = '';
            let origin = {sta: wcfg.location.zip, plc: wcfg.location.city+', '+wcfg.location.state};

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', function(d) {
                log('getCurrent status code: ' + res.statusCode);
                if(res.statusCode === 200) {
                    parseStationCurrent(data.toString(), origin);
                } else log('getCurrent ERROR from '+wcfg.service.name);
            });
        });

        req.on('error', (err) => {
            log('getCurrent Error: ' + err);
        }); 
    
        // send the request
        req.end();
    };

    /*
    */
    function parseStationCurrent(data, origin) {
        // console.log(data);

        let upd = {};
        let raw = JSON.parse(data);

        upd.format = 'owm';

        upd.svc = wcfg.service.name;
        // url for retrieving icons
        upd.iconurl = wcfg.service.iconurl;

        upd.sta = origin.sta;
        upd.plc = origin.plc;
        
        // date/time of observation
        // NOTE : openwm time in forecast is UTC!
        let d = new Date(0);
        d.setUTCSeconds(raw.dt);
        upd.gmt = d.getTime();

        // sunrise & sunset times
        d = new Date(0);
        d.setUTCSeconds(raw.sys.sunrise);
        upd.sr  = d.getTime();
        
        d = new Date(0);
        d.setUTCSeconds(raw.sys.sunset);
        upd.ss  = d.getTime();

        // date/time of when data was collected
        upd.tstamp = Date.now();

        upd.temp = raw.main.temp;
        upd.humd = raw.main.humidity;
        upd.tfl  = raw.main.feels_like; // added
        upd.wd   = raw.wind.deg;
        upd.ws   = raw.wind.speed;
        upd.tmax = raw.main.temp_max;
        upd.tmin = raw.main.temp_min;

        upd.desc = raw.weather[0].description;
        upd.main = raw.weather[0].main;
        upd.id   = raw.weather[0].id; // added
        upd.icon = raw.weather[0].icon; // changed
        upd.iconurl = wcfg.service.iconurl + raw.weather[0].icon +'.png'; // renamed

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
    
        let sr = new Date(wxdata.sr);
        wxsvc.currobsv.text.sunup = sr.getHours() + ':' + (sr.getMinutes() < 10 ? '0' : '') + sr.getMinutes();;
    
        let ss = new Date(wxdata.ss);
        wxsvc.currobsv.text.sundn = ss.getHours() + ':' + (ss.getMinutes() < 10 ? '0' : '') + ss.getMinutes();
    
        wxsvc.currobsv.text.feel = Math.round(wxdata.tfl) + '°F';
        wxsvc.currobsv.text.temp = Math.round(wxdata.temp) + '°F';
        wxsvc.currobsv.text.humd = Math.round(wxdata.humd) + '%';
    
        wxsvc.currobsv.text.thi  = Math.round(wxdata.tmax) + '°F';
        wxsvc.currobsv.text.tlo  = Math.round(wxdata.tmin) + '°F';
    
        wxsvc.currobsv.text.wspd = Math.round(wxdata.ws) + ' MPH'
        wxsvc.currobsv.text.wdir = degToCard(wxdata.wd);
        wxsvc.currobsv.text.wmsg = 'Winds are '+wxsvc.currobsv.text.wspd+' from the '+wxsvc.currobsv.text.wdir;
    };

    /*
    */
    function getForecast(loc) {

        let path = wcfg.urlparts[UPARTS_PATHBASE] + wcfg.urlparts[UPARTS_FORECAST];

        path = path + wcfg.urlparts[UPARTS_ID] + wcfg.location.code;
        path = path + wcfg.urlparts[UPARTS_UNITS];
        path = path + wcfg.urlparts[UPARTS_MODE] + wcfg.service.datamode;
        path = path + wcfg.urlparts[UPARTS_APPID];
        path = path + wcfg.service.appid;

        let opt = {
            hostname: wcfg.service.hostname,
            method: 'GET',
            path: path,
            headers: {
                'user-agent':wcfg.useragent
            }
        };

        let req = https.request(opt, res => {
            let data = '';
            let origin = {sta: wcfg.location.zip, plc: wcfg.location.city+', '+wcfg.location.state};

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', function() {
                log('getForecast status code: ' + res.statusCode);
                if(res.statusCode === 200) {
                    parseForecast(data.toString(), origin);
                } else log('getForecast ERROR from OWM');
            });
        });

        req.on('error', (err) => {
            log('getForecast Error: ' + err);
        }); 
    
        // send the request
        req.end();
    };

    /*
    */
    function parseForecast(data, origin) {

        let fcast = {};
        let per = {};

        let raw = JSON.parse(data);

        fcast.format = 'owm-v25';

        // the data provider
        fcast.svc = wcfg.service.name;
        // url for retrieving icons
        fcast.iconurl = wcfg.service.iconurl;
        // station code & named location
        fcast.sta = origin.sta;
        fcast.plc = origin.plc;
/*
    forecast timeslots in UTC for a single day are - 
    00:00 
    03:00
    06:00
    09:00
    12:00
    15:00
    18:00
    21:00
    
    first forecast in array should be the next timeslot, for
    example : if the current time is 14:21 the first timeslot
    in the list array will/should be 15:00
    
    there can be up to 40 timeslots : 
         5 days(24hr periods) X 8 slots/day(3hr slots)
    
    the number of timeslots can vary, it depends on what the
    current timeslot is when the data was requested
    
    the virtual index(currently not used) will be a value from
    0 to 7. it indicates where to place the real-index of 0. use 
    it as an offset to the real-index.
    virtual timeslot index = round((epoch_now - epoch_last_midnght) / (3 * 3600))
    
    stopix = 3(24hr periods) X 8(timeslots)
    for(fcix = 0; fcix < stopix; fcix++)
    
    NOTE : openwm time in forecast is UTC!
    let d = new Date(0);
    d.setUTCSeconds(data.list[fcix].dt);
    fcast.gmt = d.getTime();

        fcast = {
            sta: ,
            plc: ,
            svc: ,
            cnt: ,
            per: [],
            tstamp: 
        }

        per = {
            slot: , // currently unused
            dt: ,
            icon: ,
            t: ,
            h: ,
            tmin: ,
            tmax: ,
            ws: ,
            wd: ,
            main: ,
            desc: 
        }
*/
        // date/time of when data was collected
        fcast.gmt = fcast.tstamp = Date.now();

        // qty of time slots  cnt = 3(24hr periods) X 8(timeslots)
        fcast.cnt = 24;

        fcast.per = [];

        for(let ix = 0;ix < fcast.cnt; ix++) {
            // date/time of forecast
            // NOTE : openwm time in forecast is UTC!
            let d = new Date(0);
            d.setUTCSeconds(raw.list[ix].dt);
            per.dt   = d.getTime();
            per.icon = wcfg.service.iconurl + raw.list[ix].weather[0].icon +'.png';
            per.t    = raw.list[ix].main.temp;
            per.h    = raw.list[ix].main.humidity;
            per.tmin = raw.list[ix].main.temp_min;
            per.tmax = raw.list[ix].main.temp_max;
            per.ws   = raw.list[ix].wind.speed;
            per.wd   = raw.list[ix].wind.deg;
            // weather[] can have more than just one 
            // entry. not sure yet how to combine them 
            // into usable data because the docs don't 
            // have enough info and the occurrence is rare.
            per.main = raw.list[ix].weather[0].main;
            per.desc = raw.list[ix].weather[0].description;

            fcast.per.push(JSON.parse(JSON.stringify(per)));
            per = {};
        }
        // break the reference and notify...
        wxsvc.forecast = JSON.parse(JSON.stringify(fcast));
        sys_evts.emit('WSVC_FORCST', wxsvc.forecast);
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
