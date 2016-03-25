var PluginMixin = require('g3w/core/pluginmixin');
// define a component that uses this mixin
var toolPlugin = Vue.component('plugin',{
    template: require('./plugin.html'),
    data: function (){
      return {
          name:'editor'
      }
    },
    mixins: [PluginMixin]

});

module.exports = toolPlugin;