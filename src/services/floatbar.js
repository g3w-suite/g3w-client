/**
 * @file
 * @since v3.7
 */

import GUI          from 'services/gui';
import { BarStack } from 'core/g3w-barstack';

function FloatbarService(){
  this.stack = new BarStack();
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
    if (!this._isopen) this.open();
  };

  this.closePanel = function(panel){
    if (panel) this.stack.remove(panel);
    else this.stack.pop();
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
      else this.close();
    }
  };

  this.hidePanel = function(){
    this.close();
  };
}

export default new FloatbarService();