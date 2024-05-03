/*
    WX Service Configuration

    https://openweathermap.org/api
*/
let key = require('./_openwm-key.js');

module.exports = {
    location: { 
        loc: [41.9691,-87.7507],// neighborhood
        zip: '60630',
        city: 'Chicago',
        code: '4887398',        // chicago
        state: 'Illinois',
        staid: 'KORD',          // O'Hare
        country: {
            fullname: 'United States of America', 
            alphacode: ['US', 'USA'], 
            numcode: 840
        },
        timezone:'America/Chicago'
    },

/*
    stations: [
        {id: 'KORD',loc: [41.9797,-87.9044],label: 'Chicago-O\'Hare International Airport'},
        {id: 'KMDW',loc: [41.7842,-87.7553],label: 'Chicago Midway Airport'},
        {id: 'KPWK',loc: [42.1208,-87.9047],label: 'Wheeling, Pal-Waukee Airport'},
        {id: 'KDPA',loc: [41.8964,-88.2511],label: 'West Chicago, Dupage Airport'},
        {id: 'KLOT',loc: [41.6031,-88.1016],label: 'Lewis University Airport'},
        {id: 'KUGN',loc: [42.4255,-87.8634],label: 'Waukegan Regional Airport'},
        {id: 'KARR',loc: [41.7713,-88.4815],label: 'Aurora Municipal Airport'},
        {id: 'KJOT',loc: [41.5176,-88.1790],label: 'Joliet Regional Airport'},
        {id: 'KENW',loc: [42.5950,-87.9381],label: 'Kenosha, Kenosha Regional Airport'},
        {id: 'KDKB',loc: [41.9338,-88.7066],label: 'De Kalb Taylor Municipal Airport'},
        {id: 'KIKK',loc: [41.0687,-87.8537],label: 'Greater Kankakee Airport'}
    ],

    default_station: 0,
*/
    service: {
        name: 'OpenWeatherMap',
        appid: key.data,
        hostname: 'api.openweathermap.org',
        docurl: 'https://openweathermap.org/api',
        iconurl: 'https://openweathermap.org/img/w/',
        datamode: 'json'
    },

    config: {
        // 1 hour = 3600000
        updintvl: 3600000 * 1.5,
        // add 5min to stagger API calls
        forintvl: (3600000 * 1.5) + 300000,
        // 
        getcurr: true,
        // 
        getfcast: false
    },

    urlparts : [
        '/data/2.5',
        '/weather',
        '/forecast',
//'/find',
        '?lat=',
        '&lon=',
//'&cnt=',
        '?zip=',
        '?id=',
        '&units=imperial',
        '&mode=',
        '&appid='
    ],

    useragent: 'Generic Node App',
};

