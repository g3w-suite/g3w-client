import ApplicationState from 'store/application-state';
import GUI from 'services/gui';

const { XHR } = require('utils');
const utils = require('utils/ol');
const StreetViewComponent = require('gui/streetview/vue/streetview');
const InteractionControl = require('g3w-ol/controls/interactioncontrol');
const PickCoordinatesInteraction = require('g3w-ol/interactions/pickcoordinatesinteraction');

/**
 * DEG to RAD converter
 * 
 * @param {number} deg
 */
const toRadians = (deg) => deg * Math.PI / 180;

/**
 * -90° = inital orientation of `/static/client/images/streetviewarrow.png`
 */
const iconOffset = -90;

const GoogleStreetViewApiUrl = `https://maps.googleapis.com/maps/api/`;

const default_options = {
  offline: false,
  visible: true, // always visible. Only change behavior if exist or not
  name: "streetview",
  tipLabel: "StreetView",
  clickmap: true, // set ClickMap
  label: "\ue905",
  interactionClass: PickCoordinatesInteraction
};

const StreetViewControl = function(options={}) {

  /**
   * Store Google Api Key
   */
  this.key = ApplicationState.keys.vendorkeys.google;

  /**
   * @FIXME un-initialized variable
   * 
   * @type {string}
   */
  this.keyError;

  if (this.key) {
    XHR
      .get({ url: `${GoogleStreetViewApiUrl}streetview?location=0,0&size=456x456&key=${this.key}`})
      .catch((error) => this.keyError = error.responseText);
  }
  
  // dynamically import Google Street View library
  $script(`${GoogleStreetViewApiUrl}js?${this.key ? 'key=' + this.key : '' }`);

  /**
   * @type {google.maps.StreetViewService}
   */
  this._sv = null;

  /**
   * @type {google.maps.StreetViewPanorama}
   */
  this._panorama = null;

  /**
   * @type {ol.Map}
   */
  this._map = null;

  /**
   * @type {ol.proj.Projection}
   */
  this._projection = null;

  /**
   * @type {number} radians
   */
  this._iconRotation = toRadians(iconOffset)

  /**
   * @type {ol.Feature}
   */
  this._streetViewFeature = new ol.Feature();

  /**
   * @type {boolean}
   */
  this.active = false;

  /**
   * @type {ol.layer.Vector}
   */
  this._layer = new ol.layer.Vector({
    source: new ol.source.Vector({features: []}),
    style: (feature, resolution) => [
      new ol.style.Style({
        text: new ol.style.Text({
          text: '\ue905',
          font: 'bold 18px icomoon',
          fill: new ol.style.Fill({ color: '#ff0' }),
          stroke: new ol.style.Stroke({ color: '#000' })
        })
      }),
      new ol.style.Style({
        image: new ol.style.Icon({
          src: '/static/client/images/streetviewarrow.png',
          rotation: this._iconRotation
        })
      })
    ]
  });

  options = utils.merge(options, default_options);

  InteractionControl.call(this,options);
};

ol.inherits(StreetViewControl, InteractionControl);

const proto = StreetViewControl.prototype;

proto.setProjection = function(projection) {
  this._projection = projection;
};

proto.setPosition = function(position) {
  this.active = true;

  if (!this._sv) {
    this._sv = new google.maps.StreetViewService();
  }

  this._sv
    .getPanorama({ location: position }, this.processStreetViewServiceData.bind(this))
    .then(response => { if (undefined === response) GUI.closeContent(); })
    .catch(() => this.toggle())
};

/**
 * @since v3.9
 * 
 * @listens google.maps.StreetViewPanorama#position_changed
 * @listens google.maps.StreetViewPanorama#pov_changed
 */
proto.processStreetViewServiceData = function(data, status) {
  // if (!this._panorama) { // TODO ?
    this._panorama = new google.maps.StreetViewPanorama( document.getElementById('streetview'), { imageDateControl: true });
  // }  

  this._panorama.addListener('position_changed', this.onPanoramaPositionChanged.bind(this));
  this._panorama.addListener('pov_changed',      this.onPanoramaPovChanged.bind(this));

  if (data && data.location) {
    this._panorama.setPosition(data.location.latLng);
    /**
     * @TODO compute intial heading evaluating it between the "openlayers" and "streetview" coordinates
     */
    // this._panorama.setPov({
    //   heading: google.maps.geometry.spherical.computeHeading(data.location.latLng, new google.maps.LatLng(this._clickLat, this._clickLng)),
    //   pitch: 0,
    //   zoom: 0
    // });
  }
};

/**
 * @since v3.9
 */
proto.onPanoramaPositionChanged = function() {

  const pos = this._panorama.getPosition();

  if (!pos || !this.isToggled()) {
    return;
  }

  const lnglat = ol.proj.transform([ pos.lng(), pos.lat() ], 'EPSG:4326', this._projection.getCode());

  this._streetViewFeature.setGeometry( new ol.geom.Point(lnglat) );

  let pixel = this._map.getPixelFromCoordinate(lnglat);

  // recenter map if marker is outside map bounds (15 = pixel padding)
  if (
    pixel[0] > this._map.getSize()[0] - 15 ||
    pixel[1] > this._map.getSize()[1] - 15 ||
    pixel[0] < 15 ||
    pixel[1] < 15
    ) {
    this._map.getView().setCenter(lnglat);
  }

};

/**
 * @since v3.9
 */
proto.onPanoramaPovChanged = function() {
  const pov = this._panorama.getPov();
  this._iconRotation = toRadians(pov.heading + iconOffset);
  /**
   * @TODO really ugly, find out a simpler way to just update the `ol.style.Icon~rotation` value
   */
  this.onPanoramaPositionChanged();
};

proto.setMap = function(map) {
  this._map = map;

  InteractionControl.prototype.setMap.call(this, map);

  this.setProjection(this._map.getView().getProjection());

  this._map.addLayer(this._layer);

  this._interaction.on('picked', ({coordinate}) => {
    this.showStreetView(coordinate);
    if (this._autountoggle) {
      this.toggle();
    }
  });

};

/**
 * Conditionally show Street View panorama depending of `key` and `keyError`
 * 
 * @param coordinate
 */
proto.showStreetView = function(coordinate) {
  const [lng, lat] = ol.proj.transform(coordinate, this._map.getView().getProjection().getCode(), 'EPSG:4326');
  if (this.key) {
    GUI.setContent({
      content: new StreetViewComponent({ keyError: this.keyError }),
      title: 'StreetView'
    });
    if (!this.keyError) {
      this.setPosition({ lng, lat });
    }
  } else {
    this._streetViewFeature.setGeometry( new ol.geom.Point(coordinate) );
    window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`);
  }
};

proto.clearMarker = function() {
  this._streetViewFeature.setGeometry(null)
};

proto.clear = function() {
  this._layer.getSource().clear();
  this._streetViewFeature.setGeometry(null);
  this.clearMarker();
  this._panorama = null;
  if (this.active) {
    GUI.closeContent();
  } else {
    this.active = false;
  }
};

proto.toggle = function(toggle) {
  InteractionControl.prototype.toggle.call(this, toggle);
  if (this.isToggled()) {
    this._layer.getSource().addFeatures([this._streetViewFeature]);
  } else {
    this.clear();
  }
};

module.exports = StreetViewControl;
