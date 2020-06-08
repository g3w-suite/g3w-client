const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const Service = require('gui/inputs/service');

function UniqueService(options={}) {
  base(this, options);
}

inherit(UniqueService, Service);

module.exports = UniqueService;
