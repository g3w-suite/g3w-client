function BaseIframeService(options={}){
  this.ready = false;
}

const proto = BaseIframeService.prototype;

proto.setReady = function(bool=false){
  this.ready = bool;
};

proto.getReady = function(){
  return this.ready;
};

module.exports = BaseIframeService;