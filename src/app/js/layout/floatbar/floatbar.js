var t = require('i18n.service');
var Stack = require('../barstack.js');

function FloatBar(){
  this.stack = new Stack();
  
  this.init = function(layout){
    this.layout = layout;
    this.sidebarEl = $(this.layout.options.controlSidebarOptions.selector);
  };
  
  this.showPanel = function(panel){
    this.stack.push(panel,"#g3w-floatbarpanel-placeholder");
    this.layout.floatBar.open(this.sidebarEl,true);
  };
  
  this.closePanel = function(){
    var panel = this.stack.pop();
    if (panel){
      if (_.hasIn(panel,"$destroy")){
        panel.$destroy();
      }
    };
    if (!this.stack.length) {
      this.layout.floatBar.close(this.sidebarEl,true);
    }
  }
}

var floatBar = new FloatBar();
module.exports = floatBar;

Vue.component('floatbar',{
    template: require('./floatbar.html'),
    data: function() {
    	return {
        panels: floatBar.stack.state.panels,
      };
    },
    computed: {
      // quanti pannelli sono attivi nello stack
      panelsinstack: function(){
        return this.panels.length>0;
      },
      panelname: function(){
        var name = "";
        if (this.panels.length){
          name = this.panels.slice(-1)[0].name;
        }
        return name;
      }
    },
    methods: {
      closePanel: function(){
        floatBar.closePanel();
      }
    }
});
