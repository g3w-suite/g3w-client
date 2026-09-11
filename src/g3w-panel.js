/**
 * @file ORIGINAL SOURCE: src/app/core/g3w-panel.js@v3.10.2
 * @since 3.11.0
 */

import GUI     from 'g3w-app';
import Emitter from 'g3w-emitter';

/**
 * ORIGINAL SOURCE: src/app/gui/panel.js@v3.9.3 
 */
export default class Panel extends Emitter {

  constructor (opts = {}) {
    super();

    this.id            = opts.id ?? null;

    this.title         = opts.title ?? '';

    this.service       = opts.service;

    this.internalPanel = null;

    if (opts.vueComponentObject) {
      this.internalPanel = new (Vue.extend(opts.vueComponentObject))({ service: this.service });
    } else {
      this.internalPanel = opts.panel ?? opts.internalPanel ?? null;
    }

    if (this.internalPanel && true === opts.show) {
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

  async mount(parent) {
    const panel   = this.internalPanel;
    const vueComp = panel.$mount();
    ('string' === typeof parent ? document.querySelector(parent) : parent).append(vueComp.$el);
    await vueComp.$nextTick();
    panel?.onShow?.();
    return true;
  }

  async unmount() {
    const panel = this.internalPanel;
    panel.$destroy(true);
    panel.$el?.remove?.();
    panel.onClose?.();
    this.internalPanel = null;
    this.service?.clear?.();
  }
  
}