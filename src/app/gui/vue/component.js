import utils from 'core/utils/utils';
import BaseComponent  from 'gui/component';

// class component
class Component extends BaseComponent {
  constructor(options={}) {
    super(options);
    this._firstLayout = true;
  }

  mount = function(parent, append) {
    const d = $.Deferred();
    if (!this.internalComponent) this.setInternalComponent();
    if (append) {
      const iCinstance = this.internalComponent.$mount();
      $(parent).append(iCinstance.$el);
    } else this.internalComponent.$mount(parent);
    this.internalComponent.$nextTick(() => {
      $(parent).localize();
      this.emit('ready');
      d.resolve(true);
    });
    // emit mount event
    this.emit('mount');
    return d.promise();
  };

  unmount = function() {
    if (!this.internalComponent) return resolve();
    if (this.state.resizable) this.internalComponent.$off('resize-component', this.internalComponent.layout);
    this.state.open = false;
    // destroy vue component
    this.internalComponent.$destroy(true);
    // remove dom element
    $(this.internalComponent.$el).remove();
    // set internal componet to null (for GC)
    this.internalComponent = null;
    // emit unmount event
    this.emit('unmount');
    return utils.resolve();
  };

  ismount() {
    return this.internalComponent && this.internalComponent.$el;
  };

  layout(width, height) {
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
};

export default  Component;
