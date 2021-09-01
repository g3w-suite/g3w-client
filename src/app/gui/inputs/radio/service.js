const {inherit, base} = require('core/utils/utils');
const Service = require('gui/inputs/service');

function RadioService(options={}) {
  base(this, options);
}

inherit(RadioService, Service);

module.exports = RadioService;
