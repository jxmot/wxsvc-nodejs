/*
    WX Service Configuration
*/
module.exports = {
    location: { 
        loc: [41.9691,-87.7507],
        zip: '60630'
    },

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

    service: {
        name: 'NOAA',
        hostname: 'api.weather.gov',
        docurl: 'https://www.weather.gov/documentation/services-web-api',
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
        '/stations',
        '/observations',
        '/latest',
        '/points',
        '/forecast',
        '/gridpoints'
    ],

    // XML or JSON can be selected for the format of the returned data by 
    // changing the 'accept' field in the header :
    // 
    // For XML:
    // Accept: application/vnd.noaa.obs+xml
    // 
    // GeoJSON is the default, use either no accept or :
    // Accept: application/geo+json
    headeraccept: ['application/geo+json', 'application/vnd.noaa.obs+xml'],

    useragent: 'Generic Node App',
};

