import InteractionControl  from './interactioncontrol';
import {Vector as VectorLayer} from "ol/layer";
import {Vector as VectorSource} from "ol/source";
import {Style, Text, Fill} from "ol/style";
import {Feature} from "ol";
import {Point} from "ol/geom";
import {Geolocation} from "ol";
import {unByKey} from 'ol/Observable';

class GeolocationControl extends InteractionControl {
  constructor() {
    const options = {
      visible: false, // set initial to false. Is set visible if is autorized
      offline: false,
      name: "geolocation",
      tipLabel: "sdk.mapcontrols.geolocation.tooltip",
      label: "\ue904"
    };
    super(options);
    this._layer = new VectorLayer({
      source: new VectorSource(),
      style: new Style({
        text: new Text({
          text: '\uf3c5',
          font: '900 3em "Font Awesome 5 Free"',
          fill: new Fill({
            color: 'red'
          })
        })
      })
    });
  }

  /**
   * Method to add market position layer and feature point always on top of map
   * @param map
   * @param coordinates
   * @param show
   * @private
   */
  _showMarker({map, coordinates, show=true}) {
    //in case of control is initialized
    if (this._layer) {
      this._layer.getSource().clear();
      if (show)  {
        map.getView().setCenter(coordinates);
        const feature = new Feature({
          geometry: new Point(coordinates)
        });
        this._layer.getSource().addFeature(feature);
        map.addLayer(this._layer);
      } else map.removeLayer(this._layer);
    }
  };

  getMap() {
    return super.getMap();
  };

  setMap(map) {
    let toggledKeyEvent; // key toggled event handler
    super.setMap.call(map);
    const geolocation = new Geolocation({
      projection: map.getView().getProjection(),
      tracking: true, // set tracking
      trackingOptions: {
        enableHighAccuracy: true
      }
    });

    geolocation.on('change:position', () => {
      const coordinates = geolocation.getPosition();
      if (coordinates) {
        if (!this.isVisible()) {
          this.setVisible(true);
          $(this.element).removeClass('g3w-ol-disabled');
          geolocation.dispatchEvent('authorized');
        }
        this._showMarker({
          map,
          coordinates,
          show: this.isToggled()
        })
      } else this.hideControl(); // remove control from map control flow
    });

    geolocation.once('error', evt => {
      this.hideControl();
      this._layer = null;
      evt.code !== 1 && this.dispatchEvent('error');
      unByKey(toggledKeyEvent);
      toggledKeyEvent = null;
    });

    //only when authorized register toogled event
    geolocation.once('authorized', ()=>{
      toggledKeyEvent = this.on('toggled', () => {
        const coordinates = geolocation.getPosition();
        this._showMarker({
          map,
          coordinates,
          show: this.isToggled()
        })
      });
    })
  };
}


export default  GeolocationControl;
