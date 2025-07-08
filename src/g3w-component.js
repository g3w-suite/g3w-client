/**
 * @file ORIGINAL SOURCE: src/app/core/g3w-component.js@v3.10.2
 * @since 3.11.0
 */

import G3WObject      from 'g3w-object';
import { noop }       from 'utils/noop';
import { $promisify } from 'utils/promisify';
import GUI            from 'services/gui';

/** @deprecated */
import _cloneDeep     from 'lodash.clonedeep';
import deprecate      from 'util-deprecate';

function merge(destination, source) {
  for (let key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      destination[key] = source[key];
    }
  }
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

    // BACKCOMP v3.x
    if (opts.iconConfig) {
      console.warn('[G3W-CLIENT] iconConfig is deprecated');
      console.trace();
      opts.iconColor = opts.iconConfig.color;
      opts.icon      = opts.iconConfig.icon;
      delete opts.iconConfig;
    }

    // TODO: check why `GUI.getFontClass` is undefined
    opts.icon = GUI.getFontClass(opts.icon) || opts.icon;

    opts.open        = opts.open        ?? false;
    opts.mobile      = opts.mobile      ?? true;
    opts.collapsible = opts.collapsible ?? true;

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
    this.internalComponent = opts.internalComponent ?? null;

    /** @type { Array } */
    this._components = [];

    /** @type { string } */
    this.id = opts.id ?? Math.random() * 1000;

    /** @type { string } */
    this.title = opts.title ?? '';

    this.state = {
      sizes:                        { width: 0, height:0 },
      info:                         opts.info                         ?? null,
      open:                         opts.open                         ?? false,
      visible:                      opts.visible                      ?? true,
      loading:                      opts.loading                      ?? false,
      disabled:                     opts.disabled                     ?? false,
      resizable:                    opts.resizable                    ?? false,
      closewhenshowviewportcontent: opts.closewhenshowviewportcontent ?? true,
    };

    this.setService(opts.service || this);

    if (opts.internalComponent) {
      this.setInternalComponent(opts.internalComponent);
    }

    merge(this, opts);

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
      .forEach(e => this.internalComponent.$on(e.name, data => e.handler && e.handler(data) || this[`set${e.name[0].toUpperCase()}${e.name.slice(1)}`](data)));
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
  async layout(width, height) {
    if (this.state.resizable && this._firstLayout) {
      this.internalComponent.$on('resize-component', this.internalComponent.layout);
      this._firstLayout = false;
    }
    await this.internalComponent.$nextTick();
    //need to check if internal component exist becouse wehn unmount, internalcomponent is set to nul
    this.internalComponent?.$emit('resize-component', { width, height });
    this.emit('layout');
  }

}

/**
 * @deprecated since 3.10.0 Will be deleted in 4.x.
 */
Object.assign(Component.prototype, {
  destroy:                           noop,
  click:                             noop,
  show:                              noop,
  /** used by the following plugins: "iternet" */
  overwriteServiceMethods:           deprecate(function(o) { Object.entries(o).forEach(([n, m]) => this._service[n] = m) }, '[G3W-CLIENT] Component::overwriteServiceMethods(methodsOptions) is deprecated'),
});