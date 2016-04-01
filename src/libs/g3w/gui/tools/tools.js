var t = require('i18n.service');
var GUI = require('g3w/gui/gui');

var AppService = require('app.service');
var ToolsService = require('g3w/core/toolsservice');

Vue.component('g3w-tools',{
    template: require('./tools.html'),
    data: function() {
      return {
        tools: ToolsService.state.tools
      }
    },
    computed: {
      assetsurl: function(){
        return AppService.config.assetsurl;
      }
    },
    methods: {
      fireAction: function(actionid){
        ToolsService.fireAction(actionid);
      }
    }
});
