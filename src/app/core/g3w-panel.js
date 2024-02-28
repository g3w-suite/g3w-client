/**
 * @file
 * @since 3.10.0
 */

import GUI         from 'services/gui';
import G3WObject   from 'core/g3w-object';
import { resolve } from 'utils/resolve';

/**
 * ORIGINAL SOURCE: src/app/gui/panel.js@v3.9.3 
 */
export default class Panel extends G3WObject {

  constructor (opts = {}) {
    super();

    this.id      = opts.id || null;

    this.title   = opts.title || '';

    this.service = opts.service;

    if (opts.vueComponentObject) {
      this.internalPanel = new (Vue.extend(opts.vueComponentObject))({ service: this.service });
    } else {
      this.internalPanel = opts.panel || opts.internalPanel || null;  
    }

    if (true === opts.show && this.internalPanel) {
      this.show();
    }
  }

  getId() {
    return this.id;
  }

  getTitle() {
    return this.title;
  }

  getService() {
    return this.service;
  }

  setService(service) {
    this.service = service;
  }

  getInternalPanel() {
    return this.internalPanel;
  }

  setInternalPanel(internalPanel) {
    this.internalPanel = internalPanel;
  }

  show() {
    GUI.showPanel(this);
  }

  close() {
    GUI.closePanel();
  }

  mount(parent) {
    const panel = this.internalPanel;
    const vueComp = panel.$mount();
    $(parent).append(vueComp.$el);
    vueComp.$nextTick(() => {
      $(parent).localize();
      panel.onShow && panel.onShow();
    });
    return resolve(true);
  }

  unmount() {
    const panel = this.internalPanel;
    panel.$destroy(true);
    $(panel.$el).remove();
    panel.onClose && panel.onClose();
    this.internalComponent = null;
    if (this.service && this.service.clear) {
      this.service.clear();
    }
    return resolve();
  }

  onResize(parentWidth,parentHeight) {}

}