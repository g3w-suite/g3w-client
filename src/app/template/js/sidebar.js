var t = require('sdk/core/i18n/i18n.service').t;
var Stack = require('./barstack.js');

function SidebarService(){
  this.stack = new Stack();
  
  this.init = function(layout){
    this.layout = layout;
  };
  
  this.addComponent = function(component){
    var parent = $("#g3w-sidebarcomponent-placeholder");
    this.stack.push(component, parent);
  };
  
  this.removeComponent = function(){
    var component = this.stack.pop();
    if (component){
      if (_.hasIn(component,"$destroy")){
        component.$destroy();
      }
    }
  };
}

var sidebarService = new SidebarService();

var SidebarComponent = Vue.extend({
    template: require('../html/sidebar.html'),
    data: function() {
    	return {
        components: sidebarService.stack.state.components,
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
      componentsinstack: function(){
        return this.components.length>0;
      },
      componentname: function(){
        var name = "";
        if (this.components.length){
          name = this.components.slice(-1)[0].getName();
        }
        return name;
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
      },
      isMobile: function(){return isMobile.any}
    },
    ready: function(){
      // temporaneo, per avviare direttamente iternet
      //var iternet = require('g3w-iternet/plugin');
      //iternet.startEditing();
    }
});

Vue.component('sidebar-item',{
	props: ['data-icon','data-label','data-type','open-on-start'],
  template: require('../html/sidebar-item.html'),
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
