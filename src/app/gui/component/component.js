const { 
  base,
  inherit,
  merge,
  noop,
  capitalize_first_letter,
  resolve
}               = require('utils');
const G3WObject = require('core/g3wobject');

/** @deprecated */
const _cloneDeep = require('lodash.clonedeep');

/**
 * Component class
 * 
 * @param { Object} options
 * @param { number } options.id 
 * @param { string } options.title
 * @param { boolean } options.visible
 * @param { boolean } options.open
 * @param { boolean } options.resizable
 * @param { null | unknown } options.info
 * @param { boolean } options.loading
 * @param { boolean } options.disabled
 * @param { boolean } options.closewhenshowviewportcontent
 * @param options.events
 */
const Component = function(options = {}) {

  const {
    id                           = Math.random() * 1000,
    title                        = '',
    visible                      = true,
    open                         = false,
    resizable                    = false,
    info                         = null,
    loading                      = false,
    disabled                     = false,
    closewhenshowviewportcontent = true,
  } = options;

  this._firstLayout = true;

  /** internal VUE component */
  this.internalComponent = null;

  /** @type { Array } */
  this._components = [];

  /** @type { string } */
  this.id = id;

  /** @type { string } */
  this.title = title;

  this.state = {
    visible,
    open,
    resizable,
    info,
    loading,
    disabled,
    closewhenshowviewportcontent,
    sizes: {
      width:0,
      height:0
    }
  };

  this.setters = {

    setOpen(bool) {
      this.state.open = bool;
      this._setOpen(bool);
    },

    setVisible(bool) {
      this.state.visible = bool;
      this._setVisible(bool);
    },

    setLoading(bool=false) {
      this.state.loading = bool;
    },

    setDisabled(bool=false) {
      this.state.disabled = bool;
    },

    reload() {
      this._reload();
    },

  };

  merge(this, options);

  base(this);

  // add events options
  this.events = options.events;

  if (this.events) {
    this.handleEventsComponent();
  }

};

inherit(Component, G3WObject);

const proto = Component.prototype;

/**
 * @param { Object } options
 * @param { Array } options.components
 * @param { Object } options.service
 * @param { Function } options.service.init
 * @param options.vueComponentObject
 * @param options.template
 * @param options.propsData
 */
proto.init = function(options = {}) {
  this.vueComponent = this.createVueComponent(options.vueComponentObject);
  this._components  = options.components || [];

  this.setService(options.service || noop);

  if (this._service.init) {
    this._service.init(options);
  }

  if (options.template) {
    this.setInternalComponentTemplate(options.template);
  }

  this.setInternalComponent = function() {
    this.internalComponent = new (Vue.extend(this.vueComponent))({
      service: this._service,
      template: options.template,
      propsData: options.propsData
    });
    this.internalComponent.state = this.getService().state;
  };

  this.setInternalComponent();

  return this;
};

proto.getId = function() {
  return this.id;
};

proto.setId = function(id) {
  this.id = id;
};

proto.getOpen = function() {
  return this.state.open;
};

proto.closeWhenViewportContentIsOpen = function() {
  return this.getOpen() && this.state.closewhenshowviewportcontent;
};

proto.getVisible = function() {
  return this.state.visible;
};

proto.getTitle = function() {
  return this.state.title;
};

proto.setTitle = function(title) {
  this.state.title = title;
};

proto.getService = function() {
  return this._service;
};

proto.setService = function(service) {
  this._service = service;
};

proto.handleEventsComponent = function() {
  if (this.events.open) {
    const { when = "after", cb = () => {} } = this.events.open;
    this[`on${when}`]('setOpen', bool => cb(bool));
  }
};

proto.insertComponentAt = function(index, Component) {
  this._components.splice(index, 0, Component);
};

proto.removeCompomentAt = function(index) {
  this._components.splice(index, 1);
};

proto.addComponent = function(Component) {
  this._components.push(Component);
};

proto.popComponent = function() {
  return this._components.pop();
};

proto.removeComponent = function(Component) {
  this._components.forEach((c, i) => {
    if (c === Component) {
      this.splice(i, 1);
      return false;
    }
  })
};

proto.setComponents = function(components) {
  this._components = Array.isArray(components) ? components: [];
};

proto.exendComponents = function(components) {
  _.merge(this._components, components);
};

proto.getInternalComponent = function() {
  return this.internalComponent;
};

proto.setInternalComponent = function(internalComponent, options={}) {
  this.internalComponent = !internalComponent && this.internalComponentClass ? new this.internalComponentClass : internalComponent;
  (options.events || []).forEach(e => this.internalComponent.$on(e.name, data => e.handler && e.handler(data) || this[`set${capitalize_first_letter(e.name)}`](data)))
};

proto.createVueComponent = function (vueObjOptions) {
  return _cloneDeep(vueObjOptions);
};

proto.addInternalComponentData = function(data) {
  _.merge(this.internalComponent, data)
};

proto.overwriteServiceMethod = function(methodName, method) {
  this._service[methodName] = method;
};

proto.overwriteServiceMethods = function(methodsOptions) {
  Object.entries(methodsOptions).forEach(([methodName, method]) => this.overwriteServiceMethod(methodName, method))
};

proto.extendService = function(serviceOptions) {
  if (this._service) {
    merge(this._service, serviceOptions);
  }
};

proto.extendInternalComponent = function(internalComponentOptions) {
  if(!this.vueComponent) {
    this.vueComponent = internalComponentOptions;
    return;
  }
  Object
    .entries(internalComponentOptions)
    .forEach(([key, value]) => {
      switch (key) {
        case 'methods':    this.extendInternalComponentMethods(value); break;
        case 'components': this.extendInternalComponentComponents(value); break;
        case 'computed':   merge(this.vueComponent[key], value); break;
        case 'data':       merge(this.vueComponent[key], value); break;
      }
    });
};

proto.extendInternalComponentComponents = function(components) {
  if (components) {
    merge(this.vueComponent.components, components);
  }
};

proto.extendComponents = function(components) {
  this.extendInternalComponentComponents(components);
};

proto.addComponent = function(component) {
  if (component) {
    this.vueComponent.components[component.key] = component.value;
  }
};

/** @TODO check if unusued (invalid call to "forEach.forEach") */
proto.extendInternalComponentMethods = function(methods) {
  if (methods) {
    Object.entries(methods).forEach.forEach(([key, value]) => (!(value instanceof Function)) && delete methods[key]);
    merge(this.vueComponent.methods, methods);
  }
};

proto.extendInternalComponentComputed = function(computed) {
  if (computed) {
    Object.entries(computed).forEach(([key, value]) =>  (!(value instanceof Function)) && delete computed[key]);
    merge(this.vueComponent.computed, computed);
  }
};

proto.setInternalComponentTemplate = function(template) {
  if (template) {
    this.vueComponent.template = template;
  }
};

proto.getInternalTemplate = function() {
  return this.vueComponent.template;
};

proto.destroy = function() {};

proto.click = function() {};

// hook function to show componet
proto.show = function() {};

proto._setOpen = function(bool) {};

proto._setVisible = function() {};

proto._reload = function() {};

/**
 * @param { Element | 'string' } parent DOM element
 * @param { boolean } append
 *  
 * @returns jquery promise
 * 
 * @fires internalComponent~ready
 * @fires mount
 */
proto.mount = function(parent, append) {
  const d = $.Deferred();

  if (!this.internalComponent) {
    this.setInternalComponent();
  }

  if (append) {
    $(parent).append(this.internalComponent.$mount().$el);
  }
  
  if (!append){
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

/**
 * @returns jquery promise
 * 
 * @fires unmount
 */
proto.unmount = function() {
  if (!this.internalComponent) {
    return resolve();
  }
  if (this.state.resizable) {
    this.internalComponent.$off('resize-component', this.internalComponent.layout);
  }
  this.state.open = false;
  this.internalComponent.$destroy(true);  // destroy vue component
  $(this.internalComponent.$el).remove(); // remove dom element
  this.internalComponent = null;          // set internal componet to null (for GC)
  this.emit('unmount');                   // emit unmount event
  return resolve();
};

/**
 * @returns { Element } DOM element
 */
proto.ismount = function() {
  return this.internalComponent && this.internalComponent.$el;
};

/**
 * @param { number } width 
 * @param { number } height 
 * 
 * @listens internalComponent~resize-component
 * @fires internalComponent~resize-component
 * @fires layout
 */
proto.layout = function(width, height) {
  if (this.state.resizable && this._firstLayout) {
    this.internalComponent.$on('resize-component', this.internalComponent.layout);
    this._firstLayout = false;
  }
  this.internalComponent.$nextTick(() => { this.internalComponent.$emit('resize-component', { width, height }); });
  this.emit('layout');
};

module.exports = Component;