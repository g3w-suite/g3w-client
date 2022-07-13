const { inherit, base } = require('core/utils/utils');
const Service = require('gui/inputs/service');

function UniqueService(options = {}) {
  base(this, options);
}

inherit(UniqueService, Service);

module.exports = UniqueService;
