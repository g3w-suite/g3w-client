/**
 * @file ORIGINAL SOURCE: src/app/core/g3w-component.js@v3.10.2
 * @since 3.11.0
 */

import Emitter        from 'g3w-emitter';
import { cloneDeep }  from 'utils/cloneDeep';
import GUI            from 'g3w-app';

/**
 * Base class for UI components managed by the application GUI.
 * 
 * @param { Object }  [opts={}]                                component options
 * @param { number }  opts.id                                  component identifier; a random identifier is generated when omitted
 * @param { string }  opts.info                                additional component information
 * @param { string }  [opts.title='']                          component title
 * @param { boolean } [opts.visible=true]                      whether the component is visible
 * @param { boolean } [opts.mobile=true]                       whether to show the component on mobile devices
 * @param { boolean } [opts.open=false]                        whether the component starts open
 * @param { boolean } [opts.collapsible=true]                  whether the component can be opened and closed from the sidebar
 * @param { boolean } [opts.loading=false]                     whether the component is loading
 * @param { boolean } [opts.disabled=false]                    whether the component is disabled
 * @param { boolean } [opts.closewhenshowviewportcontent=true] whether to close when viewport content is shown
 * @param { Object }  opts.internalComponent                   existing Vue component instance (since 3.10.0)
 * @param { Object }  opts.vueComponentObject                  Vue component definition used to create an instance
 * @param { Object }  opts.service                             service exposed to the Vue component (since 3.10.0)
 */
export default class Component extends Emitter {

  #service;

  // BACKOMP for < v4.2
  get state() {
    return this;
  }

  constructor(opts = {}) {

    super({
      setters: ['setOpen']
    });

    // BACKCOMP v3.x
    if (opts.iconConfig) {
      console.warn('[G3W-CLIENT] iconConfig is deprecated');
      console.trace();
      opts.iconColor = opts.iconConfig.color;
      opts.icon      = opts.iconConfig.icon;
      delete opts.iconConfig;
    }

    // store every `opts` into component instance
    Object.assign(this, {
      sizes:                        { width: 0, height: 0 },
      info:                         null,
      open:                         false,
      mobile:                       true,
      collapsible:                  true,
      internalComponent:            null,
      id:                           Math.random() * 1000,
      title: '',
      visible:                      true,
      loading:                      false,
      disabled:                     false,
      closewhenshowviewportcontent: true,
      ...opts,
      // TODO: check why `GUI.getFontClass` is undefined
      icon: GUI.getFontClass?.(opts.icon) ?? opts.icon
    });

    this.#service = this.service || this;

    // create a new Vue component (from object definition)
    if (this.vueComponentObject) {
      const vueComp    = cloneDeep(this.vueComponentObject);
      vueComp.template = this.template || vueComp.template;
      this.internalComponent = new (Vue.extend(vueComp))({
        service:   this.#service,
        template:  this.template,
        propsData: this.propsData
      });
    }

    if (this.internalComponent) {
      this.internalComponent.state = this.#service.state;
    }

  }

  /**
   * @returns { number } the component identifier
   */
  getId() {
    return this.id;
  }

  setId(id) {
    this.id = id;
  }

  /**
   * @returns { boolean } whether the component is open
   */
  getOpen() {
    return this.open;
  }

  /**
   * @returns { boolean } whether the component is visible
   */
  getVisible() {
    return this.visible;
  }

  /**
   * @returns { string } the component title
   */
  getTitle() {
    return this.title;
  }

  /**
   * @param { string } title new component title
   */
  setTitle(title) {
    this.title = title;
  }

  /**
   * @returns { Object } the service associated with the component
   */
  getService() {
    return this.#service;
  }

  /**
   * @param { Object } service service associated with the component
   */
  setService(service) {
    this.#service = service;
  }

  /**
   * @returns { Object|null } the mounted internal Vue component, if any
   */
  getInternalComponent() {
    return this.internalComponent;
  }

  /**
   * @param { boolean } bool whether the component is open
   */
  setOpen(bool) {
    this.open = bool;
  }

  /**
   * @param { boolean } bool whether the component is visible
   */
  setVisible(bool) {
    this.visible = bool;
  }

  /**
   * @param { boolean } [bool=false] whether the component is loading
   */
  setLoading(bool = false) {
    this.loading = bool;
  }

  /**
   * @param { boolean } [bool=false] whether the component is disabled
   */
  setDisabled(bool = false) {
    this.disabled = bool;
  }

  /**
   * Mount the internal Vue component in the target element.
   * 
   * @param { Element|string } parent DOM element or selector used as mount target
   * @param { boolean } [append=false] append the mounted element instead of mounting in place
   *
   * @returns { Promise<boolean> } resolves to true after the component is mounted
   * 
   * @fires ready
   * @fires mount
   */
  async mount(parent, append) {
    if (append) {
      ('string' === typeof parent ? document.querySelector(parent) : parent).append(this.internalComponent.$mount().$el);
    }

    if (!append) {
      this.internalComponent.$mount(parent);
    }

    await this.internalComponent.$nextTick();

    this.emit('ready');
    this.emit('mount');

    return true;
  }

  /**
   * Destroy and remove the internal Vue component.
   *
   * @returns { Promise<void >} resolves after the component has been unmounted
   * 
   * @fires unmount
   */
  async unmount() {
    if (!this.internalComponent) {
      return;
    }
    this.open = false;
    this.internalComponent.$destroy(true); // destroy vue component
    this.internalComponent.$el?.remove();  // remove dom element
    this.internalComponent = null;         // set internal component to null (for GC)
    this.emit('unmount');                  // emit unmount event
  }

}