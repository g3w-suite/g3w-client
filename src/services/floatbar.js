/**
 * @file
 * @since v3.7
 */

import GUI from 'services/gui';

const { barstack } = require('gui/utils/utils');

class FloatbarService {

  constructor() {
    this.stack = new barstack();
  }

  init(layout) {
    this.layout        = layout;
    this.sidebarEl     = $(this.layout.options.controlSidebarOptions.selector);
    this._zindex       = this.sidebarEl.css("z-index");
    this._modalOverlay = null;
    this._modal        = false;
    this._isopen       = false;
  }

  isOpen() {
    return this._isopen;
  }

  open() {
    this.layout.floatBar.open(this.sidebarEl,true);
    this._isopen = true;
  }

  close() {
    this.layout.floatBar.close(this.sidebarEl,true);
    this._isopen = false;
  }

  showPanel(panel, options) {
    options        = options || {};
    options.parent = "#g3w-floatbarpanel-placeholder";
    this.stack.push(panel, options);
    if (!this._isopen) {
      this.open();
    }
  }

  closePanel(panel) {
    if (panel) {
      this.stack.remove(panel);
    } else { 
      this.stack.pop();
    }

    const stack_len = this.stack.getLength();

    if(!stack_len && !this._modal) {
      this.close();
    } else if (!stack_len && this._modal) {
      GUI.setModal(false);
      this.close();
      $('.control-sidebar-bg').toggleClass('control-sidebar-bg-shadow');
      this.sidebarEl.css("z-index", "");
      this.sidebarEl.css("padding-top", "50px");
      $('.control-sidebar-bg').css("z-index", "");
      this._modal = false;
    } 
  }

  hidePanel() {
    this.close();
  }

}

export default new FloatbarService();