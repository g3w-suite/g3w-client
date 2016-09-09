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
        state: null
      }
    },
    methods: {
      fireAction: function(actionid){
        this.$options.toolsService.fireAction(actionid);
      }
    }
});

function ToolsComponent(options){
  base(this,options);
  var self = this;
  this._service = new ToolsService();
  this.id = "tools-component";
  this.title = "tools";
  this.state.visible = false;
  this._service.onafter('addToolGroup',function(){
    self.state.visible = self._service.state.toolsGroups.length > 0;
  })
  merge(this, options);
  this.internalComponent = new InternalComponent({
    toolsService: this._service
  });
  //sostituisco lo state del servizio allo state del componente vue interno
  this.internalComponent.state = this._service.state
};

inherit(ToolsComponent, Component);

var proto = ToolsComponent.prototype;

module.exports = ToolsComponent;
