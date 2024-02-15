const { inherit, base } = require('utils');
const Service = require('gui/inputs/service');

function MediaService(options={}) {
  base(this, options);
}

inherit(MediaService, Service);

module.exports = MediaService;
