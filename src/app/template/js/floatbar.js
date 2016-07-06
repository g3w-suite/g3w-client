var t = require('sdk/core/i18n/i18n.service').t;
var Stack = require('./barstack.js');
var GUI = require('sdk/gui/gui');

function FloatbarService(){
  this.stack = new Stack();
  
  this.init = function(layout){
    this.layout = layout;
    this.closable = true;
    this.sidebarEl = $(this.layout.options.controlSidebarOptions.selector);
    this._zindex = this.sidebarEl.css("z-index");
    this._modalOverlay = null;
    this._modal = false;
  };
  
  this.showPanel = function(panel,options){
    var options = options || {};
    var modal = options.modal || false;
    this.closable = options.closable || true;
    this.stack.push(panel,"#g3w-floatbarpanel-placeholder");
    this.layout.floatBar.open(this.sidebarEl,true);
    if (modal){
      this._modal = true;
      GUI.setModal();
      this.sidebarEl.css("z-index",5000);
      this.sidebarEl.css("padding-top","0px");
      $('.control-sidebar-bg').css("z-index",4999);
      $('.control-sidebar-bg').toggleClass('control-sidebar-bg-shadow');
    }
    
  };
  
  this.closePanel = function(){
    var panel = this.stack.pop();
    if (panel){
      if (_.hasIn(panel,"$destroy")){
        panel.$destroy();
      }
    };
    if (!this.stack.length) {
      if (this._modal){
        GUI.setModal(false);
        this.layout.floatBar.close(this.sidebarEl,true);
        $('.control-sidebar-bg').toggleClass('control-sidebar-bg-shadow');
        this.sidebarEl.css("z-index","");
        this.sidebarEl.css("padding-top","50px");
        $('.control-sidebar-bg').css("z-index","");
        this._modal = false;
      }
      else {
        this.layout.floatBar.close(this.sidebarEl,true);
      }
    }
  };
  
  this.hidePanel = function(){
    this.layout.floatBar.close(this.sidebarEl,true);
  };
}

var floatbarService = new FloatbarService();

var FloatbarComponent = Vue.extend({
    template: require('../html/floatbar.html'),
    data: function() {
    	return {
        stack: floatbarService.stack.state,
      };
    },
    computed: {
      // quanti pannelli sono attivi nello stack
      panelsinstack: function(){
        return this.stack.panels.length>0;
      },
      panelname: function(){
        var name = "";
        if (this.stack.panels.length){
          name = this.stack.panels.slice(-1)[0].name;
        }
        return name;
      },
      closable: function() {
        return floatbarService.closable;
      }
    },
    watch: {
      // TODO: Brutto, ma è l'unico (per ora) modo flessibile che ho trovato per implementare il concetto di stack... 
      "stack.panels": function(){
        var children = $("#g3w-floatbarpanel-placeholder").children();
        _.forEach(children,function(child,index){
          if (index == children.length-1){
            $(child).show();
          }
          else {
            $(child).hide();
          }
        })
      }
    },
    methods: {
      closePanel: function(){
        floatbarService.closePanel();
      }
    }
});

module.exports = {
  FloatbarService: floatbarService,
  FloatbarComponent: FloatbarComponent
}
