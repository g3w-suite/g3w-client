var t = require('i18n.service');
var Stack = require('../barstack.js');
var GUI = require('g3w/gui/gui');

function FloatBar(){
  this.stack = new Stack();
  
  this.init = function(layout){
    this.layout = layout;
    this.sidebarEl = $(this.layout.options.controlSidebarOptions.selector);
    this._zindex = this.sidebarEl.css("z-index");
    this._modalOverlay = null;
    this._modal = false;
  };
  
  this.showPanel = function(panel,modal){
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
}

var floatBar = new FloatBar();
module.exports = floatBar;

Vue.component('floatbar',{
    template: require('./floatbar.html'),
    data: function() {
    	return {
        stack: floatBar.stack.state,
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
        floatBar.closePanel();
      }
    }
});
