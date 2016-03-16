var config = require('../test.config.js');

function service(){
    this.config = null;
};

service.prototype.getConfig = function(){
    return config;
}

service.prototype.setup = function(){
    var self = this;
    var deferred = Q.defer();
    setTimeout(function(){
        self.config = self.getConfig();
        deferred.resolve(config);
    },100)
    return deferred.promise;
};

module.exports = new service();
