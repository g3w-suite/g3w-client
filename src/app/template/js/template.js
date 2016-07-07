var bootstrap = require('./bootstrap');
var ApplicationTemplate = function() {
  this.config = {};
  this.init = function(config, ApplicationService) {
    this.config = config;
    this.appService = ApplicationService;
    this._buildTemplate();
  };
  this._buildTemplate = function() {
    bootstrap(this.config);
    var templateConfig = this.config.templateConfig;
    _.forEach(templateConfig, function(component, placeholder){
      console.log(placeholder);
      console.log(component);
    })
    var app = new Vue({
      el: 'body',
      ready: function(){
        $(document).localize();
      }
    });
  };
};

module.exports =  ApplicationTemplate;

