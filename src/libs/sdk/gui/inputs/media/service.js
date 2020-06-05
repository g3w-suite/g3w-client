const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const Service = require('gui/inputs/service');

function MediaService(options={}) {
  base(this, options);
}

inherit(MediaService, Service);

module.exports = MediaService;
