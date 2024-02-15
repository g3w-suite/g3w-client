import G3WObject from 'core/g3wobject';
import {
  base,
  inherit,
  merge,
  noop,
  capitalize_first_letter,
  resolve,
}                from 'utils';

/** @deprecated */
const _cloneDeep = require('lodash.clonedeep');

const VUECOMPONENTSATTRIBUTES = ['methods', 'computed', 'data', 'components'];

// class component
const Component = function(options={}) {
  this._firstLayout = true;
  // internal VUE component
  this.internalComponent = null;
  this._components = [];
  const {
    id=Math.random() * 1000,
    title='',
    visible=true,
    open=false,
    resizable=false,
    info=null,
    loading=false,
    disabled=false,
    closewhenshowviewportcontent=true,
  } = options;
  this.id = id ;
  this.title = title;
  this.state = {
    visible, // visibile
    open, // open,
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
  //setters
  this.setters = {
    setOpen(bool) {
      this.state.open = bool;
      this._setOpen(bool);
    },
    setVisible(bool) {
      this.state.visible = bool;
      this._setVisible(bool);
    },
    setLoading(bool=false){
      this.state.loading = bool;
    },
    setDisabled(bool=false){
      this.state.disabled = bool;
    },
    reload() {
      this._reload();
    }
  };
  merge(this, options);
  base(this);
  // add events options
  this.events = options.events;
  this.events && this.handleEventsComponent();
};

inherit(Component, G3WObject);

const proto = Component.prototype;

proto.init = function(options = {}) {
  this.vueComponent = this.createVueComponent(options.vueComponentObject);
  this._components = options.components || [];
  const service = options.service || noop ;
  const {template, propsData} = options;
  this.setService(service);
  this._service.init ? this._service.init(options): null;
  template && this.setInternalComponentTemplate(template);
  this.setInternalComponent = function() {
    const InternalComponent = Vue.extend(this.vueComponent);
    this.internalComponent = new InternalComponent({
      service: this._service,
      template,
      propsData
    });
    this.internalComponent.state = this.getService().state;
  };
  this.setInternalComponent();
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

proto.closeWhenViewportContentIsOpen = function(){
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

proto.handleEventsComponent = function(){
  const {open, visible} = this.events;
  if (open) {
    const {when="after", cb=()=>{}, guiEvents=[]} = open;
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
  this._components.forEach((component, index) => {
    if (component === Component) {
      this.splice(index, 1);
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
  if (!internalComponent && this.internalComponentClass) this.internalComponent = new this.internalComponentClass;
  else this.internalComponent = internalComponent;
  const {events=[]} = options;
  events.forEach(event => {
    const {name, handler} = event;
    this.internalComponent.$on(name, data => handler && handler(data) || this[`set${capitalize_first_letter(name)}`](data));
  })
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
  this._service && merge(this._service, serviceOptions);
};

proto.extendInternalComponent = function(internalComponentOptions) {
  if (this.vueComponent) {
    Object.entries(internalComponentOptions).forEach(([key, value]) => {
      if (VUECOMPONENTSATTRIBUTES.indexOf(key) > -1) {
        switch (key) {
          case 'methods':
            this.extendInternalComponentMethods(value);
            break;
          case 'components':
            this.extendInternalComponentComponents(value);
            break;
          default:
            merge(this.vueComponent[key], value);
        }
      }
    });
  } else this.vueComponent = internalComponentOptions;
};

proto.extendInternalComponentComponents = function(components) {
  components && merge(this.vueComponent.components, components);
};

proto.extendComponents = function(components) {
  this.extendInternalComponentComponents(components);
};

proto.addComponent = function(component) {
  if (component) this.vueComponent.components[component.key] = component.value;
};

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
  if (template) this.vueComponent.template = template;
};

proto.getInternalTemplate = function() {
  return this.vueComponent.template;
};

proto.destroy = function() {};

proto.click = function(){};

// hook function to show componet
proto.show = function() {};

proto._setOpen = function(bool) {};

proto._setVisible = function() {};

proto._reload = function() {};

proto.mount = function(parent, append) {
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

proto.unmount = function() {
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