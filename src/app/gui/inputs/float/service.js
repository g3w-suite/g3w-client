const { base, inherit } = require('utils');
const Service = require('gui/inputs/service');

function FloatService(options={}) {
  base(this, options);
}

inherit(FloatService, Service);


module.exports = FloatService;
