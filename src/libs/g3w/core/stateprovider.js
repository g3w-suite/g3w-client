var inherit = require('./utils').inherit;

function StateProvider(){}
inherit(StateProvider,EventEmitter);

var proto = StateProvider.prototype;

proto.stateSet = function(path,value){
  var oldValue = _.get(this.state,path,null);
  if(!oldValue){
    return;
  }
  var pathKey = this.getPathKey(path);
  var stateSetListeners = this.getStateSetListeners();
  var listeners = stateSetListeners[pathKey];
  var canSet = true;
  _.forEach(listeners,function(listener, key){
    canSet &= listener.apply(this,[value,oldValue]);
  })
  if(canSet){
    console.log("Setting: "+path+"="+value);
    _.set(this.state,path,value);
  }
};

proto.addStateSetListener = function(path,listener){
  var stateSetListeners = this.getStateSetListeners();
  var pathKey = this.getPathKey(path);
  if (_.isUndefined(stateSetListeners[pathKey])){
    stateSetListeners[pathKey] = {};
  }
  var listenerKey = ""+Math.floor(Math.random()*1000000)+""+Date.now();
  stateSetListeners[pathKey][listenerKey] = listener;
  return this.generateUnListener(pathKey,listenerKey);
};

proto.getStateSetListeners = function(){
  return this._stateSetListeners || (this._stateSetListeners = {});
};

proto.generateUnListener = function(pathKey,listenerKey){
  self = this;
  return function(){
    var stateSetListeners = self.getStateSetListeners();
    stateSetListeners[pathKey][listenerKey] = null;
    delete stateSetListeners[pathKey][listenerKey];
  }
}

proto.getPathKey = function(path){
  return 'id:'+path;
};

module.exports = StateProvider;
