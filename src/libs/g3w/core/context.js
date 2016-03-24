var Context = function(config){ 
  this.setup = function(config){
    this.server = config.server;
    this.client = config.client;
  }
}

module.exports = new Context;
