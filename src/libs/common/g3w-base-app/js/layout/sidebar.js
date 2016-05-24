var t = require('i18n/i18n.service').t;
require('g3w/gui/catalog/catalog');
require('g3w/gui/search/search');
require('g3w/gui/tools/tools');
var Stack = require('./barstack.js');

function SidebarService(){
  this.stack = new Stack();
  
  this.init = function(layout){
    this.layout = layout;
  };
  
  this.showPanel = function(panel){
    this.stack.push(panel,"#g3w-sidebarpanel-placeholder");
  };
  
  this.closePanel = function(){
    var panel = this.stack.pop();
    if (panel){
      if (_.hasIn(panel,"$destroy")){
        panel.$destroy();
      }
    }
  }
}

var sidebarService = new SidebarService();

var SidebarComponent = Vue.extend({
    data: function() {
    	return {
        panels: sidebarService.stack.state.panels,
        bOpen: true,
    		bPageMode: false,
    		header: t('main navigation'),
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
        sidebarService.closePanel();
      }
    },
    ready: function(){
      // temporaneo, per avviare direttamente iternet
      //var iternet = require('g3w-iternet/plugin');
      //iternet.startEditing();
    }
});

Vue.component('sidebar-item',{
	props: ['data-icon','data-label','data-type','open-on-start'],
  template: require('./templates/sidebar-item.html'),
  data: function() {
    return {
        main: true,
      };
  }
});

module.exports = {
  SidebarService: sidebarService,
  SidebarComponent: SidebarComponent
}
