const {base, inherit } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');

function BaseIframeService(options={}){
  base(this);
  this.ready = false;
  this.layers;
  this.init = function(){
    //overwrite each service
  }
}

inherit(BaseIframeService, G3WObject);

const proto = BaseIframeService.prototype;

proto.setLayers = function(layers={}){
  this.layers = layers;
};

proto.getLayers = function(){
  return this.layers;
};

proto.setReady = function(bool=false){
  this.ready = bool;
};

proto.getReady = function(){
  return this.ready;
};

module.exports = BaseIframeService;