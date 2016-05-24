var t = require('i18n/i18n.service');
var ToolsService = require('g3w/core/toolsservice');

Vue.component('g3w-tools',{
    template: require('./tools.html'),
    data: function() {
      return {
        tools: ToolsService.state.tools
      }
    },
    methods: {
      fireAction: function(actionid){
        ToolsService.fireAction(actionid);
      }
    }
});
