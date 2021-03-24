function PluginService(){
  this.dependencyApi ={};
  this.init = function(api={}){
    this.dependencyApi = api;
  };
  this.clear = function(){
    //TO OVERWRITE
  };
  this.run = function(message={}){
    //TO OVERWRITE
  };
  this.postMessage= function(message){
    
  };
}

export default PluginService;



