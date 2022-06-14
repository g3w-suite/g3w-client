import Service  from 'gui/inputs/service';
import GUI  from 'gui/gui';
import {unByKey} from "ol/Observable";
import {transform} from "ol/proj";

class LonLatService extends Service {
  constructor(options={}) {
    super(options);
    this.coordinatebutton;
    this.mapService =  GUI.getService('map');
    this.mapEpsg = this.mapService.getCrs();
    this.mapControlToggleEventHandler = evt =>{
      if (evt.target.isToggled() && evt.target.isClickMap()) {
        this.coordinatebutton.active && this.toggleGetCoordinate();
      }
    };
    this.map = GUI.getService('map').getMap();
    this.outputEpsg = this.state.epsg || this.mapEpsg;
    this.eventMapKey;
  }
  setCoordinateButtonReactiveObject(coordinatebutton) {
    this.coordinatebutton = coordinatebutton;
  };

  validate() {
    if (this.state.values.lon < -180) this.state.values.lon = -180;
    else if (this.state.values.lon > 180) this.state.values.lon = 180;
    if (this.state.values.lat < -90) this.state.values.lon = -90;
    else if (this.state.values.lat > 90) this.state.values.lon = 90;
    this.state.validate.valid = !Number.isNaN(1*this.state.values.lon);
  };

  toggleGetCoordinate() {
    this.coordinatebutton.active = !this.coordinatebutton.active;
    this.coordinatebutton.active ? this.startToGetCoordinates() : this.stopToGetCoordinates();
  };

  startToGetCoordinates() {
    this.mapService.deactiveMapControls();
    this.mapService.on('mapcontrol:toggled', this.mapControlToggleEventHandler);
    this.eventMapKey = this.map.on('click', evt =>{
      evt.originalEvent.stopPropagation();
      evt.preventDefault();
      const coordinate = this.mapEpsg !== this.outputEpsg ? transform(evt.coordinate, this.mapEpsg, this.outputEpsg) : evt.coordinate;
      this.state.value = [coordinate];
      const [lon, lat] = coordinate;
      this.state.values.lon = lon;
      this.state.values.lat = lat;
    })
  };

  stopToGetCoordinates() {
    unByKey(this.eventMapKey);
    this.mapService.off('mapcontrol:toggled', this.mapControlToggleEventHandler)
  };

  clear() {
    this.stopToGetCoordinates();
  };
}

export default  LonLatService;
