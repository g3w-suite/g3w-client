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

  constructor (options = {}) {
    super();
    this.id = options.id || null;
    this.title = options.title || '';
    this.internalPanel = options.panel || null;
    this.service = options.service;
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
    const iCinstance = panel.$mount();
    $(parent).append(iCinstance.$el);
    iCinstance.$nextTick(() => {
      $(parent).localize();
      panel.onShow && panel.onShow();
    });
    return resolve(true);
  }

  unmount() {
    const panel = this.internalPanel;
    const d = $.Deferred();
    panel.$destroy(true);
    $(panel.$el).remove();
    panel.onClose && panel.onClose();
    this.internalComponent = null;
    d.resolve();
    return d.promise();
  }

  onResize(parentWidth,parentHeight) {}

}