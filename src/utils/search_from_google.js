/**
 * @file
 * @since 3.9.0
 */

import ApplicationState from 'store/application-state';

const { XHR } = require('utils');

let active = true;

export default async function(opts) {

  // whether can fetch data from Google Geocode API
  if (!opts || !active || undefined === ApplicationState.keys.vendorkeys.google) {
    return Promise.reject()
  }

  const response = await XHR.get({
    url:        'https://maps.googleapis.com/maps/api/geocode/json',
    params: {
      address:  opts.query, // textual search
      bounds:   [opts.extent[1], opts.extent[0], opts.extent[3], opts.extent[2]].join(','),
      language: opts.lang,
      key:      ApplicationState.keys.vendorkeys.google,
    },
  });

  // disable google provider on invalid API key
  if (response.status === 'REQUEST_DENIED') {
    active = false;
    return Promise.reject();
  }

  return {
    label: 'Google',
    results: 'OK' === response.status
      ? response.results
        .filter(({ geometry: { location } })=> ol.extent.containsXY(opts.extent, location.lng, location.lat))
        .map(result => {
          let name, city, country;
          result.address_components.forEach(({ types, long_name }) => {
            if (types.find(t => 'route' === t))          name    = long_name;
            else if (types.find( t => 'locality' === t)) city    = long_name;
            else if (types.find( t => 'country' === t))  country = long_name
          });
          return {
            lon: result.geometry.location.lng,
            lat: result.geometry.location.lat,
            address: {
              name,
              road: undefined,
              postcode: '',
              city,
              state: undefined,
              country
            },
            original: {
              formatted: result.display_name,
              details:   result.address
            }
          };
        })
      : [],
  };

}