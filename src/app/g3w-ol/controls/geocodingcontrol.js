/**
 * @file need some inspiration for other geocoding providers? 👉 https://github.com/Dominique92/ol-geocoder
 */

import ApplicationState           from 'store/application-state';
import GUI                        from 'services/gui';
import MapControlGeocoding        from 'components/MapControlGeocoding.vue';
import nominatim                  from 'utils/search_from_nominatim';
import bing                       from 'utils/search_from_bing';
import google                     from 'utils/search_from_google';

console.assert(undefined !== MapControlGeocoding);

const Control                     = require('./control');

const pushpin_icon = new ol.style.Icon({
  opacity: 1,
  src: '/static/client/images/pushpin.svg',
  scale: 0.8
});

/**
 * @TODO add a server option to let user choose geocoding extent, eg:
 * 
 * - "dynamic": filter search results based on current map extent
 * - "initial": filter search results based on on initial map extent
 */
const DYNAMIC_MAP_EXTENT = false;

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
   * @since 3.9.0
   */
  this._geocoder = new GeocoderVueContainer({
    propsData: {
      fontIcon:       this.options.fontIcon,
      placeholder:    this.options.placeholder,
      noresults:      this.options.noresults,
      ctx:            this,
    }
  });

  /**
   * DOM control element
   */
  this.container = this._geocoder.$mount().$el;

  // create DOM control elements
  // this.control = this.container.getElementsByClassName(css.inputTextControl)[0];

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

/**
 * Run geocoding request
 * 
 * @param { string } q query string in this format: "XCoord,YCoord,EPSGCode"
 */
proto.query = function(q) {
  return this._geocoder.query(q);
};

/**
 * Clear list of results
 */
proto.clearResults = function() {
  this._geocoder.clear();
  this.hideMarker();
};

/**
 * @since 3.9.0
 */
proto.getExtentForProvider = function (provider) {
  // const extent = ol.proj.transformExtent(
  //   DYNAMIC_MAP_EXTENT ? GUI.getService('map').getMapExtent() : this.ctx.options.viewbox,
  //   this.ctx.options.mapCrs,
  //   'EPSG:4326'
  // );

  return ol.proj.transformExtent(
    provider === bing ? GUI.getService('map').getMapExtent() : this.options.viewbox,
    this.options.mapCrs,
    'EPSG:4326'
  )
};


module.exports = GeocodingControl;