/**
 * @file ORIGINAL SOURCE: src/app/core/g3w-component.js@v3.10.2
 * @since 3.11.0
 */

import Emitter        from 'g3w-emitter';
import { cloneDeep }  from 'utils/cloneDeep';
import GUI            from 'g3w-app';

import deprecate      from 'util-deprecate';

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
export default class Component extends Emitter {

  constructor(opts = {}) {

    // BACKCOMP v3.x
    if (opts.iconConfig) {
      console.warn('[G3W-CLIENT] iconConfig is deprecated');
      console.trace();
      opts.iconColor = opts.iconConfig.color;
      opts.icon      = opts.iconConfig.icon;
      delete opts.iconConfig;
    }

    // Check if opts.icon using `GUI.getFontClass` method is defined as key on FONT_AWESOME_ICONS global constants
    opts.icon        = GUI.getFontClass(opts.icon) ?? opts.icon;

    opts.open        = opts.open        ?? false; 
    opts.mobile      = opts.mobile      ?? true; //show on mobile devices (default true)
    opts.collapsible = opts.collapsible ?? true; //means that the component can be opened and closed by clicking on the icon in the sidebar

    super({
      setters: [
        'setOpen',
        'setVisible',
        'setLoading',
        'setDisabled',
        'reload',
      ]
    });
     
    /** start true mean no changes is done on component layout */
    this._firstLayout      = true;

    /** internal VUE component */
    this.internalComponent = opts.internalComponent ?? null;

    /** @type { Array } */
    this._components       = [];

    /** @type { string } */
    this.id                = opts.id ?? Math.random() * 1000;

    /** @type { string } */
    this.title             = opts.title ?? '';

    /** @type { boolean } */
    this.mobile            = opts.mobile; //show on mobile devices (default true)

    this.state = {
      sizes:                        { width: 0, height: 0 },
      info:                         opts.info                         ?? null,
      open:                         opts.open                         ?? false,
      visible:                      opts.visible                      ?? true,
      loading:                      opts.loading                      ?? false,
      disabled:                     opts.disabled                     ?? false,
      resizable:                    opts.resizable                    ?? false,
      closewhenshowviewportcontent: opts.closewhenshowviewportcontent ?? true,
    };

    this._service = opts.service || this;

    if (opts.internalComponent) {
      this.setInternalComponent(opts.internalComponent);
    }

    Object.assign(this, opts);

    // add events options
    this.events = opts.events ?? {};

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
    this.vueComponent = cloneDeep(opts.vueComponentObject);
    this._components  = opts.components || [];

    this._service     = opts.service ?? this._service ?? (() => {});

    if (this._service?.init && this.init !== this._service?.init) {
      this._service.init(opts);
    }

    if (opts.template) {
      this.vueComponent.template = opts.template;
    }

    this.internalComponent = new (Vue.extend(this.vueComponent))({
      service:   this._service,
      template:  opts.template,
      propsData: opts.propsData
    });

    this.internalComponent.state = this._service?.state;
    
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
    this._components = this._components.filter(c => c !== Component);
  }

  getInternalComponent() {
    return this.internalComponent;
  }

  /**
   * 
   * @param {*} internalComponent  Vue instance 
   * @param {*} opts 
   */
  setInternalComponent(internalComponent, opts = {}) {
    this.internalComponent = internalComponent;
    (opts.events || [])
      .forEach(e => this.internalComponent.$on(e.name, data => e.handler && e.handler(data) || this[`set${e.name[0].toUpperCase()}${e.name.slice(1)}`](data)));
    if (this._service?.state) {
      this.internalComponent.state = this._service.state;
    }
  }

  setOpen(bool) {
    this.state.open = bool;
    this._setOpen?.(bool);
  }

  setVisible(bool) {
    this.state.visible = bool;
    this._setVisible?.(bool);
  }

  setLoading(bool = false) {
    this.state.loading = bool;
  }

  setDisabled(bool = false) {
    this.state.disabled = bool;
  }

  reload() {
    console.warn('[G3W-CLIENT] reloading of components will be discontinued, please update your code as soon as possible', this.getId())
    this._reload?.();
  }

  /**
   * @param { Element | 'string' } parent DOM element
   * @param { boolean } append
   * 
   * @fires ready
   * @fires mount
   */
  async mount(parent, append) {

    if (!this.internalComponent) {
      this.setInternalComponent();
    }

    if (append) {
      ('string' === typeof parent ? document.querySelector(parent) : parent).append(this.internalComponent.$mount().$el);
    }

    if (!append){
      this.internalComponent.$mount(parent);
    }

    await this.internalComponent.$nextTick();

    this.emit('ready');
    this.emit('mount');

    return true;
  }

  /**
   * @fires unmount
   */
  async unmount() {
    if (!this.internalComponent) {
      return;
    }
    if (this.state.resizable) {
      this.internalComponent.$off('resize-component', this.internalComponent.layout);
    }
    this.state.open = false;
    this.internalComponent.$destroy(true); // destroy vue component
    this.internalComponent.$el?.remove();  // remove dom element
    this.internalComponent = null;         // set internal componet to null (for GC)
    this.emit('unmount');                  // emit unmount event
  }

  /**
   * @returns { Element } DOM element
   */
  ismount() {
    return this.internalComponent?.$el;
  }

  /**
   * @param { number } width 
   * @param { number } height 
   * 
   * @listens internalComponent~resize-component
   * @fires internalComponent~resize-component
   * @fires layout
   */
  async layout(width, height) {
    if (this.state.resizable && this._firstLayout & this.internalComponent) {
      this.internalComponent.$on('resize-component', this.internalComponent.layout);
      this._firstLayout = false;
    }
    await this.internalComponent?.$nextTick?.();
    //need to check if internal component exist becouse wehn unmount, internalcomponent is set to nul
    this.internalComponent?.$emit('resize-component', { width, height });
    this.emit('layout');
  }

}