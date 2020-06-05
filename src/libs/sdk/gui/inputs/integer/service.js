const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const Service = require('gui/inputs/service');

function IntegerService(options={}) {
  base(this, options);
}

inherit(IntegerService, Service);


module.exports = IntegerService;
