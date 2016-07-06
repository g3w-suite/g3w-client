var bootstrap = require('./bootstrap');
var ApplicationTemplate = function(){
  this.config = {};
  this.init = function(config, ApplicationService) {
    this.config = config;
    this.appService = ApplicationService;
    this._buildTemplate();
  };
  this._buildTemplate = function() {
    bootstrap(this.config);
    console.log(this.config.templateConfig);
    var app = new Vue({
      el: 'body',
      ready: function(){
        $(document).localize();
      }
    });
  };
};

module.exports =  ApplicationTemplate;

