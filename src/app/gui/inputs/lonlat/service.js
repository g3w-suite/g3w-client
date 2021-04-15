const {base, inherit} = require('core/utils/utils');
const Service = require('gui/inputs/service');
const GUI = require('gui/gui');
const DEFAULT_EPSG = 'EPSG:4326';

function LonLatService(options={}) {
  base(this, options);
  this.map = GUI.getComponent('map').getService().getMap();
  this.eventMapKey;
}

inherit(LonLatService, Service);

const proto = LonLatService.prototype;

proto.validate = function(){
  if (this.state.values.lon < -180) this.state.values.lon = -180;
  else if (this.state.values.lon > 180) this.state.values.lon = 180;
  if (this.state.values.lat < -90) this.state.values.lon = -90;
  else if (this.state.values.lat > 90) this.state.values.lon = 90;
  this.state.validate.valid = !Number.isNaN(1*this.state.values.lon);
};

proto.startToGetCoordinates = function(){
  this.eventMapKey = this.map.on('singleclick', evt =>{
    evt.originalEvent.stopPropagation();
    evt.preventDefault();
    this.state.value = evt.coordinates;
    console.log(evt.coordinates)
  })
};

proto.stopToGetCoordinates = function(){
  ol.Observable.unByKey(this.eventMapKey);
};

proto.clear = function(){
  this.stopToGetCoordinates()
};

module.exports = LonLatService;
