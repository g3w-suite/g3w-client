const {base, inherit} = require('core/utils/utils');
const Service = require('gui/inputs/service');
const GUI = require('gui/gui');
const DEFAULT_EPSG = 'EPSG:4326';

function LonLatService(options={}) {
  base(this, options);
  this.map = GUI.getComponent('map').getService().getMap();
  this.validate = function(){
    if (this.state.values.lon < -180) this.state.values.lon = -180;
    else if (this.state.values.lon > 180) this.state.values.lon = 180;
    if (this.state.values.lat < -90) this.state.values.lon = -90;
    else if (this.state.values.lat > 90) this.state.values.lon = 90;
    this.state.validate.valid = !Number.isNaN(1*this.state.values.lon);
  };
  this.getCoordinates = function(){
    this.map.on('singleclick',(evt) =>{
      evt.stopPropagation();
      return evt.coordinates;
    })
  }
}

inherit(LonLatService, Service);

module.exports = LonLatService;
