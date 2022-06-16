import utils from 'core/utils/utils';
import G3WObject from 'core/g3wobject';

const VUECOMPONENTSATTRIBUTES = ['methods', 'computed', 'data', 'components'];

// Class Component (Base)
class Component extends G3WObject {
  constructor(options = {}) {
    super({
      setters: {
        setOpen(bool) {
          this.state.open = bool;
          this._setOpen(bool);
        },
        setVisible(bool) {
          this.state.visible = bool;
          this._setVisible(bool);
        },
        setLoading(bool = false) {
          this.state.loading = bool;
        },
        setDisabled(bool = false) {
          this.state.disabled = bool;
        },
        reload() {
          this._reload();
        },
      },
    });
    // internal VUE component
    this.internalComponent = null;
    this._components = [];
    const {
      id = Math.random() * 1000,
      title = '',
      visible = true,
      open = false,
      resizable = false,
      info = null,
      loading = false,
      disabled = false,
      closewhenshowviewportcontent = true,
    } = options;
    this.id = id;
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
        width: 0,
        height: 0,
      },
    };
    // add events options
    this.events = options.events;
    this.events && this.handleEventsComponent();
  }

  init(options = {}) {
    this.vueComponent = this.createVueComponent(options.vueComponentObject);
    this._components = options.components || [];
    const service = options.service || {};
    const { template, propsData } = options;
    this.setService(service);
    this._service.init ? this._service.init(options) : null;
    template && this.setInternalComponentTemplate(template);
    this.setInternalComponent();
  }

  setInternalComponent() {
    const InternalComponent = Vue.extend(this.vueComponent);
    this.internalComponent = new InternalComponent({
      service: this._service,
      template,
      propsData,
    });
    this.internalComponent.state = this.getService().state;
  }

  getId() {
    return this.id;
  }

  setId(id) {
    this.id = id;
  }

  getOpen() {
    return this.state.open;
  }

  closeWhenViewportContentIsOpen() {
    return this.getOpen() && this.state.closewhenshowviewportcontent;
  }

  getVisible() {
    return this.state.visible;
  }

  getTitle() {
    return this.state.title;
  }

  setTitle(title) {
    this.state.title = title;
  }

  getService() {
    return this._service;
  }

  setService(service) {
    this._service = service;
  }

  handleEventsComponent() {
    const { open, visible } = this.events;
    if (open) {
      const { when = 'after', cb = () => {}, guiEvents = [] } = open;
      this[`on${when}`]('setOpen', (bool) => cb(bool));
    }
  }

  insertComponentAt(index, Component) {
    this._components.splice(index, 0, Component);
  }

  removeCompomentAt(index) {
    this._components.splice(index, 1);
  }

  addComponent(Component) {
    this._components.push(Component);
  }

  popComponent() {
    return this._components.pop();
  }

  removeComponent(Component) {
    this._components.forEach((component, index) => {
      if (component === Component) {
        this.splice(index, 1);
        return false;
      }
    });
  }

  setComponents(components) {
    this._components = Array.isArray(components) ? components : [];
  }

  exendComponents(components) {
    _.merge(this._components, components);
  }

  getInternalComponent() {
    return this.internalComponent;
  }

  setInternalComponent(internalComponent, options = {}) {
    if (!internalComponent && this.internalComponentClass) this.internalComponent = new this.internalComponentClass();
    else this.internalComponent = internalComponent;
    const { events = [] } = options;
    events.forEach((event) => {
      const { name, handler } = event;
      this.internalComponent.$on(name, (data) => handler && handler(data) || this[`set${utils.capitalize_first_letter(name)}`](data));
    });
  }

  createVueComponent(vueObjOptions) {
    return _.cloneDeep(vueObjOptions);
  }

  addInternalComponentData(data) {
    _.merge(this.internalComponent, data);
  }

  overwriteServiceMethod(methodName, method) {
    this._service[methodName] = method;
  }

  overwriteServiceMethods(methodsOptions) {
    Object.entries(methodsOptions).forEach(([methodName, method]) => this.overwriteServiceMethod(methodName, method));
  }

  extendService(serviceOptions) {
    this._service && merge(this._service, serviceOptions);
  }

  extendInternalComponent(internalComponentOptions) {
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
  }

  extendInternalComponentComponents(components) {
    components && merge(this.vueComponent.components, components);
  }

  extendComponents(components) {
    this.extendInternalComponentComponents(components);
  }

  addComponent(component) {
    if (component) this.vueComponent.components[component.key] = component.value;
  }

  extendInternalComponentMethods(methods) {
    if (methods) {
      _.forEach(methods, (value, key) => {
        if (!(value instanceof Function)) delete methods[key];
      });
      merge(this.vueComponent.methods, methods);
    }
  }

  extendInternalComponentComputed(computed) {
    if (computed) {
      _.forEach(computed, (value, key) => {
        if (!(value instanceof Function)) delete computed[key];
      });
      merge(this.vueComponent.computed, computed);
    }
  }

  setInternalComponentTemplate(template) {
    if (template) this.vueComponent.template = template;
  }

  getInternalTemplate() {
    return this.vueComponent.template;
  }

  destroy() {}

  click() {}

  // hook function to show componet
  show() {}

  _setOpen(bool) {}

  _setVisible() {}

  _reload() {}
}

export default Component;
