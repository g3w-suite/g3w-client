var inherit = require('./utils').inherit;

function StoreProvider(){}
inherit(StoreProvider,EventEmitter);

StoreProvider.prototype.storeSet = function(path,value){
  var oldValue = _.get(this.store,path,null);
  if(!oldValue){
    return;
  }
  var pathKey = this.getPathKey(path);
  var storeSetListeners = this.getStoreSetListeners();
  var listeners = storeSetListeners.pathKey;
  var canSet = true;
  _.forEach(listeners,function(listener){
    canSet &= listener.apply(this,[value,oldValue]);
  })
  if(canSet){
    console.log("Setting: "+path+"="+value);
    _.set(this.store,path,value);
  }
};

StoreProvider.prototype.addStoreSetListener = function(path,listener){
  var storeSetListeners = this.getStoreSetListeners();
  var pathKey = this.getPathKey(path);
  if (_.isUndefined(storeSetListeners.pathKey)){
    storeSetListeners.pathKey = [];
  }
  storeSetListeners.pathKey.push(listener);
};

StoreProvider.prototype.getStoreSetListeners = function(){
  return this._storeSetListeners || (this._storeSetListeners = {});
}

StoreProvider.prototype.getPathKey = function(path){
  return 'id:'+path;
};

module.exports = StoreProvider;
