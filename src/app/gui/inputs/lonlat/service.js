const {base, inherit} = require('core/utils/utils');
const Service = require('gui/inputs/service');

function LonLatService(options={}) {
  base(this, options);
  this.validate = function(){
    this.state.values.lon = this.state.values.lon || 0;
    this.state.values.lat = this.state.values.lat|| 0;
    if (this.state.values.lon < -180) this.state.values.lon = -180;
    else if (this.state.values.lon > 180) this.state.values.lon = 180;
    if (this.state.values.lat < -90) this.state.values.lon = -90;
    else if (this.state.values.lat > 90) this.state.values.lon = 90;
    this.state.validate.valid = true;
  }
}

inherit(LonLatService, Service);

module.exports = LonLatService;
