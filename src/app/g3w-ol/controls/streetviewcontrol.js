const utils = require('core/utils/ol');
const StreetViewService = require('services/streetview');
const InteractionControl = require('./interactioncontrol');
const GUI = require('gui/gui');
const PickCoordinatesInteraction = require('../interactions/pickcoordinatesinteraction');

const StreetViewControl = function(options={}) {
  const _options = {
    offline: false,
    visible: true, // always visible. Only change behavior if exist or not
    name: "streetview",
    tipLabel: "StreetView",
    clickmap: true, // set ClickMap
    label: "\ue905",
    interactionClass: PickCoordinatesInteraction
  };
  this._sv = null;
  this._panorama = null;
  this._map = null;
  this._projection = null;
  this._lastposition = null;
  this._streetViewFeature = new ol.Feature();
  const streetVectorSource = new ol.source.Vector({
    features: []
  });
  this.active = false;
  this._layer = new ol.layer.Vector({
    source: streetVectorSource,
    style(feature) {
      const coordinates = feature.getGeometry().getCoordinates();
      this._lastposition = this._lastposition ? this._lastposition : coordinates;
      const dx = coordinates[0] - this._lastposition[0];
      const dy = coordinates[1] - this._lastposition[1];
      const rotation = -Math.atan2(dy, dx);
      const styles = [
        new ol.style.Style({
          text: new ol.style.Text({
            text: '\ue905',
            font: 'bold 18px icomoon',
            fill: new ol.style.Fill({
              color: '#ffffff'
            })
          })
        }),
        new ol.style.Style({
          image: new ol.style.Icon({
            src: '/static/client/images/streetviewarrow.png',
            rotation
          })
        })
      ];
      this._lastposition = coordinates;
      return styles
    }
  });
  options = utils.merge(options,_options);
  InteractionControl.call(this,options);
};

ol.inherits(StreetViewControl, InteractionControl);

const proto = StreetViewControl.prototype;

proto.setProjection = function(projection) {
  this._projection = projection;
};

proto.setPosition = function(position) {
  const self = this;
  let pixel;
  if (!this._sv) this._sv = new google.maps.StreetViewService();
  this._sv.getPanorama({location: position}, (data, status) => {
    self._panorama = new google.maps.StreetViewPanorama(
      document.getElementById('streetview'), {
        imageDateControl: true
    });
    /**
     * Listen on position change
    */
    self._panorama.addListener('position_changed', function() {
      if (self.isToggled()) {
        const lnglat = ol.proj.transform([this.getPosition().lng(), this.getPosition().lat()], 'EPSG:4326', self._projection.getCode());
        self._streetViewFeature.setGeometry(
          new ol.geom.Point(lnglat)
        );
        pixel = self._map.getPixelFromCoordinate(lnglat);
        if ((pixel[0] + 15) > self._map.getSize()[0] || (pixel[1] + 15) > self._map.getSize()[1] || pixel[0] < 15 || pixel [1] < 15 ) {
          self._map.getView().setCenter(lnglat);
        }
      }
    });
    if (data && data.location) {
      self._panorama.setPov({
        pitch: 0,
        heading: 0
      });
      self._panorama.setPosition(latLng);
    }
  }).then(response => {
    if (response === undefined) {
      GUI.closeContent();
    }
  }).catch(() => this.toggle())
};

proto.openNewTab = function(coordinate) {
  this._streetViewFeature.setGeometry(
    new ol.geom.Point(coordinate)
  );
  const [lon, lat] = ol.proj.transform(coordinate, this._map.getView().getProjection().getCode(), 'EPSG:4326');
  window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`, );
};

proto.setMap = function(map) {
  this._map = map;
  InteractionControl.prototype.setMap.call(this, map);
  /**
   * Initialize service
   */
  StreetViewService.init()
    .then(() => {
      this.setProjection(this._map.getView().getProjection());
      this._map.addLayer(this._layer);
      (StreetViewService.key && !StreetViewService.errorKey) && StreetViewService.onafter('postRender', position => this.setPosition(position));
    }).catch(() => {});

  this._interaction.on('picked', ({coordinate}) => {
    if (StreetViewService.key) {
      const position = {
        lat: null,
        lng: null
      };
      const lonlat = ol.proj.transform(coordinate, this._map.getView().getProjection().getCode(), 'EPSG:4326');
      position.lat = lonlat[1];
      position.lng = lonlat[0];
      this.active = true;
      StreetViewService.showStreetView(position);
    } else !StreetViewService.errorKey && this.openNewTab(coordinate);
    this._autountoggle && this.toggle();
  });
};

proto.clearMarker = function() {
  this._streetViewFeature.setGeometry(null)
};

proto.clear = function() {
  this._layer.getSource().clear();
  this._streetViewFeature.setGeometry(null);
  this.clearMarker();
  this._panorama = null;
  this.active && GUI.closeContent();
  this.active = false;
};

proto.toggle = function(toggle) {
  InteractionControl.prototype.toggle.call(this, toggle);
  if (!this.isToggled()) this.clear();
  else this._layer.getSource().addFeatures([this._streetViewFeature]);
};

module.exports = StreetViewControl;
