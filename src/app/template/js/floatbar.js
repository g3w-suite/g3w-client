const t = require('sdk/core/i18n/i18n.service').t;
const Stack = require('./barstack.js');
const GUI = require('sdk/gui/gui');

function FloatbarService(){
  this.stack = new Stack();
  this.init = function(layout){
    this.layout = layout;
    this.sidebarEl = $(this.layout.options.controlSidebarOptions.selector);
    this._zindex = this.sidebarEl.css("z-index");
    this._modalOverlay = null;
    this._modal = false;
    this._isopen = false;
  };

  this.isOpen = function() {
    return this._isopen;
  };

  this.open = function() {
    this.layout.floatBar.open(this.sidebarEl,true);
    this._isopen = true;
  };

  this.close = function() {
    this.layout.floatBar.close(this.sidebarEl,true);
    this._isopen = false;
  };

  this.showPanel = function(panel, options){
    options = options || {};
    const append = options.append || false;
    const modal = options.modal || false;
    options.parent = "#g3w-floatbarpanel-placeholder";
    this.stack.push(panel, options);
    if (!this._isopen) {
      this.open();
    }
  };

  this.closePanel = function(panel){
    if (panel) {
      this.stack.remove(panel);
    }
    else {
      this.stack.pop();
    }
    if (!this.stack.getLength()) {
      if (this._modal){
        GUI.setModal(false);
        this.close();
        $('.control-sidebar-bg').toggleClass('control-sidebar-bg-shadow');
        this.sidebarEl.css("z-index","");
        this.sidebarEl.css("padding-top","50px");
        $('.control-sidebar-bg').css("z-index","");
        this._modal = false;
      }
      else {
        this.close();
      }
    }
  };

  this.hidePanel = function(){
    this.close();
  };
}

const floatbarService = new FloatbarService();
const compiledFloatBarTemplate = Vue.compile(require('../html/floatbar.html'));

const FloatbarComponent = Vue.extend({
    ...compiledFloatBarTemplate,
    data: function() {
    	return {
        stack: floatbarService.stack.state,
      };
    },
    computed: {
      // active panels on stack
      panelsinstack: function(){
        return this.stack.contentsdata.length>0;
      },
      panelname: function(){
        let name;
        if (this.stack.contentsdata.length){
          name = this.stack.contentsdata.slice(-1)[0].content.getTitle();
        }
        return name;
      },
      closable: function() {
        return floatbarService.closable;
      }
    },
    watch: {
      "stack.contentsdata": function() {
        const children = $("#g3w-floatbarpanel-placeholder").children();
        children.forEach((child, index) => {
          if (index == children.length-1) {
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
};
