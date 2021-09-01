const {inherit, base} = require('core/utils/utils');
const Service = require('gui/inputs/service');

function MediaService(options={}) {
  base(this, options);
}

inherit(MediaService, Service);

module.exports = MediaService;
