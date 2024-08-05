import GUI from 'services/gui';

const InteractionControl = require('g3w-ol/controls/interactioncontrol');

const default_options = {
  visible: true,
  offline: false,
  enabled: true, // set initial to false. Is set enabled if is autorized
  name: "geolocation",
  tipLabel: "sdk.mapcontrols.geolocation.tooltip",
  label: "\ue904"
};

// fa-location-dot
const layer_style = new ol.style.Style({
  text: new ol.style.Text({
    text: '\uf3c5',
    font: '900 3em "Font Awesome 5 Free"',
    fill: new ol.style.Fill({ color: 'red' }),
    offsetY: -15, // move marker icon on base point coordinate and not center
  })
});

function GeolocationControl() {

  /**
   * @type { ol.layer.Vector }
   */
  this._layer = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: layer_style
  });

  /**
   * @type { ol.Geolocation }
   */
  this._geolocation = new ol.Geolocation({
    trackingOptions: { enableHighAccuracy: true }
  });

  InteractionControl.call(this, default_options);

  this.on('controlclick', e => {
    if (this._geolocation.getTracking()) {
      this._geolocation.setTracking(false);
    } else {
      this.geolocate();
    }
  });

}

ol.inherits(GeolocationControl, InteractionControl);

const proto = GeolocationControl.prototype;

/**
 * Add marker position layer and feature point always on top of map
 * 
 * @param {{ map: ol.Map, coordinates: ol.coordinate, show?: boolean }}
 */
proto._showMarker = function({map, coordinates, show=true}) {

  if (!this._layer) {
    return;
  }

  // reset layer
  this._layer.getSource().clear();

  if (show)  {
    map.getView().setCenter(coordinates);

    this._layer
      .getSource()
      .addFeature(new ol.Feature({ geometry: new ol.geom.Point(coordinates) }));

    map.addLayer(this._layer);
  } else {
    map.removeLayer(this._layer);
  }

};

/**
 * @since 3.10.0
 */
proto.geolocate = function() {
  const map = this.getMap();

  if (!map) {
    return;
  }
  
  const geolocation = this._geolocation;

  let toggledKeyEvent; // key toggled event handler

  geolocation.on('change:position', () => {
    const coordinates = geolocation.getPosition();
    if (coordinates) {
      toggledKeyEvent = this.on('toggled', () => { this._showMarker({ map, coordinates: geolocation.getPosition(), show: this.isToggled() }); });
      $(this.element).removeClass('g3w-ol-disabled');
      this._showMarker({ map, coordinates, show: this.isToggled() })
    }
  });

  geolocation.on('error', e => {

    this._layer = null;

    GUI.showUserMessage({
      type: 'warning',
      title: "mapcontrols.geolocation.error",
      message: e.message,
      autoclose: false
    });

    this.toggle(false);

    ol.Observable.unByKey(toggledKeyEvent);

    toggledKeyEvent = null;

  });

  geolocation.setProjection(map.getView().getProjection());
  geolocation.setTracking(true);

};

module.exports = GeolocationControl;
