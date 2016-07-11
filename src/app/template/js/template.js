var t = require('sdk/core/i18n/i18n.service').t;
require('sdk/gui/vue.directives');
var isMobileMixin = require('sdk/gui/vue.mixins').isMobileMixin;
var layout = require('./layout');


/* TUTTO QUESTO CODICE ERA NEL BOOTSTRAP. LO DEVE GESTIRE IL TEMPLATE 
Vue.filter('t', function (value) {
  return t(value);
});

if (config.client.debug){
  Vue.config.debug = true;
}

Vue.mixin(isMobileMixin);

var SidebarComponent = require('./sidebar').SidebarComponent;
var FloatbarComponent = require('./floatbar').FloatbarComponent;
var AppUI = require('./applicationui');

var SideBar = SidebarComponent.extend({
  mixins: [isMobileMixin]
});
Vue.component('sidebar',SidebarComponent);
Vue.component('floatbar',FloatbarComponent);
Vue.component('app', AppUI);



//inizializza la vue appicazione
function run(){
  app = new Vue({
    el: 'body',
    ready: function(){
      $(document).localize();
    }
  });
};
layout.loading();
*/

var ApplicationTemplate = function() {
  this.config = {};
  this.init = function(config, ApplicationService) {
    this.config = config;
    this.appService = ApplicationService;
    this._setupLayout();
    this._buildTemplate();
  };
  
  this._setupLayout = function(){
    layout.setup();
  }
  
  this._buildTemplate = function() {
    bootstrap(this.config);
    var templateConfig = this.config.templateConfig;
    _.forEach(templateConfig, function(component, placeholder){
      console.log(placeholder);
      console.log(component);
      var parent = null; // il parent del componente, recuperato in qualche modo, es. via jQuery selector, o altro
      component.mount(parent);
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

