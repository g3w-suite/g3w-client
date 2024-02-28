/**
 * @file
 * @since 3.10.0
 */
import G3WObject                    from 'core/g3wobject';
import { merge }                    from 'utils/merge';
import { noop }                     from 'utils/noop';
import { capitalize_first_letter }  from 'utils/capitalize_first_letter';
import { resolve }                  from 'utils/resolve';

/** @deprecated */
const _cloneDeep = require('lodash.clonedeep');

const deprecate  = require('util-deprecate');

const çç = (a, b) => undefined !== a ? a : b; // like a ?? (coalesce operator)

/**
 * Component class
 * 
 * ORIGINAL SOURCE src/app/gui/component/component.js@v3.9.3
 * 
 * @param { Object} opts
 * @param { number } opts.id 
 * @param { string } opts.title
 * @param { boolean } opts.visible
 * @param { boolean } opts.open
 * @param { boolean } opts.resizable
 * @param { null | unknown } opts.info
 * @param { boolean } opts.loading
 * @param { boolean } opts.disabled
 * @param { boolean } opts.closewhenshowviewportcontent
 * @param opts.events
 * @param opts.internalComponent since 3.10.0
 * @param opts.service since 3.10.0
 */
export default class Component extends G3WObject {

  constructor(opts = {}) {

    // BACKOMP v3.x
    if (opts.iconConfig) {
      opts.iconColor = opts.iconConfig.color;
      opts.icon      = opts.iconConfig.icon;
      delete opts.iconConfig;
    }

    // TODO: check why `GUI.getFontClass` is undefined
    opts.icon = Vue.prototype.g3wtemplate.getFontClass(opts.icon) || opts.icon;

    super();

    this._firstLayout = true;

    /** internal VUE component */
    this.internalComponent = opts.internalComponent || null;

    /** @type { Array } */
    this._components = [];

    /** @type { string } */
    this.id = opts.id || Math.random() * 1000;

    /** @type { string } */
    this.title = opts.title || '';

    this.state = {
      sizes:                        { width: 0, height:0 },
      info:                         çç(opts.info, null),
      open:                         çç(opts.open, false),
      visible:                      çç(opts.visible, true),
      loading:                      çç(opts.loading, false),
      disabled:                     çç(opts.disabled, false),
      resizable:                    çç(opts.resizable, false),
      closewhenshowviewportcontent: çç(opts.closewhenshowviewportcontent, true),
    };

    this.setters = {

      setOpen(bool) {
        this.state.open = bool;
        if (this._setOpen) {
          this._setOpen(bool);
        }
      },

      setVisible(bool) {
        this.state.visible = bool;
        if (this._setVisible) {
          this._setVisible(bool);
        }
      },

      setLoading(bool=false) {
        this.state.loading = bool;
      },

      setDisabled(bool=false) {
        this.state.disabled = bool;
      },

      reload() {
        if (this._reload) {
          this._reload();
        }
      },

    };

    this.setService(opts.service || this);

    if (opts.internalComponent) {
      this.setInternalComponent(opts.internalComponent);
    }

    merge(this, opts);

    // add events options
    this.events = opts.events || {};

    if (this.events.open) {
      const { when = "after", cb = () => {} } = this.events.open;
      this[`on${when}`]('setOpen', bool => cb(bool));
    }

    if (opts.vueComponentObject) {
      this.init({ vueComponentObject: opts.vueComponentObject });
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
    this.vueComponent = _cloneDeep(options.vueComponentObject);
    this._components  = options.components || [];

    this.setService(options.service || this._service || noop);

    if (this._service.init && this.init !== this._service.init) {
      this._service.init(options);
    }

    if (options.template) {
      this.vueComponent.template = options.template;
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

  /** @FIXME duplicated function definition */
  addComponent(Component) {
    this._components.push(Component);
  }

  /** @FIXME duplicated function definition */
  addComponent(component) {
    if (component) {
      this.vueComponent.components[component.key] = component.value;
    }
  }

  removeComponent(Component) {
    this._components.forEach((c, i) => {
      if (c === Component) {
        this.splice(i, 1);
        return false;
      }
    })
  }

  getInternalComponent() {
    return this.internalComponent;
  }

  setInternalComponent(internalComponent, options={}) {
    this.internalComponent = !internalComponent && this.internalComponentClass ? new this.internalComponentClass : internalComponent;
    (options.events || []).forEach(e => this.internalComponent.$on(e.name, data => e.handler && e.handler(data) || this[`set${capitalize_first_letter(e.name)}`](data)));
    if (this._service && this._service.state) {
      this.internalComponent.state = this._service.state;
    }
  }

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

/**
 * @deprecated since 3.10.0 Will be deleted in 4.x.
 */
Object.assign(Component.prototype, {
  _setOpen:                          noop,
  _setVisible:                       noop,
  _reload:                           noop,
  destroy:                           noop,
  click:                             noop,
  show:                              noop,
  setComponents:                     deprecate(function(c) { this._components = Array.isArray(c) ? c: []; }, '[G3W-CLIENT] Component::setComponents(components) is deprecated'),
  setInternalComponentTemplate:      deprecate(function(t) { t && (this.vueComponent.template = t); }, '[G3W-CLIENT] Component::setInternalComponentTemplate(template) is deprecated'),
  getInternalTemplate:               deprecate(function() { return this.vueComponent.template; }, '[G3W-CLIENT] Component::getInternalTemplate() is deprecated'),
  insertComponentAt:                 deprecate(function(i, c) { this._components.splice(i, 0, c); }, '[G3W-CLIENT] Component::insertComponentAt(index, Component) is deprecated'),
  removeCompomentAt:                 deprecate(function(i) { this._components.splice(i, 1); }, '[G3W-CLIENT] Component::removeCompomentAt(index) is deprecated'),
  exendComponents:                   deprecate(function(c) { _.merge(this._components, c); }, '[G3W-CLIENT] Component::exendComponents(components) is deprecated'),
  addInternalComponentData:          deprecate(function(d) { _.merge(this.internalComponent, d) }, '[G3W-CLIENT] Component::addInternalComponentData(data) is deprecated'),
  handleEventsComponent:             deprecate(function() { this.events.open && this['on' + (this.events.open || 'after')]('setOpen', b => (this.events.open.cb || (() => {}))(b)); }, '[G3W-CLIENT] Component::handleEventsComponent() is deprecated'),
  popComponent:                      deprecate(function() { return this._components.pop(); }, '[G3W-CLIENT] Component::popComponent() is deprecated'),
  overwriteServiceMethod:            deprecate(function(n, m) { this._service[n] = m; }, '[G3W-CLIENT] Component::overwriteServiceMethod(methodName, method) is deprecated'),
  extendInternalComponentMethods:    deprecate(function(m) { m && Object.entries(m).forEach(([k, v]) => (!(v instanceof Function)) && delete m[k]); merge(this.vueComponent.methods, m); }, '[G3W-CLIENT] Component::extendInternalComponentMethods(methods) is deprecated'),
  extendInternalComponentComponents: deprecate(function(c) { c && merge(this.vueComponent.components, c); }, '[G3W-CLIENT] Component::extendInternalComponentComponents(components) is deprecated'),
  extendComponents:                  deprecate(function(c) { this.extendInternalComponentComponents(c); }, '[G3W-CLIENT] Component::extendComponents(components) is deprecated'),
  extendInternalComponentComputed:   deprecate(function(c) { c && Object.entries(c).forEach(([k, v]) =>  (!(v instanceof Function)) && delete c[k]); merge(this.vueComponent.computed, c); }, '[G3W-CLIENT] Component::extendInternalComponentComputed(computed) is deprecated'),
  extendService:                     deprecate(function(o) { this._service && merge(this._service, serviceOptions); }, '[G3W-CLIENT] Component::extendService(serviceOptions) is deprecated'),
  createVueComponent:                deprecate(function(o) { return _cloneDeep(o); }, '[G3W-CLIENT] Component::createVueComponent(vueObjOptions) is deprecated'),
  closeWhenViewportContentIsOpen:    deprecate(function() { return this.getOpen() && this.state.closewhenshowviewportcontent; }, '[G3W-CLIENT] Component::closeWhenViewportContentIsOpen() is deprecated'),
  /** used by the following plugins: "cadastre", "iternet" */
  overwriteServiceMethods:           deprecate(function(o) { Object.entries(o).forEach(([n, m]) => this._service[n] = m) }, '[G3W-CLIENT] Component::overwriteServiceMethods(methodsOptions) is deprecated'),
  /** used by the following plugins: "cadastre" */
  extendInternalComponent:           deprecate(function(o) { this.vueComponent ? Object.entries(o).forEach(([k, v]) => { switch (k) { case 'methods': this.extendInternalComponentMethods(v); break; case 'components': this.extendInternalComponentComponents(v); break; case 'computed':   merge(this.vueComponent[k], v); break; case 'data': merge(this.vueComponent[k], v); break; } }): (this.vueComponent = o); }, '[G3W-CLIENT] Component::extendInternalComponent(internalComponentOptions) is deprecated'),
});