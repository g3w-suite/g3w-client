var t = require('i18n.service');
/* layout contains AdminLTE code startup */
var layout = require('layout/layout');

Vue.component('app',{
    template: require('./app.html'),
    props: ['iface'],
    ready: function(){
      /* start to render AdminLTE layout */
      layout.setup();
    }
});
