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
        docurl: 'https://forecast-v3.weather.gov/documentation',
    },

    config: {
        // 1 hour = 3600000
        updintvl: 3600000 * 1.5,
        // add 5min to stagger API calls
        forintvl: (3600000 * 1.5) + 300000
    },

    urlparts : [
        '/stations',
        '/observations',
        '/current',
        '/points',
        '/forecast',
        '/gridpoints'
    ],

    // XML or JSON can be selected for the format of the returned data by 
    // changing thr 'accept' field in the header :
    // 
    // For XML:
    // Accept: application/vnd.noaa.obs+xml
    // 
    // GeoJSON is the default, use either no accept or :
    // Accept: application/geo+json
    headeraccept: ['application/geo+json', 'application/vnd.noaa.obs+xml'],

    useragent: 'SensorNet Node App',

    // The result is a somewhat large chunk of data with a lot of stuff 
    // that isn't of any current interest. So we're showing only the 
    // fields that matter(JSON)...
    // 
    // 'properties': {
    //      'textDescription': 'Partly Cloudy',
    //      'temperature': {'value': 26.700000000000045, 'unitCode': 'unit:degC'},
    //      'windGust': {'value': null, 'unitCode': 'unit:m_s-1'}
    // }
    // 
    // The XML formatted data is a bit nicer. It's because some of the data 
    // is already formatted and textualized for display. For example :
    //
    //  <weather>Partly Cloudy</weather>
    //  <wind_string>E at 8.1 MPH (7 KT)</wind_string>
    // 
    // And both temperature scales are provided :
    // 
    //  <temp_f>73.9</temp_f>
    //  <temp_c>23.3</temp_c>
    //  <temperature_string>73.9 F (23.3 C)</temperature_string>

    // https://api.weather.gov/stations/KORD/observations/current
    // service.apiurl + urlparts[0] + stations[0].id + urlparts[1] + urlparts[2]
    //
    obsvfields: [
        'temperature',
        'relativeHumidity',
        'dewpoint',
        'windChill',
        'heatIndex',

        'windDirection',
        'windSpeed',
        'windGust',

        'barometricPressure',
        'visibility'
    ]
};

