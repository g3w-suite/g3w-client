import ApplicationState from 'core/applicationstate';
import InteractionControl  from './interactioncontrol';
import PickCoordinatesInteraction  from '../interactions/pickcoordinatesinteraction';
import Feature from 'ol/Feature';
import {Vector as SourceVector} from 'ol/source';
import {Vector as VectorLayer} from 'ol/layer';
import {Style, Text, Icon, Fill} from 'ol/style';
import {transform} from "ol/proj";
import {Point} from "ol/geom";

class StreetViewControl extends InteractionControl {
  constructor(options={}) {
    options = {
      ...options,
      offline: false,
      visible: !!ApplicationState.keys.vendorkeys.google,
      name: "streetview",
      tipLabel: "StreetView",
      clickmap: true, // set ClickMap
      label: "\ue905",
      interactionClass: PickCoordinatesInteraction
    };
    super(options);
    this._sv = null;
    this._panorama = null;
    this._map = null;
    this._projection = null;
    this._lastposition = null;
    this._streetViewFeature = new Feature();
    const streetVectorSource = new SourceVector({
      features: []
    });
    this._layer = new VectorLayer({
      source: streetVectorSource,
      style(feature) {
        const coordinates = feature.getGeometry().getCoordinates();
        this._lastposition = this._lastposition ? this._lastposition : coordinates;
        const dx = coordinates[0] - this._lastposition[0];
        const dy = coordinates[1] - this._lastposition[1];
        const rotation = -Math.atan2(dy, dx);
        const styles = [
          new Style({
            text: new Text({
              text: '\ue905',
              font: 'bold 18px icomoon',
              fill: new Fill({
                color: '#ffffff'
              })
            })
          }),
          new Style({
            image: new Icon({
              src: '/static/client/images/streetviewarrow.png',
              rotation
            })
          })
        ];
        this._lastposition = coordinates;
        return styles
      }
    });
  }

  getLayer() {
    return this._layer;
  };

  setProjection(projection) {
    this._projection = projection;
  };

  setPosition(position) {
    const self = this;
    let pixel;
    if (!this._sv) this._sv = new google.maps.StreetViewService();
    this._sv.getPanorama({location: position}, function (data) {
      self._panorama = new google.maps.StreetViewPanorama(
        document.getElementById('streetview'), {
          imageDateControl: true
        }
      );
      self._panorama.addListener('position_changed', function() {
        if (self.isToggled()) {
          const lnglat = transform([this.getPosition().lng(), this.getPosition().lat()], 'EPSG:4326', self._projection.getCode());
          self._layer.getSource().getFeatures()[0].setGeometry(
            new Point(lnglat)
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
    })
  };

  setMap(map) {
    this._map = map;
    super.setMap.call(map);
    this._interaction.on('picked', evt => {
      this.dispatchEvent({
        type: 'picked',
        coordinates: evt.coordinate
      });
      this._autountoggle && this.toggle();
    });
  };

  clearMarker() {
    this._streetViewFeature.setGeometry(null)
  };

  clear() {
    this._layer.getSource().clear();
    this._streetViewFeature.setGeometry(null);
    this.clearMarker();
    this._panorama = null;
    this.dispatchEvent('disabled')
  };

  toggle(toggle) {
    super.toggle(toggle);
    if (!this.isToggled()) this.clear();
    else this._layer.getSource().addFeatures([this._streetViewFeature]);
  };
}

export default  StreetViewControl;
