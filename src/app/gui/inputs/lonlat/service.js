import GUI from 'services/gui';

const { base, inherit } = require('utils');
const Service           = require('gui/inputs/service');

function LonLatService(options = {}) {
  base(this, options);
  this.coordinatebutton;
  this.mapService =  GUI.getService('map');
  this.mapEpsg    = this.mapService.getCrs();
  this.mapControlToggleEventHandler = evt =>{
    if (evt.target.isToggled() && evt.target.isClickMap()){
      this.coordinatebutton.active && this.toggleGetCoordinate();
    }
  };
  this.map        = this.mapService.getMap();
  this.outputEpsg = this.state.epsg || this.mapEpsg;
  //Store event map key
  this.eventMapKey;
}

inherit(LonLatService, Service);

const proto = LonLatService.prototype;

proto.setCoordinateButtonReactiveObject = function(coordinatebutton) {
  this.coordinatebutton = coordinatebutton;
};

proto.validate = function() {
  if (this.state.values.lon < -180) { this.state.values.lon = -180}
  else if (this.state.values.lon > 180) { this.state.values.lon = 180 }
  if (this.state.values.lat < -90) { this.state.values.lon = -90 }
  else if (this.state.values.lat > 90) { this.state.values.lon = 90 }

  this.state.validate.valid = !Number.isNaN(1*this.state.values.lon);
};

proto.toggleGetCoordinate = function() {
  this.coordinatebutton.active = !this.coordinatebutton.active;
  this.coordinatebutton.active ? this.startToGetCoordinates() : this.stopToGetCoordinates();
};

proto.startToGetCoordinates = function() {
  this.mapService.deactiveMapControls();
  this.mapService.on('mapcontrol:toggled', this.mapControlToggleEventHandler);
  this.eventMapKey = this.map.on('click', evt =>{
    evt.originalEvent.stopPropagation();
    evt.preventDefault();
    const coordinate = this.mapEpsg !== this.outputEpsg ? ol.proj.transform(evt.coordinate, this.mapEpsg, this.outputEpsg) : evt.coordinate;
    this.state.value      = [coordinate];
    const [lon, lat]      = coordinate;
    this.state.values.lon = lon;
    this.state.values.lat = lat;
  })
};

proto.stopToGetCoordinates = function() {
  ol.Observable.unByKey(this.eventMapKey);
  this.mapService.off('mapcontrol:toggled', this.mapControlToggleEventHandler)
};

proto.clear = function() {
  this.stopToGetCoordinates();
};

module.exports = LonLatService;
