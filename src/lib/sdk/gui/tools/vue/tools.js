var t = require('core/i18n/i18n.service').t;
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var Component = require('gui/vue/component');

//var ToolsService = require('g3w/core/toolsservice');

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
  this.id = "tools-component";
  this.title = "tools";
  this.internalComponent = new InternalComponent;
  merge(this, options);
}

inherit(ToolsComponent, Component);

module.exports = ToolsComponent;
