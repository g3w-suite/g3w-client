/**
 * @file
 * @since 3.10.0
 */
import GUI                          from 'services/gui';
import G3WObject                    from 'core/g3wobject';
import { merge }                    from 'utils/merge';
import { noop }                     from 'utils/noop';
import { capitalize_first_letter }  from 'utils/capitalize_first_letter';
import { resolve }                  from 'utils/resolve';

/** @deprecated */
const _cloneDeep = require('lodash.clonedeep');

/**
 * Component class
 * 
 * ORIGINAL SOURCE src/app/gui/component/component.js@v3.9.3
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
 * @param options.internalComponent since 3.10.0
 * @param options.service since 3.10.0
 */
export default class Component extends G3WObject {

  constructor(options = {}) {

    // BACKOMP v3.x
    if (options.iconConfig) {
      options.iconColor = options.iconConfig.color;
      options.icon      = options.iconConfig.icon;
      delete options.iconConfig;
    }

    // TODO: check why `GUI.getFontClass` is undefined
    options.icon = Vue.prototype.g3wtemplate.getFontClass(options.icon) || options.icon;

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
      events                       = {},
    } = options;

    super();

    this._firstLayout = true;

    /** internal VUE component */
    this.internalComponent = options.internalComponent || null;

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

    this.setService(options.service || this);

    if (options.internalComponent) {
      this.setInternalComponent(options.internalComponent);
    }

    merge(this, options);

    // add events options
    this.events = events;

    this.handleEventsComponent();

    if (options.vueComponentObject) {
      this.init({ vueComponentObject: options.vueComponentObject });
    }
  }

  /**
   * @param { Object } options
   * @param { Array } options.components
   * @param { Object } options.service
   * @param { Function } options.service.init
   * @param options.vueComponentObject
   * @param options.template
   * @param options.propsData
   */
  init(options = {}) {
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
    if (this.events.open) {
      const { when = "after", cb = () => {} } = this.events.open;
      this[`on${when}`]('setOpen', bool => cb(bool));
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
    this._components.forEach((c, i) => {
      if (c === Component) {
        this.splice(i, 1);
        return false;
      }
    })
  }

  setComponents(components) {
    this._components = Array.isArray(components) ? components: [];
  };

  exendComponents(components) {
    _.merge(this._components, components);
  };

  getInternalComponent() {
    return this.internalComponent;
  }

  setInternalComponent(internalComponent, options={}) {
    this.internalComponent = !internalComponent && this.internalComponentClass ? new this.internalComponentClass : internalComponent;
    (options.events || []).forEach(e => this.internalComponent.$on(e.name, data => e.handler && e.handler(data) || this[`set${capitalize_first_letter(e.name)}`](data)));
    if (this._service) {
      this.internalComponent.state = this._service.state;
    }
  }

  createVueComponent(vueObjOptions) {
    return _cloneDeep(vueObjOptions);
  }

  addInternalComponentData(data) {
    _.merge(this.internalComponent, data)
  }

  overwriteServiceMethod(methodName, method) {
    this._service[methodName] = method;
  }

  overwriteServiceMethods(methodsOptions) {
    Object.entries(methodsOptions).forEach(([methodName, method]) => this.overwriteServiceMethod(methodName, method))
  }

  extendService(serviceOptions) {
    if (this._service) {
      merge(this._service, serviceOptions);
    }
  }

  extendInternalComponent(internalComponentOptions) {
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
  }

  extendInternalComponentComponents(components) {
    if (components) {
      merge(this.vueComponent.components, components);
    }
  }

  extendComponents(components) {
    this.extendInternalComponentComponents(components);
  }

  addComponent(component) {
    if (component) {
      this.vueComponent.components[component.key] = component.value;
    }
  }

  /** @TODO check if unusued (invalid call to "forEach.forEach") */
  extendInternalComponentMethods(methods) {
    if (methods) {
      Object.entries(methods).forEach.forEach(([key, value]) => (!(value instanceof Function)) && delete methods[key]);
      merge(this.vueComponent.methods, methods);
    }
  }

  extendInternalComponentComputed(computed) {
    if (computed) {
      Object.entries(computed).forEach(([key, value]) =>  (!(value instanceof Function)) && delete computed[key]);
      merge(this.vueComponent.computed, computed);
    }
  }

  setInternalComponentTemplate(template) {
    if (template) {
      this.vueComponent.template = template;
    }
  }

  getInternalTemplate() {
    return this.vueComponent.template;
  }

  destroy() {}

  click() {};

  // hook function to show componet
  show() {}

  _setOpen(bool) {}

  _setVisible() {}

  _reload() {}

  /**
   * @param { Element | 'string' } parent DOM element
   * @param { boolean } append
   *  
   * @returns jquery promise
   * 
   * @fires internalComponent~ready
   * @fires mount
   */
  mount(parent, append) {
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
  }

  /**
   * @returns jquery promise
   * 
   * @fires unmount
   */
  unmount() {
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
  }

  /**
   * @returns { Element } DOM element
   */
  ismount() {
    return this.internalComponent && this.internalComponent.$el;
  }

  /**
   * @param { number } width 
   * @param { number } height 
   * 
   * @listens internalComponent~resize-component
   * @fires internalComponent~resize-component
   * @fires layout
   */
  layout(width, height) {
    if (this.state.resizable && this._firstLayout) {
      this.internalComponent.$on('resize-component', this.internalComponent.layout);
      this._firstLayout = false;
    }
    this.internalComponent.$nextTick(() => { this.internalComponent.$emit('resize-component', { width, height }); });
    this.emit('layout');
  }

}