/**
 * @file ORIGINAL SOURCE: src/app/g3w-ol/controls/streetviewcontrol.js@v3.10.2
 * @since 3.11.0
 */

import ApplicationState           from 'store/application';
import GUI                        from 'services/gui';
import { XHR }                    from 'utils/XHR';
import InteractionControl         from 'map/controls/interactioncontrol';
import PickCoordinatesInteraction from 'map/interactions/pickcoordinatesinteraction';


const GoogleStreetViewApiUrl = `https://maps.googleapis.com/maps/api/`;

export class StreetViewControl extends InteractionControl {
  constructor(opts = {}) {

    super({
      ...opts,
      offline:                 false,
      visible:                 true, // always visible. Only change behavior if exist or not
      name:                    "streetview",
      tipLabel:                "StreetView",
      clickmap:                true,
      label:                   "\ue905",
      interactionClass:        PickCoordinatesInteraction,
      interactionClassOptions: { cursor: 'ol-streetview' },
      cursorClass:             'ol-streetview',
    });

    /**
     * Check Google Key
     */
    this.key = ApplicationState.keys.vendorkeys.google;

    if (this.key) {
      XHR.get({
        url: `${GoogleStreetViewApiUrl}streetview`,
        params: {
          location: 0,
          size:     '456x456',
          key:      this.key
        }
      }).catch((e) => { console.warn(e); this.keyError = e.responseText });
    }

    // get script
    $script(`${GoogleStreetViewApiUrl}js?${this.key ? 'key=' + this.key : '' }`);

    /***/

    this._sv                 = null;
    this._panorama           = null;
    this._map                = null;
    this._projection         = null;
    this._lastposition       = null;
    this._streetViewFeature  = new ol.Feature();
    this.active              = false;
    
    this._layer = new ol.layer.Vector({
      source: new ol.source.Vector({ features: [] }),
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

    //@since 3.11.0.
    // In the case of key provided and open content with streetview images,
    // on close content need to remove point (icon street view on a map)
    if (this.key) {
      GUI.on('closecontent', () => {
        if (this.isToggled()) { this._layer.getSource().clear() }
      })
    }

  }

  setProjection(projection) {
    this._projection = projection;
  }

  setPosition(position) {
    let pixel;
    const self  = this;
    this.active = true;
    if (!this._sv) {
      this._sv = new google.maps.StreetViewService();
    }
    this._sv.getPanorama({ location: position }, (data) => {
      self._panorama = new google.maps.StreetViewPanorama(document.getElementById('streetview'), { imageDateControl: true });
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
          pitch:   0,
          heading: 0,
        });

        self._panorama.setPosition(data.location.latLng);
      }
    }).then(response => {
      if (undefined === response) {
        GUI.closeContent();
      }
    }).catch(e => { console.warn(e); this.toggle() })
  }

  setMap(map) {
    this._map = map;
    super.setMap(map);

    this.setProjection(this._map.getView().getProjection());
    this._map.addLayer(this._layer);

    this._interaction.on('picked', ({ coordinate }) => {
      this.showStreetView(coordinate);
      if (this._autountoggle) {
        this.toggle();
      }
    });
  }

  /**
   * Method to show StreetView depending on a key and keyError
   * @param coordinate
   */
  showStreetView(coordinate) {
    const [ lng, lat ] = ol.proj.transform(coordinate, this._map.getView().getProjection().getCode(), 'EPSG:4326');
    if (this.key) {
      GUI.setContent({
        title:   'StreetView',
        content: `<div id="streetview">` + (this.keyError ? `<div
          style = "display: flex;justify-content: center;align-items: center;font-weight: bold;height: 100%;padding: 10px;background-color: #FFF;"
          class = "skin-color"
        >${ this.keyError }</div>` : '') +`</div>`,
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
  }

  clearMarker() {
    this._streetViewFeature.setGeometry(null)
  }

  clear() {
    this._layer.getSource().clear();
    this._streetViewFeature.setGeometry(null);
    this.clearMarker();
    this._panorama = null;
    if (this.active) { GUI.closeContent() }
    this.active = false;
  };

  toggle(toggle) {
    super.toggle(toggle);
    if (this.isToggled()) {
      this._layer.getSource().addFeatures([this._streetViewFeature]);
    } else {
      this.clear();
    }
  }

}