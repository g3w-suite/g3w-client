/**
 * @file
 * @since 3.9.0
 */

const { XHR } = require('utils');

export default async function(opts) {

  if (!opts) {
    return Promise.reject();
  }

  return {
    provider: 'nominatim',
    label: 'Nominatim (OSM)',
    results:
      (
        await XHR.get({
          url:              'https://nominatim.openstreetmap.org/search',
          params: {
            q:              opts.query, // textual search
            format:         'json',
            addressdetails: 1,
            limit:          opts.limit || 10,
            viewbox:        opts.extent.join(','),
            bounded:        1,
          }
        })
      )
      .filter(place => ol.extent.containsXY(opts.extent, place.lon, place.lat))
      .map(result => ({
          lon:  result.lon,
          lat:  result.lat,
          name: result.name,
          type: result.type,
          address: {
            name:      result.address.neighbourhood || '',
            road:      result.address.road          || '',
            city:      result.address.city          || result.address.town,
            postcode:  result.address.postcode,
            state:     result.address.state,
            country:   result.address.country
          },
          original: {
            formatted: result.display_name,
            details:   result.address
          }
        })
      ),
  };

}