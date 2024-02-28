import ApplicationState          from 'store/application-state';
import GUI                       from 'services/gui';
import { mergeOptions }          from 'utils/mergeOptions';
import * as vueComp              from 'components/StreetView.vue';
import Component                 from 'core/g3w-component';

const { XHR }                    = require('utils');
const InteractionControl         = require('g3w-ol/controls/interactioncontrol');
const PickCoordinatesInteraction = require('g3w-ol/interactions/pickcoordinatesinteraction');

const GoogleStreetViewApiUrl = `https://maps.googleapis.com/maps/api/`;

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
  /**
   * Check Google Key
   * */

  this.key = ApplicationState.keys.vendorkeys.google;
  this.keyError;
  if (this.key) {
    XHR.get({
      url: `${GoogleStreetViewApiUrl}streetview?location=0,0&size=456x456&key=${this.key}`
    }).catch((error) => this.keyError = error.responseText);
  }
  //get script script
  $script(`${GoogleStreetViewApiUrl}js?${this.key ? 'key=' + this.key : '' }`);

  /***/

  this._sv = null;
  this._panorama = null;
  this._map = null;
  this._projection = null;
  this._lastposition = null;
  this._streetViewFeature = new ol.Feature();
  const streetVectorSource = new ol.source.Vector({features: []});
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

  options = mergeOptions(options, _options);

  InteractionControl.call(this,options);
};

ol.inherits(StreetViewControl, InteractionControl);

const proto = StreetViewControl.prototype;

proto.setProjection = function(projection) {
  this._projection = projection;
};

proto.setPosition = function(position) {
  const self = this;
  this.active = true;
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

      self._panorama.setPosition(data.location.latLng);
    }
  }).then(response => {
    if (undefined === response) {
      GUI.closeContent();
    }
  }).catch(() => this.toggle())
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
 * Method to show StreetView depending on a key and keyError
 * @param coordinate
 */
proto.showStreetView = function(coordinate) {
  const [lng, lat] = ol.proj.transform(coordinate, this._map.getView().getProjection().getCode(), 'EPSG:4326');
  if (this.key) {
    GUI.setContent({
      title: 'StreetView',
      content: new Component({ internalComponent: (Vue.extend(vueComp))({ keyError: this.keyError }) }),
    });
    if (!this.keyError) {
      this.setPosition({ lng, lat });
    }
  } else  {
    this._streetViewFeature.setGeometry(
      new ol.geom.Point(coordinate)
    );
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
  this.active && GUI.closeContent();
  this.active = false;
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