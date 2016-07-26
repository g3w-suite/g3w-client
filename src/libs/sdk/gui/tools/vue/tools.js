var t = require('core/i18n/i18n.service').t;
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var Component = require('gui/vue/component');

var ToolsService = require('gui/tools/toolsservice');

var InternalComponent = Vue.extend({
    template: require('./tools.html'),
    data: function() {
      return {
        //tools: ToolsService.state.tools
      }
    },
    methods: {
      fireAction: function(actionid){
        //ToolsService.fireAction(actionid);
      }
    }
});

function ToolsComponent(options){
  base(this,options);
  this.id = "tools-component";
  this.title = "tools";
  this.toolsService = new ToolsService();
  merge(this, options);
  this.internalComponent = new InternalComponent({
    toolsService: this.toolsService
  });
}

inherit(ToolsComponent, Component);

module.exports = ToolsComponent;
