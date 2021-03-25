const PluginsRegistry = require('core/plugin/pluginsregistry');

function BasePluginService(){
  this.ready = false;
  this.dependencyApi ={};

  this.init = function(api={}){
    this.dependencyApi = api;
  };

  this.clear = function(){
    //TO OVERWRITE
  };

}

const proto = BasePluginService.prototype;

proto.setReady = function(bool=false){
  this.ready = bool;
};

proto.isReady = function(){
  return this.ready;
};

proto.setDependencyApi = function(api={}){
  this.dependencyApi = api;
};


module.exports =  BasePluginService;



