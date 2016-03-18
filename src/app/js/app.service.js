/*library inherit tools */
var inherit = require('g3w/core/utils').inherit;
var layersRegistry = require('g3w/core/layers/layersregistry');

function service(){
    var self = this;
    this.title = "G3W Client";
    this.config = null;
    this.projectConfig = null;
    
    this.setup = function(config){
        this.config = config;
        //una volta che la configurazione e' stata terminata (evento loadend) emesso
        //dall'oggetto layersRegistry dopo aver trminato il setup
        layersRegistry.once('loaded',function(){
            self.emit('ready');
        });
        //inizializza la configurazione basata sul gruppo di progetti
        layersRegistry.setup(config);
    };
}

inherit(service,EventEmitter);

module.exports = new service();
