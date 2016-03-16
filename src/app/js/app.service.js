var config = require('../test.config.js');

function service(){
    this.config = null;
};

service.prototype.bootstrap = function(){
    this.config = config;
};

heir.inherit(service, EventEmitter);

module.exports = service;
