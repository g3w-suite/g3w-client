var t = require('sdk/core/i18n/i18n.service').t;
var Stack = require('./barstack.js');

//sidebar item che non è altro che un li della sidebar dove sarà possobile impostare
//titolo tipo di icona etc .. customizzata per ogni componente

var SidebarItem = Vue.extend({
  template: require('../html/sidebar-item.html'),
  data: function() {
    return {
        main: true,
        component: null,
        active: false,
        dataType: 'inline',
        title: 'component',
        icon: null,
        open: true,
        state: null
      };
  }
});

function SidebarService(){
  this.stack = new Stack();
  this.state = {
    components: []
  };
  
  this.init = function(layout){
    this.layout = layout;
  };
  
  this.addComponent = function(component){
    //aggiungo componente
    this.state.components.push(component);
    //faccio montare il sedebar-item che contiene al suo interno il placeholder del componente vero e proprio
    //in questo modo il componente non si dovrà occupare di costruire anche l'elemento li della sidebar
    //ma conterrà solo il contenuto
    var sidebarItem = new SidebarItem();
    //setto le parti della sidebar-item che cambiano da componente a componente (da rivedere)
    sidebarItem.title = component.title || sidebarItem.title;
    sidebarItem.open = (component.open === undefined) ? sidebarItem.open : component.open;
    sidebarItem.icon = component.dataIcon || sidebarItem.icon;
    sidebarItem.state = component.state || true;
    sidebarItem.$mount().$appendTo('#g3w-sidebarcomponents');
    
    //monto il componete nella sidebar
    component.mount("#g3w-sidebarcomponent-placeholder");
    if (_.has(component, 'initService')) {
      component.initService();
    };
  };
  
  this.removeComponent = function(){
    //da vedere
  };

  this.showPanel = function(panel){
    var parent = "#g3w-sidebarpanel-placeholder";
    this.stack.push(panel, parent);
  };

  this.closePanel = function(){
    var panel = this.stack.pop();
  };
}

var sidebarService = new SidebarService();

var SidebarComponent = Vue.extend({
    template: require('../html/sidebar.html'),
    data: function() {
    	return {
        components: sidebarService.state.components,
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
      isMobile: function(){
        return isMobile.any
      }
    },
    ready: function(){
    }
});

module.exports = {
  SidebarService: sidebarService,
  SidebarComponent: SidebarComponent
}
