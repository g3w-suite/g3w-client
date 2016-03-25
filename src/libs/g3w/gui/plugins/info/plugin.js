var PluginMixin = require('g3w/gui/plugins/pluginmixin');
// define a component that uses this mixin
var toolPlugin = PluginMixin.extend({
    template: require('./plugin.html'),
    data: function (){
      return {
          name:'info'
      }
    }
});
module.exports = toolPlugin;