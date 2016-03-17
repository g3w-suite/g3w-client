var t = require('i18n.service');
var appUi = require('app.ui');
var appService = require('app.service');
var app = null;
Vue.config.debug = true;

Vue.filter('t', function (value) {
  return t(value);
});

function run(){
  app = new Vue({
    el: 'body'
  });
}

function initServices(){
  appService.setup();
  appService.on('ready',function(){
    run();
  });
}

initServices();



