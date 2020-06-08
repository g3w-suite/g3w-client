const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const resolve = require('core/utils/utils').resolve;
const BaseComponent = require('gui/component');

// class component
const Component = function(options={}) {
  this._firstLayout = true;
  base(this, options);
};

inherit(Component, BaseComponent);

const proto = Component.prototype;

proto.mount = function(parent, append) {
  const d = $.Deferred();
  if (!this.internalComponent) {
    this.setInternalComponent();
  }
  if (append) {
    const iCinstance = this.internalComponent.$mount();
    $(parent).append(iCinstance.$el);
  } else {
    this.internalComponent.$mount(parent);
  }
  this.internalComponent.$nextTick(() => {
    $(parent).localize();
    this.emit('ready');
    d.resolve(true);
  });
  // emit mount event
  this.emit('mount');
  return d.promise();
};

proto.unmount = function() {
  if (!this.internalComponent) {
    return resolve();
  }
  if (this.state.resizable) {
    this.internalComponent.$off('resize-component', this.internalComponent.layout);
  }
  // destroy vue component
  this.internalComponent.$destroy(true);
  // remove dom element
  $(this.internalComponent.$el).remove();
  // set internal componet to null (for GC)
  this.internalComponent = null;
  // emit unmount event
  this.emit('unmount');
  return resolve();
};

proto.ismount = function() {
  return this.internalComponent && this.internalComponent.$el;
};

proto.layout = function(width, height) {
  if (this.state.resizable && this._firstLayout) {
    this.internalComponent.$on('resize-component', this.internalComponent.layout);
    this._firstLayout = false;
  }
  this.internalComponent.$nextTick(() => {
    this.internalComponent.$emit('resize-component', {
      width,
      height
    })
  });
  // emit layout event
  this.emit('layout');
};

module.exports = Component;
