/**
 * @file need some inspiration for other geocoding providers? 👉 https://github.com/Dominique92/ol-geocoder
 */

import ApplicationState           from 'store/application-state';
import GUI                        from 'services/gui';
import MapControlGeocoding        from 'components/MapControlGeocoding.vue';
import MapControlNominatimResults from 'components/MapControlNominatimResults.vue';
import nominatim                  from 'utils/search_from_nominatim';
import bing                       from 'utils/search_from_bing';
import google                     from 'utils/search_from_google';

console.assert(undefined !== MapControlGeocoding);
console.assert(undefined !== MapControlNominatimResults);

const Control                     = require('./control');
const { toRawType }               = require('utils');
const Projections                 = require('g3w-ol/projection/projections');

/**
 * @TODO add a server option to let user choose geocoding extent, eg:
 * 
 * - "dynamic": filter search results based on current map extent
 * - "initial": filter search results based on on initial map extent
 */
const DYNAMIC_MAP_EXTENT = false;

const pushpin_icon = new ol.style.Icon({
  opacity: 1,
  src: '/static/client/images/pushpin.svg',
  scale: 0.8
});

/**
 * Helper CSS classes for control elements 
 * 
 * @type { Object<string, string> }
 */
const css = {
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

/**
 * HTML ENCODER (but why, is there any potential dangerous HTML ?)
 */
function h(text) {
  return String(undefined === text ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
    viewbox:               (undefined !== options.bbox              ? options.bbox              : project.state.initextent || project.state.extent),
    mapCrs:                (undefined !== options.mapCrs            ? options.mapCrs            : project.state.crs.epsg),
    lang:                  ApplicationState.language || 'it-IT',
    limit:                 options.limit             || 5,
    keepOpen:              true,
    preventDefault:        false,
    autoComplete:          false,
    autoCompleteMinLength: 4,
    debug:                 false,
    bounded:               1,
    fontIcon:              GUI.getFontClass('search'),
  };

  /**
   * Geocoding Providers
   * 
   * @type { Object }
   */
  this.providers = [ nominatim, bing, google ];

  /**
   * Search results layer (marker)
   * 
   * @TODO move to parent `Control` class (duplicated also in GEOLOCATION CONTROL)
   */
  this.layer = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: new ol.style.Style({ image: pushpin_icon }),
  });

  const GeocoderVueContainer = Vue.extend(MapControlGeocoding);

  /**
   * DOM control element
   */
  this.container = new GeocoderVueContainer({
    propsData: {
      cssClasses:     css,
      containerClass: `${css.namespace} ${css.inputTextContainer}`,
      fontIcon:       this.options.fontIcon,
      placeholder:    this.options.placeholder,
      ctx:            this,
    }
  }).$mount().$el;


  // create DOM control elements
  this.control = this.container.getElementsByClassName(css.inputTextControl)[0];
  this.input   = this.container.getElementsByClassName(css.inputTextInput)[0];
  this.reset   = this.container.getElementsByClassName(css.inputTextReset)[0];
  this.result  = this.container.getElementsByClassName(css.inputTextResult)[0];

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
  this.reset.classList.add(css.hidden);
  this.clearResults();
}

let timeout;
function _onValue(evt) {
  const value = evt.target.value.trim();
  this.reset.classList.toggle(css.hidden, !value.length);
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

      // const extent    = ol.proj.transformExtent(
      //   DYNAMIC_MAP_EXTENT ? GUI.getService('map').getMapExtent() : this.options.viewbox,
      //   this.options.mapCrs,
      //   'EPSG:4326'
      // );

      // clear previous result
      this.clearResults();
      this.reset.classList.add(css.spin);

      // request data
      const results = await Promise.allSettled(
        this.providers
          .map(p => p({
            query:        q,
            lang:         this.options.lang,
            countrycodes: this.options.countrycodes,
            limit:        this.options.limit,
            extent: ol.proj.transformExtent(
              p === bing ? GUI.getService('map').getMapExtent() : this.options.viewbox,
              this.options.mapCrs,
              'EPSG:4326'
            ),
          }))
      );

      // update search results
      results.forEach((p) => {

        // skip invalid requests
        if ('fulfilled' !== p.status) {
          return;
        }

        console.log(p);

        const ul = this.result;

        const heading = document.createElement('li');
        heading.innerHTML = `<div style="display: flex; justify-content: space-between; padding: 5px">`
                          + `<span style="color: #FFFFFF; font-weight: bold">${p.value.label}</span>`
                          + `</div>`;
        heading.classList.add("skin-background-color");

        ul.appendChild(heading);
      
        if (p.value.results && p.value.results.length) {
          p.value.results.forEach(({ name, type, address, lon, lat }) => {
            const html = [];
            
            // build template string
            if ('nominatim' !== p.value.provider)                         html.push(`<img style="float: right;" src="/static/client/images/pushpin.svg" width="24" height="24"></img>`);
            if (type && 'nominatim' !== p.value.provider)                 html.push(`<div>${type}</div>`);
            if (name && 'nominatim' !== p.value.provider)                 html.push(`<div>${name}</div>`);
            if (address.name)                                             html.push(`<div class="${ css.road }">${h(name)}</div>`);
            if (address.road || address.building || address.house_number) html.push(`<div class="${ css.road }">${h(address.building)} ${h(address.road)} ${h(address.house_number)}</div>`);
            if (address.city || address.town || address.village)          html.push(`<div class="${ css.city }">${h(address.postcode)} ${h(address.city)} ${h(address.town)} ${h(address.village)}</div>`);
            if (address.state || address.country)                         html.push(`<div class="${ css.country }">${h(address.state)} ${h(address.country)}</div>`);

            let li = document.createElement('li');

            if (p.value.provider) {
              li.classList.add(p.value.provider);
            }

            li.innerHTML   = `<a href="#">${html.join('<br>')}</a>`;

            // append childs (in memory)
            const frag     = document.createDocumentFragment();
            while (li.childNodes[0]) frag.appendChild(li.childNodes[0]);
            li.appendChild(frag);

            if ('nominatim' === p.value.provider) {
              // click to select
              li.addEventListener('click', evt => {
                evt.preventDefault();
                if('nominatim' !== p.value.provider) {
                  if (false === this.options.keepOpen) {
                    this.clearResults(true);
                  }
                  this.showMarker([ parseFloat(lon), parseFloat(lat) ]);
                } else {
                  try {
                    const coords = ol.proj.transform([ parseFloat(lon), parseFloat(lat) ], 'EPSG:4326', this.getMap().getView().getProjection())
                    this.layer.getSource().addFeature(new ol.Feature(new ol.geom.Point(coords)));
                    this.getMap().addLayer(this.layer);  
                  } catch(e) {
                    console.log(e);
                  }
                }
              }, false);
            } else {
              try {
                const coords = ol.proj.transform([ parseFloat(lon), parseFloat(lat) ], 'EPSG:4326', this.getMap().getView().getProjection())
                this.layer.getSource().addFeature(new ol.Feature(new ol.geom.Point(coords)));
                this.getMap().addLayer(this.layer);  
              } catch(e) {
                console.log(e);
              }
            }
      
            ul.appendChild(li);
          });
        } else {
          const li = Vue.extend(MapControlNominatimResults);
          ul.appendChild(new li({ propsData: { noresults: this.options.noresults } }).$mount().$el);
        }

      });

      this.reset.classList.remove(css.spin);
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
 * Clear list of results
 */
proto.clearResults = function() {
  this.result.replaceChildren();
  this.hideMarker();
};


module.exports = GeocodingControl;