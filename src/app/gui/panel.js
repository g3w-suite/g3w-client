import GUI from 'services/gui';

const { inherit, resolve: resolvedValue } = require('utils');
const G3WObject = require('core/g3wobject');

const Panel = function(options={}) {
  this.id = options.id || null;
  this.title = options.title || '';
  this.internalPanel = options.panel || null;
  this.service = options.service;
};

inherit(Panel, G3WObject);

const proto = Panel.prototype;

proto.getId = function(){
  return this.id;
};

proto.getTitle = function(){
  return this.title;
};

proto.getService = function(){
  return this.service;
};

proto.setService = function(service) {
  this.service = service;
};

proto.getInternalPanel = function() {
  return this.internalPanel;
};

proto.setInternalPanel = function(internalPanel) {
  this.internalPanel = internalPanel;
};

proto.show = function() {
  GUI.showPanel(this);
};

proto.close = function(){
  GUI.closePanel();
};

proto.mount = function(parent) {
  const panel = this.internalPanel;
  const iCinstance = panel.$mount();
  $(parent).append(iCinstance.$el);
  iCinstance.$nextTick(() => {
    $(parent).localize();
    panel.onShow && panel.onShow();
  });
  return resolvedValue(true);
};

proto.unmount = function() {
  const panel = this.internalPanel;
  return new Promise((resolve, reject) => {
    panel.$destroy(true);
    $(panel.$el).remove();
    panel.onClose && panel.onClose();
    this.internalComponent = null;
    resolve();
  })
};

proto.onResize = function(parentWidth,parentHeight){};


module.exports = Panel;
