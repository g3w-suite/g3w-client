/*library inherit tools */
var inherit = require('g3w/core/utils').inherit;
var layersRegistry = require('g3w/core/layers/layersregistry');
/* example of configuration in line */
var config = require('../test.inline_config');

function service(){
    var self = this;
    this.title = "G3W Client";
    this.projectConfig = null;
    
    this.setup = function(){
        //una volta che la configurazione e' stata terminata (evento loadend) emesso
        //dall'oggetto layersRegistry dopo aver trminato il setup
        layersRegistry.once('loaded',function(){
            self.emit('ready');
        });
        //inizializza la configurazione basata sul gruppo di progetti
        layersRegistry.setup(config.group);
    };
}

inherit(service,EventEmitter);

module.exports = new service();
