var inherit = require('g3w/core/utils').inherit;
var config = require('../test.inline_config');
var geoService = require('geo/geo.service');

function service(){
    var self = this;
    this.projectConfig = null;
    
    this.setup = function(){
        geoService.once('loaded',function(){
            self.emit('ready');
        });
        geoService.setup(config.group);
    };
}

inherit(service,EventEmitter);

module.exports = new service();
