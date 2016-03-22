var inherit = require('./utils').inherit;

function StoreProvider(){}
inherit(StoreProvider,EventEmitter);

var proto = StoreProvider.prototype;

proto.storeSet = function(path,value){
  var oldValue = _.get(this.store,path,null);
  if(!oldValue){
    return;
  }
  var pathKey = this.getPathKey(path);
  var storeSetListeners = this.getStoreSetListeners();
  var listeners = storeSetListeners[pathKey];
  var canSet = true;
  _.forEach(listeners,function(listener, key){
    canSet &= listener.apply(this,[value,oldValue]);
  })
  if(canSet){
    console.log("Setting: "+path+"="+value);
    _.set(this.store,path,value);
  }
};

proto.addStoreSetListener = function(path,listener){
  var storeSetListeners = this.getStoreSetListeners();
  var pathKey = this.getPathKey(path);
  if (_.isUndefined(storeSetListeners[pathKey])){
    storeSetListeners[pathKey] = {};
  }
  var listenerKey = ""+Math.floor(Math.random()*1000000)+""+Date.now();
  storeSetListeners[pathKey][listenerKey] = listener;
  return this.generateUnListener(pathKey,listenerKey);
};

proto.getStoreSetListeners = function(){
  return this._storeSetListeners || (this._storeSetListeners = {});
};

proto.generateUnListener = function(pathKey,listenerKey){
  self = this;
  return function(){
    var storeSetListeners = self.getStoreSetListeners();
    storeSetListeners[pathKey][listenerKey] = null;
    delete storeSetListeners[pathKey][listenerKey];
  }
}

proto.getPathKey = function(path){
  return 'id:'+path;
};

module.exports = StoreProvider;
