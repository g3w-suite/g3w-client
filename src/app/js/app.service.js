var inherit = require('g3w/core/utils').inherit;
var layersRegistry = require('g3w/core/layers/layersregistry');
var config = require('../test.inline_config');

function service(){
    var self = this;
    this.title = "G3W Client";
    this.projectConfig = null;
    
    this.setup = function(){
        layersRegistry.once('loaded',function(){
            self.emit('ready');
        });
        layersRegistry.setup(config.group);
    };
}

inherit(service,EventEmitter);

module.exports = new service();
