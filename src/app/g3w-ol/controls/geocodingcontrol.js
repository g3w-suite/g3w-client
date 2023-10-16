/**
 * @file need some inspiration for other geocoding providers? 👉 https://github.com/Dominique92/ol-geocoder
 */

import ApplicationState           from 'store/application-state';
import GUI                        from 'services/gui';
import MapControlGeocoding        from 'components/MapControlGeocoding.vue';
import MapControlNominatimResults from 'components/MapControlNominatimResults.vue';

console.assert(undefined !== MapControlGeocoding);
console.assert(undefined !== MapControlNominatimResults);

const Control                     = require('./control');
const { toRawType, XHR }          = require('core/utils/utils');
const Projections                 = require('g3w-ol/projection/projections');

/**
 * Helper CSS classes for control elements 
 * 
 * @type { Object<string, string> }
 */
const cssClasses = {
  namespace:           "ol-geocoder",
  spin:                "gcd-pseudo-rotate",
  hidden:              "gcd-hidden",
  inputQueryId:        "gcd-input-query",
  inputResetId:        "gcd-input-reset",
  country:             "gcd-country",
  city:                "gcd-city",
  road:                "gcd-road",
  olControl:           "ol-control",
  inputTextContainer:  "gcd-txt-container",
  inputTextControl:    "gcd-txt-control",
  inputTextInput:      "gcd-txt-input",
  inputTextReset:      "gcd-txt-reset",
  inputTextResult:     "gcd-txt-result"
};

/////////////////////////////////////////////////////////////////////////////////////////
// Geocoding Control
/////////////////////////////////////////////////////////////////////////////////////////

/**
 * Geocoding class
 * 
 * @param { Object } options
 * @param options.placeholder
 * @param options.noresults
 * @param options.notresponseserver
 * @param options.limit
 * @param options.bbox
 * @param options.mapCrs
 * 
 * @constructor
 */
function GeocodingControl(options = {}) {

  const project = GUI.getService('map').getProject();

  /**
   * @TODO use a single Object.assing() for setting default options
   * 
   * Geocoding options
   */
  this.options = {
    provider:              'osm',
    placeholder:           (undefined !== options.placeholder       ? options.placeholder       : "mapcontrols.nominatim.placeholder")        || 'Città, indirizzo ... ',
    noresults:             (undefined !== options.noresults         ? options.noresults         : "mapcontrols.nominatim.noresults")          || 'Nessun risultato ',
    notresponseserver:     (undefined !== options.notresponseserver ? options.notresponseserver : "mapcontrols.nominatim.notresponseserver")  || 'Il server non risponde',
    lang:                  ApplicationState.language || 'it-IT',
    limit:                 options.limit             || 5,
    keepOpen:              true,
    preventDefault:        false,
    autoComplete:          false,
    autoCompleteMinLength: 4,
    debug:                 false,
    viewbox:               undefined !== options.bbox              ? options.bbox              : project.state.initextent || project.state.extent,
    bounded:               1,
    mapCrs:                undefined !== options.mapCrs            ? options.mapCrs            : project.state.crs.epsg,
    fontIcon:              GUI.getFontClass('search')
  };

  /**
   * Geocoding Providers
   * 
   * @type { Object }
   */
  GeocodingControl.providers = {

    
    nominatim: {

      active: true, // whether to activate Nominatim Geocoding Provider
    
      async fetch(opts) {
        return {
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
                lon: result.lon,
                lat: result.lat,
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

      },
    
    },

    /**
     * @example https://dev.virtualearth.net/REST/v1/LocalSearch/?query={query}&userMapView={lat,lon,lat,lon}&key={BingMapsKey}
     * 
     * @see https://learn.microsoft.com/en-us/bingmaps/rest-services/locations/local-search
     */
    bing: {

      // whether to activate Bing Geocoding Provider
      active: undefined !== ApplicationState.keys.vendorkeys.bing,
      
      async fetch(opts) {
        const response = await XHR.get({
          url:           'https://dev.virtualearth.net/REST/v1/LocalSearch/',
          params: {
            query:       opts.query,  // textual search
            userMapView: [opts.extent[1], opts.extent[0], opts.extent[3], opts.extent[2]].join(','),
            key:         ApplicationState.keys.vendorkeys.bing,
          },
        });

        if (!GeocodingControl.providers.bing.active) {
          return;
        }

        // disable bing provider on invalid API key
        // if (response.status === 'REQUEST_DENIED') { 
        //   GeocodingControl.providers.bing.active = false;
        // }

        return {
          label: 'Bing Places',
          results: 200 === response.statusCode
            ? response.resourceSets[0].resources
              .filter(({ point: { coordinates } })=> ol.extent.containsXY(opts.extent, coordinates[1], coordinates[0]))
              .map(result => {
                return {
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
                  },
                  original: {
                    formatted: result.display_name,
                    details:   result.address
                  }
                };
              })
            : [],
        };
      },
    
    },

    google: {

      // whether to activate Google Geocoding Provider
      active: undefined !== ApplicationState.keys.vendorkeys.google,

      async fetch(opts) {
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
          GeocodingControl.providers.google.active = false;
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

      },
    
    },

  };

  /**
   * Search results layer (marker)
   * 
   * @TODO move to parent `Control` class (duplicated also in GEOLOCATION CONTROL)
   */
  this.layer = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: new ol.style.Style({
      text: new ol.style.Text({
        offsetY: -15, // move marker icon on base point coordinate and not center
        text: '\uf3c5',
        font: '900 3em "Font Awesome 5 Free"',
        stroke: new ol.style.Stroke({ color: 'red', width: 3 }),
        fill: new ol.style.Fill({ color: 'rgba(255, 0,0, 0.7)' })
      })
    })
  });

  const GeocoderVueContainer = Vue.extend(MapControlGeocoding);

  /**
   * DOM control element
   */
  this.container = new GeocoderVueContainer({
    propsData: {
      cssClasses,
      containerClass: `${cssClasses.namespace} ${cssClasses.inputTextContainer}`,
      fontIcon:       this.options.fontIcon,
      placeholder:    this.options.placeholder,
      ctx:            this,
    }
  }).$mount().$el;


  // create DOM control elements
  this.control = this.container.getElementsByClassName(cssClasses.inputTextControl)[0];
  this.input   = this.container.getElementsByClassName(cssClasses.inputTextInput)[0];
  this.reset   = this.container.getElementsByClassName(cssClasses.inputTextReset)[0];
  this.result  = this.container.getElementsByClassName(cssClasses.inputTextResult)[0];

  /** @TODO move DOM event listener directly to MapControlGeocoding */

  // add event listener to DOM control elements
  this.input.addEventListener('keyup', _onQuery.bind(this), false);
  this.input.addEventListener('input', _onValue.bind(this), false);
  this.reset.addEventListener('click', _onReset.bind(this), false);

  // parent constructor
  Control.call(this, {
    element: this.container,
    name: "nominatim",
    offline: false,
  });
}

ol.inherits(GeocodingControl, Control);

const proto = GeocodingControl.prototype;

/**
 * Method to show current location/place on map as marker icon
 */
proto.showMarker = function(coordinates, options = { transform: true }) {
  this.hideMarker();
  coordinates = options.transform
    ? ol.proj.transform(coordinates, 'EPSG:4326', this.getMap().getView().getProjection())
    : coordinates;
  const geometry =  new ol.geom.Point(coordinates);
  this.layer.getSource().addFeature(new ol.Feature(geometry));
  this.getMap().addLayer(this.layer);
  GUI.getService('map').zoomToGeometry(geometry)
};

/**
 * Remove marker from map
 */
proto.hideMarker = function(){
  this.layer.getSource().clear();
  this.getMap().removeLayer(this.layer);
};

function _onQuery(evt) {
  if ('Enter' === evt.key || 13 === evt.which || 13 === evt.keyCode) {
    evt.preventDefault();
    this.query(evt.target.value.trim());
  }
}

function _onReset() {
  this.input.focus();
  this.input.value = '';
  this.reset.classList.add(cssClasses.hidden);
  this.clearResults();
}

let timeout;
function _onValue(evt) {
  const value = evt.target.value.trim();
  this.reset.classList.toggle(cssClasses.hidden, !value.length);
  if (this.options.autoComplete) {
    timeout && clearTimeout(timeout);
    timeout = setTimeout(() => (value.length >= this.options.autoCompleteMinLength) && this.query(value), 200);
  }
}

/**
 * Run geocoding request
 * 
 * @param { string } q query string in this format: "XCoord,YCoord,EPSGCode"
 */
proto.query = function(q) {

  this.hideMarker();

  return new Promise(async (resolve, reject) => {
    const isNumber     = value => 'Number' === toRawType(value) && !Number.isNaN(value);
    let coordinates    = null;
    let transform      = false;
    const [x, y, epsg] = (q || '').split(',');
    const code         =  epsg && Projections.get(`EPSG:${epsg.trim()}`);

    // extract xCoord and yCoord
    if (isNumber(1*x) && isNumber(1*y)) {
      coordinates = [1*x, 1*y];
    }

    // whether EPSGCode is allowed on this project
    try {
      if (code) {
        coordinates = ol.proj.transform(coordinates, Projections.get(`EPSG:${epsg.trim()}`), 'EPSG:4326');
        transform = true;
      }
    } catch(err) {
      console.warn(err);
    }

    // request is for a place (Address, Place, etc..)
    if (!coordinates) {

      // loop active Providers
      const providers = Object.values(GeocodingControl.providers).filter(p => p.active);

      // const extent = ol.proj.transformExtent(this.options.viewbox, this.options.mapCrs, 'EPSG:4326');
      const extent    = ol.proj.transformExtent(GUI.getService('map').getMapExtent(), this.options.mapCrs, 'EPSG:4326');

      // clear previous result
      this.clearResults();
      this.reset.classList.add(cssClasses.spin);

      const results = await Promise.allSettled(
        providers.map(p => p.fetch({
          query:        q,
          lang:         this.options.lang,
          countrycodes: this.options.countrycodes,
          limit:        this.options.limit,
          extent,
        }))
      );

      results.forEach((p) => {
        if ('fulfilled' === p.status) {
          this.createList(p.value);
        }
      });

      this.reset.classList.remove(cssClasses.spin);
    }

    // request is for a single point (XCoord,YCoord)
    if (coordinates) {
      this.showMarker(coordinates, { transform });
      resolve(coordinates);
      return;
    }

  });
};

/**
 * Create a DOM list of results
 */
proto.createList = function({
  label,
  results = {},
} = {}) {
  const ul = this.result;

  const heading = document.createElement('li');
  heading.innerHTML = `<div style="display: flex; justify-content: space-between; padding: 5px">`
                    + `<span style="color: #FFFFFF; font-weight: bold">${label}</span>`
                    + `</div>`;
  heading.classList.add("skin-background-color");
  
  ul.appendChild(heading);

  if (results.length) {
    results.forEach(({ name, type, address, lon, lat }) => {
      const html = [];

      // build template string
      if (type)                                                     html.push(`<div>${type}</div>`);
      if (name)                                                     html.push(`<div>${name}</div>`);
      if (address.name)                                             html.push(`<div class="${ cssClasses.road }">{name}</div>`);
      if (address.road || address.building || address.house_number) html.push(`<div class="${ cssClasses.road }">{building} {road} {house_number}</div>`);
      if (address.city || address.town || address.village)          html.push(`<div class="${ cssClasses.city }">{postcode} {city} {town} {village}</div>`);
      if (address.state || address.country)                         html.push(`<div class="${ cssClasses.country }">{state} {country}</div>`);
    
      // parse template string 
      const addressHtml = html.join('<br>').replace(
        /\{ *([\w_-]+) *\}/g,
        (_, key) => String((address[key] === undefined) ? '' : address[key])
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
      );

      let li         = document.createElement('li');
      li.innerHTML   = `<a href="#">${addressHtml}</a>`;

      // append childs (in memory)
      const frag     = document.createDocumentFragment();
      while (li.childNodes[0]) frag.appendChild(li.childNodes[0]);
      li.appendChild(frag);

      // click to select
      li.addEventListener('click', evt => {
        evt.preventDefault();
        if (false === this.options.keepOpen) {
          this.clearResults(true);
        }
        this.showMarker([ parseFloat(lon), parseFloat(lat) ]);
      }, false);

      ul.appendChild(li);
    });
  } else {
    const li = Vue.extend(MapControlNominatimResults);
    ul.appendChild(new li({ propsData: { noresults: this.options.noresults } }).$mount().$el);
  }
};

/**
 * Clear list of results
 */
proto.clearResults = function() {
  this.result.replaceChildren();
  this.hideMarker();
};


module.exports = GeocodingControl;