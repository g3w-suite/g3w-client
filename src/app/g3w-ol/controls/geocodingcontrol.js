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

function _createElement(node, html) {
  let elem       = document.createElement(node);
  elem.innerHTML = html;
  const frag     = document.createDocumentFragment();
  while (elem.childNodes[0]) frag.appendChild(elem.childNodes[0]);
  elem.appendChild(frag);
  return elem;
}

/////////////////////////////////////////////////////////////////////////////////////////
// Geocoding Providers
/////////////////////////////////////////////////////////////////////////////////////////

class Nominatim {

  constructor(options = {}) {
    this.active = true; // whether to activate Nominatim Geocoding Provider
    this.extent = ol.proj.transformExtent(options.viewbox, options.mapCrs, 'EPSG:4326');
  }

  getParameters(options) {
    return {
      url:              'https://nominatim.openstreetmap.org/search',
      params: {
        q:              options.query, // textual search
        format:         'json',
        addressdetails: 1,
        limit:          options.limit || 10,
        viewbox:        this.extent.join(','),
        bounded:        1,
      }
    };
  }

  handleResponse(response = []) {
    return {
      label: 'Nominatim (OSM)',
      results: response
        .filter(place => ol.extent.containsXY(this.extent, place.lon, place.lat))
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
  }

}

class Google {

  constructor(options = {}) {
    this.active = ApplicationState.keys.vendorkeys.google !== undefined; // whether to activate Google Geocoding Provider
    this.extent = ol.proj.transformExtent(options.viewbox, options.mapCrs, 'EPSG:4326');
  }

  getParameters(options = {}) {
    return {
      url:        'https://maps.googleapis.com/maps/api/geocode/json',
      params: {
        address:  options.query, // textual search
        bounds:   [this.extent[1], this.extent[0], this.extent[3], this.extent[2]].join(','),
        language: options.lang,
        key:      ApplicationState.keys.vendorkeys.google,
      },
    };
  }

  handleResponse(response = {}) {
    // disable google provider on invalid API key
    if (response.status === 'REQUEST_DENIED') { 
      this.active = false;
    }
    return {
      label: 'Google',
      results: 'OK' === response.status
        ? response.results
          .filter(({ geometry: { location } })=> ol.extent.containsXY(this.extent, location.lng, location.lat))
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
    }
  }

}

/**
 * @example https://dev.virtualearth.net/REST/v1/LocalSearch/?query={query}&userMapView={lat,lon,lat,lon}&key={BingMapsKey}
 * 
 * @see https://learn.microsoft.com/en-us/bingmaps/rest-services/locations/local-search
 */
class Bing {

  constructor(options = {}) {
    this.active = undefined !== ApplicationState.keys.vendorkeys.bing; // whether to activate Bing Geocoding Provider
    this.extent = ol.proj.transformExtent(options.viewbox, options.mapCrs, 'EPSG:4326');
  }

  getParameters(options = {}) {
    return {
      url:           'https://dev.virtualearth.net/REST/v1/LocalSearch/',
      params: {
        query:       options.query,  // textual search
        userMapView: [this.extent[1], this.extent[0], this.extent[3], this.extent[2]].join(','),
        key:         ApplicationState.keys.vendorkeys.bing,
      },
    };
  }

  handleResponse(response = {}) {
    // disable google provider on invalid API key
    if (response.status === 'REQUEST_DENIED') { 
      this.active = false;
    }
    return {
      label: 'Bing Places',
      results: 'OK' === response.status
        ? response.results
          .filter(({ geometry: { location } })=> ol.extent.containsXY(this.extent, location.lng, location.lat))
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
    }
  }

}

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

  /**
   * Geocoding options provide from mapservice
   */
  this.options = {
    provider:              'osm',
    placeholder:           options.placeholder       || 'Città, indirizzo ... ',
    noresults:             options.noresults         || 'Nessun risultato ',
    notresponseserver:     options.notresponseserver || 'Il server non risponde',
    lang:                  ApplicationState.language || 'it-IT',
    limit:                 options.limit             || 5,
    keepOpen:              true,
    preventDefault:        false,
    autoComplete:          false,
    autoCompleteMinLength: 4,
    debug:                 false,
    viewbox:               options.bbox,
    bounded:               1,
    mapCrs:                options.mapCrs,
    fontIcon:              GUI.getFontClass('search')
  };

  const providerOpts = {
    mapCrs:  this.options.mapCrs,
    viewbox: this.options.viewbox
  };

  /**
   * Geocoding Providers
   * 
   * @type { Array }
   */
  this.providers = [
    new Google(providerOpts),
    new Nominatim(providerOpts),
    new Bing(providerOpts),
  ];

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

  /**
   * Store last query string to avoid duplicate request
   */
  this.lastQuery = '';

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


  /**
   * Create DOM control elements
   */

  this.control = this.container.getElementsByClassName(cssClasses.inputTextControl)[0];
  this.input   = this.container.getElementsByClassName(cssClasses.inputTextInput)[0];
  this.reset   = this.container.getElementsByClassName(cssClasses.inputTextReset)[0];
  this.result  = this.container.getElementsByClassName(cssClasses.inputTextResult)[0];

  //add event listener to DOM control elements
  /**
   * @TODO move events directly to MapControlGeocoding
   */

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
  const value = evt.target.value.trim();
  const hit   = evt.key
    ? evt.key === 'Enter'
    : evt.which
      ? evt.which === 13
      : evt.keyCode
        ? evt.keyCode === 13
        : false;
  if (hit) {
    evt.preventDefault();
    this.query(value);
  }
}

function _onReset() {
  this.input.focus();
  this.input.value = '';
  this.lastQuery   = '';
  this.reset.classList.add(cssClasses.hidden);
  this.clearResults();
}

let timeout, lastQuery;
function _onValue(evt) {
  const value = evt.target.value.trim();
  this.reset.classList.toggle(cssClasses.hidden, !value.length);
  if (this.options.autoComplete && value !== lastQuery) {
    lastQuery = value;
    timeout && clearTimeout(timeout);
    timeout = setTimeout(() => (value.length >= this.options.autoCompleteMinLength) && this.query(value), 200);
  }
}


/**
 * Method that is call when run a request of result
 */
proto.query = function(q) {

  // Clear source
  this.hideMarker();

  return new Promise(async (resolve, reject) => {
    const isNumber  = value => 'Number' === toRawType(value) && !Number.isNaN(value);
    let coordinates = null;
    let transform   = false;

    /** Check if  */
    if (q) {
      //check if q string request query is in this format X,Y,4326 --> <X> X coordinate, <Y> Y coordinate, 4326 EPSG of the coordinates
      const [x, y, epsg] = q.split(',');
      coordinates        = isNumber(1*x) && isNumber(1*y)
        ? [1*x, 1*y]
        : null;
      try {
        // check if is sett epsg code and if is register on project
        if (epsg && Projections.get(`EPSG:${epsg.trim()}`)) {
          coordinates = ol.proj.transform(coordinates, Projections.get(`EPSG:${epsg.trim()}`), 'EPSG:4326');
          transform = true;
        }
      } catch(err) {
        console.warn(err);
      }
    }

    /**Check if request is referred to coordinate (search a single point X,Y)*/
    if (coordinates) {
      this.showMarker(coordinates, { transform });
      resolve(coordinates);
    }

    /** Check id is not coordinate request and the current q is equal to last request.
     * This check is done to avoid to duplicate request
     * */
    if (!coordinates && this.lastQuery === q && this.result.firstChild) {
      return;
    }

    /** If is a place request (Address, Place, etc..) */
    if (!coordinates) {
      const promises = [];
      // loop active Providers
      const providers = this.providers.filter(p => p.active);

      providers.forEach(provider => {
        const request = provider.getParameters({
          query: q,
          lang: this.options.lang,
          countrycodes: this.options.countrycodes,
          limit: this.options.limit
        });

        //set as last query
        this.lastQuery = q;

        //clear previous result
        this.clearResults();

        this.reset.classList.add(cssClasses.spin);

        promises.push(XHR.get(request))
      });

      (await Promise.allSettled(promises))
        .forEach((response, i) => {
          if ('fulfilled' === response.status) {
            const results = providers[i].handleResponse(response.value);
            if (providers[i].active) {
              this.createList(results);
            }
          }
        });

      this.reset.classList.remove(cssClasses.spin);
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

  const heading = _createElement('li',
    `<div style="display: flex; justify-content: space-between; padding: 5px">
      <span style="color: #FFFFFF; font-weight: bold">${label}</span>
    </div>`
  );

  heading.classList.add("skin-background-color");
  
  ul.appendChild(heading);

  if (results.length) {
    results.forEach(({ name, type, address, lon, lat }) => {
      const html = [];

      // build template string
      if (type)                                                     html.push(`<div hidden>${type}</div>`);
      if (name)                                                     html.push(`<div hidden>${name}</div>`);
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

      const li = _createElement('li', ['<a href="#">', addressHtml, '</a>'].join(''));

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