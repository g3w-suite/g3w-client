var inherit = require('./utils').inherit;

function LayersService(){
};
inherit(LayersService,EventEmitter);

module.exports = new LayersService
