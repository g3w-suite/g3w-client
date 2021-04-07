function BaseIframeService(options={}){
  this.ready = false;
  this.init = function(){
    //overwrite each service
  }
}

const proto = BaseIframeService.prototype;

proto.setReady = function(bool=false){
  this.ready = bool;
};

proto.getReady = function(){
  return this.ready;
};

module.exports = BaseIframeService;