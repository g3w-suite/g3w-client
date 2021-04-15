const inherit = require('core/utils/utils').inherit;
const resolvedValue = require('core/utils/utils').resolve;
const GUI = require('gui/gui');
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
  const d = $.Deferred();
  panel.$destroy(true);
  $(panel.$el).remove();
  panel.onClose &&  panel.onClose();
  this.internalComponent = null;
  d.resolve();
  return d.promise();
};

proto.onResize = function(parentWidth,parentHeight){};


module.exports = Panel;
