/**
 * @file
 * @since 3.10.0
 */
import G3WObject                    from 'core/g3wobject';
import { merge }                    from 'utils/merge';
import { noop }                     from 'utils/noop';
import { $promisify }               from 'utils/promisify';
import GUI                          from 'services/gui';

/** @deprecated */
const _cloneDeep = require('lodash.clonedeep');

const deprecate  = require('util-deprecate');

const çç = (a, b) => undefined !== a ? a : b; // like a ?? (coalesce operator)

function capitalize_first_letter(string) {
  return `${string[0].toUpperCase()}${string.slice(1)}`;
}

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
    opts.icon = GUI.getFontClass(opts.icon) || opts.icon;

    opts.open        = çç(opts.open, false);
    opts.mobile      = çç(opts.mobile, true);
    opts.collapsible = çç(opts.collapsible, true);

    super({
      setters: {

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

        setLoading(bool = false) {
          this.state.loading = bool;
        },

        setDisabled(bool = false) {
          this.state.disabled = bool;
        },

        reload() {
          console.warn('[G3W-CLIENT] reloading of components will be discontinued, please update your code as soon as possible', this.getId())
          if (this._reload) {
            this._reload();
          }
        },
      }

    });

    this._firstLayout = true;

    /** internal VUE component */
    this.internalComponent = çç(opts.internalComponent, null);

    /** @type { Array } */
    this._components = [];

    /** @type { string } */
    this.id = çç(opts.id, Math.random() * 1000);

    /** @type { string } */
    this.title = çç(opts.title, '');

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

    this.setService(opts.service || this);

    if (opts.internalComponent) {
      this.setInternalComponent(opts.internalComponent);
    }

    merge(this, opts);

    // add events options
    this.events = çç(opts.events, {});

    if (this.events.open) {
      const { when = "after", cb = () => {} } = this.events.open;
      this[`on${when}`]('setOpen', bool => cb(bool));
    }

    if (opts.vueComponentObject) {
      this.init(opts);
    }
  }

  /**
   * @param { Object } opts
   * @param { Array } opts.components
   * @param { Object } opts.service
   * @param { Function } opts.service.init
   * @param opts.vueComponentObject
   * @param opts.template
   * @param opts.propsData
   */
  init(opts = {}) {
    this.vueComponent = _cloneDeep(opts.vueComponentObject);
    this._components  = opts.components || [];

    this.setService(opts.service || this._service || noop);

    if (this._service.init && this.init !== this._service.init) {
      this._service.init(opts);
    }

    if (opts.template) {
      this.vueComponent.template = opts.template;
    }

    this.setInternalComponent = function() {
      this.internalComponent = new (Vue.extend(this.vueComponent))({
        service: this._service,
        template: opts.template,
        propsData: opts.propsData
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
  addComponent(Component) {
    this._components.push(Component);
  }

  removeComponent(Component) {
    this._components.find((c, i) => {
      if (c === Component) {
        this.splice(i, 1);
        return true;
      }
    })
  }

  getInternalComponent() {
    return this.internalComponent;
  }

  setInternalComponent(internalComponent, options={}) {
    this.internalComponent = undefined === internalComponent && this.internalComponentClass ? new this.internalComponentClass : internalComponent;
    (options.events || [])
      .forEach(e => this.internalComponent.$on(e.name, data => e.handler && e.handler(data) || this[`set${capitalize_first_letter(e.name)}`](data)));
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
   * @fires mount event
   */
  mount(parent, append) {
    return $promisify(new Promise((resolve) => {
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
        resolve(true);
      });

      // emit mount event
      this.emit('mount');
    }))
  }

  /**
   * @returns jquery promise
   * 
   * @fires unmount
   */
  unmount() {
    return $promisify(async () => {
      if (!this.internalComponent) {
        return;
      }
      if (this.state.resizable) {
        this.internalComponent.$off('resize-component', this.internalComponent.layout);
      }
      this.state.open = false;
      this.internalComponent.$destroy(true);  // destroy vue component
      $(this.internalComponent.$el).remove(); // remove dom element
      this.internalComponent = null;          // set internal componet to null (for GC)
      this.emit('unmount');                   // emit unmount event
    })
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