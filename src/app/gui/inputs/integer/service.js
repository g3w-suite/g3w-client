const { base, inherit } = require('core/utils/utils');
const Service = require('gui/inputs/service');

function IntegerService(options={}) {
  base(this, options);
}

inherit(IntegerService, Service);


module.exports = IntegerService;
