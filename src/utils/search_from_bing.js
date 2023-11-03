/**
 * @file
 * @since 3.9.0
 */

import ApplicationState from 'store/application-state';

const { XHR, uniqueId } = require('utils');

let active = true;

/**
 * @example https://dev.virtualearth.net/REST/v1/LocalSearch/?query={query}&userMapView={lat,lon,lat,lon}&key={BingMapsKey}
 * 
 * @see https://learn.microsoft.com/en-us/bingmaps/rest-services/locations/local-search
 */
export default async function(opts) {

  // whether can fetch data from Bing Local Search API
  if (!opts || !active || undefined === ApplicationState.keys.vendorkeys.bing) {
    return Promise.reject();
  }

  const response = await XHR.get({
    url:           'https://dev.virtualearth.net/REST/v1/LocalSearch/',
    params: {
      query:       opts.query,  // textual search
      userMapView: [opts.extent[1], opts.extent[0], opts.extent[3], opts.extent[2]].join(','),
      key:         ApplicationState.keys.vendorkeys.bing,
    },
  });

  // disable bing provider on invalid API key
  // if (response.status === 'REQUEST_DENIED') { 
  //   active = false;
  //   return Promise.reject();
  // }

  return {
    provider: 'bing',
    label: 'Bing Places',
    results: 200 === response.statusCode
      ? response.resourceSets[0].resources
        .filter(({ point: { coordinates } })=> ol.extent.containsXY(opts.extent, coordinates[1], coordinates[0]))
        .map(result => {
          return {
            // __uid:       uniqueId(), //set unique id //@TODO check if has a unique idendifier
            lon:         result.point.coordinates[1],
            lat:         result.point.coordinates[0],
            type:        result.entityType,
            name:        result.name,
            address: {
              road:      result.Address.addressLine,
              postcode:  result.Address.postalCode,
              city:      result.Address.locality,
              state:     result.Address.adminDistrict,
              country:   result.Address.countryRegion,
              formatted: result.Address.formattedAddress,
            },
            raw:         result,
          };
        })
      : [],
  };
}