const {base, inherit } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');

function BaseIframeService(options={}){
  base(this);
  this.ready = false;
  this.init = function(){
    //overwrite each service
  }
}

inherit(BaseIframeService, G3WObject);

const proto = BaseIframeService.prototype;

proto.setReady = function(bool=false){
  this.ready = bool;
};

proto.getReady = function(){
  return this.ready;
};

module.exports = BaseIframeService;