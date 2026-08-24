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
    opts.icon              = GUI.getFontClass(opts.icon) ?? opts.icon;

    opts.open              = opts.open        ?? false; 
    opts.mobile            = opts.mobile      ?? true; //show on mobile devices (default true)
    opts.collapsible       = opts.collapsible ?? true; //means that the component can be opened and closed by clicking on the icon in the sidebar
    opts.internalComponent = opts.internalComponent ?? null;
    opts.id                = opts.id ?? Math.random() * 1000;
    /** @type { string } */
    opts.title             = opts.title ?? '';
    
    super({
      setters: [
        'setOpen',
        'setVisible',
        'setLoading',
        'setDisabled',
        'reload',
      ]
    });

    // store the options
    this.opts              = opts;
     
    /** start true mean no changes is done on component layout */
    this._firstLayout      = true;

    /** @type { Array } */
    this._components       = [];

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

    Object.assign(this, opts);

    this.init();
    
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
  init() {
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
    this._components = this._components.filter(c => c !== Component);
  }

  getInternalComponent() {
    return this.internalComponent;
  }

  /**
   * Initialize the internal component, if opts.internalComponent is defined, it will be used, otherwise, if opts.vueComponent is defined, it will be used to create a new Vue component.
   */
  setInternalComponent() {
  
    //bins open event
    if (this.opts.events?.open) {
      const { when = "after", cb = () => {} } = this.opts.events.open;
      this[`on${when}`]('setOpen', bool => cb(bool));
    }

    // if internalComponent is defined, use it
    if (this.opts.internalComponent) {
      this.internalComponent = this.opts.internalComponent;
      (Array.isArray(this.opts.events) ? this.opts.events : [])
        .forEach(e => this.internalComponent.$on(e.name, data => e?.handler?.(data) || this[`set${e.name[0].toUpperCase()}${e.name.slice(1)}`](data)));
    }

    // if vueComponentObject is defined, use it to create a new Vue component
    if (this.opts.vueComponentObject) {
      this.vueComponent = cloneDeep(this.opts.vueComponentObject);
      this._components  = this.opts.components || [];

      this._service     = this._service ?? (() => {});

      if (this._service?.init && this.init !== this._service?.init) {
        this._service.init(this.opts);
      }

      if (this.opts.template) {
        this.vueComponent.template = this.opts.template;
      }
      this.internalComponent = new (Vue.extend(this.vueComponent))({
        service:   this._service,
        template:  this.opts.template,
        propsData: this.opts.propsData
      });
    }

    this.internalComponent.state = this._service.state;
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