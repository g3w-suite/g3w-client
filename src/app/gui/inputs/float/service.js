const { base, inherit } = require('core/utils/utils');
const Service = require('gui/inputs/service');

function FloatService(options = {}) {
  base(this, options);
}

inherit(FloatService, Service);

module.exports = FloatService;
