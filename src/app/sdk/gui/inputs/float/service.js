const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const Service = require('gui/inputs/service');

function FloatService(options={}) {
  base(this, options);
}

inherit(FloatService, Service);


module.exports = FloatService;
