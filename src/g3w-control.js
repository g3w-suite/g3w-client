/**
 * @file 
 * @since 3.11.0
 */
import GUI from 'g3w-app';

/**
 * ORIGINAL SOURCE: src/map/controls/interactioncontrol.js@v4.0.0
 */
export default class MapControl extends ol.control.Control {

  /**
   * @param {Object}  options 
   * @param {string}  options.name
   * @param {boolean} options.enabled 
   * @param {string}  options.cursorClass since 3.11.0
   */
  constructor(options = {}) {

    // wrapper for native ol controls
    if (options.ol) {
      super({ element: options.ol.element });
      this._options     = options;
      this._control     = options.ol;
      this.positionCode = options.position || 'tl';
      this.offline      = true;
      this._control.element.classList.add("ol-control-" + this.positionCode);
      return this;
    }

    /** @TODO simplify */
    options.enabled = options.enabled ?? !!options.interactionClass;
    
    options.visible = options.visible ?? true;

    const name = (options.name || '').split(' ').join('-').toLowerCase();

    /** ORIGINAL SOURCE: src/components/MapControlButton.js@v3.10.0 */
    options.element = options.element || (new (Vue.extend({
      template: /* html */ `<div class="ol-${name} ol-unselectable ol-control">
        <button type="button" title="${(options.tipLabel || name).toString()}">
          ${ options.customClass ? '<i class="' + options.customClass + '" aria-hidden="true"></i>' : '' }
          ${ options.label || options.tipLabel || name || '' }
        </button>
      </div>`,
    }))()).$mount().$el;

    super(options);

    this._options        = options;

    /**
     * @since 3.11.0 
     */
    this.cursorClass     = options.cursorClass;

    /**
     * ORIGINAL SOURCE: src/app/g3w-ol/controls/onclickcontrol.js@v3.10.0
     */
    this._originalonlick = null;

    /**
     * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
     *
     * custom "onclick" handler
     */
    this._onclick        = options.onclick; // a method trigger when click on map control button

    /**
     * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
     *
     * @FIXME add description
     */
    this._enabled        = options.enabled;

    /**
     * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
     *
     * @FIXME add description
     */
    this.offline         = options.offline ?? true;

    /**
     * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
     *
     * @FIXME add description
     */
    this.name            = name;

    /**
     * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
     *
     * @FIXME add description
     */
    this.id              = `${this.name}_${(Math.floor(Math.random() * 1000000))}`;

    /**
     * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
     *
     * store eventKey and original havenHandler
     */
    this.eventKeys       = {};

    /**
     * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
     *
     * tl: top-left
     * tr: top-right
     * bl: bottom-left
     * bt: bottom-right
     */
    this.positionCode    = options.position || 'tl';

    /**
     * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
     *
     * @FIXME add description
     */
    this.priority        = options.priority ?? 0;

    /**
     * @FIXME why?
     * 
     * @since 4.0.0 Add click map option
     */
    this.clickmap       = options.clickmap ?? false;

    /**
     * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
     *
     * button click handler
     */
    this.element.querySelector('button').addEventListener('click', e => this._handleClick(e));

    this.setVisible(options.visible);

    /**
     * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
     *
     * @since 3.11.0
     */
    if (this._options.postRender) {
      this._options.postRender.call(this);
    }

    this._toggled                 = false;

    this._interactionClassOptions = options.interactionClassOptions;

    /** @since 3.11.0 */
    if (options.interactionClass) {
      this.initInteraction(options);
    }
  }

  /**
   * @param toggled
   *
   * @since 3.11.0
   */
  setMouseCursor(toggled, className = this.cursorClass) {
    this.getMap().getViewport().classList.toggle(className, toggled);
  }

  initInteraction(options = {}) {

    const {
      visible                 = true,
      enabled                 = true,
      toggled                 = false,
      clickmap                = false,
      interactionClass        = null,
      autountoggle            = false,
      geometryTypes           = [],
      onhover                 = false,
      help                    = null,
      toggledTool,
      interactionClassOptions = {},
      layers                  = [],
      spatialMethod
    } = options;

    /**
     * Project layers dependencies
     * 
     * @since 3.8.0
     */
    this.layers            = layers;

    /**
     * @since 3.8.0
     */
    this.unwatches         = [];

    this._visible          = visible;
    /**
     * Check if interact with a map
     */
    this.clickmap          = clickmap;

    this._interactionClass = interactionClass;

    this._interaction       = null;

    this._autountoggle      = autountoggle;

    /**
     * Array of types geometries
     */
    this._geometryTypes    = geometryTypes;

    this._onhover          = onhover;

    this._help             = help;

    /**
     * Used to show help info button
     */
    this._helpButton;

    /**
     * Used to show toolbutton
     */
    this._toolButton;

    this.toggledTool;

    /**
     * @type { 'intersect' | 'within' }
     */
    this.spatialMethod            = spatialMethod;

    this._interactionClassOptions = interactionClassOptions;

    // in case of toggled true, then ... ?
    if (true === toggled) {
      this.on('setMap', () => this.toggle(toggled));
    }

    // create a help message
    if (this._help) {
      this._createModalHelp();
    }

    // create tool
    if (toggledTool) {
      this.createControlTool(toggledTool);
    }

    // set enabled
    this.setEnable(enabled);

    // handle change of spatial method
    if (this.spatialMethod) {
      const spatialMethod = this.spatialMethod;
      let eventKey = null;
      this.on('toggled', ({ toggled }) => {
        if (true === toggled) {
          eventKey = this.on('change-spatial-method', this.runSpatialQuery);
        } else if (null !== eventKey) {
          ol.Observable.unByKey(eventKey);
          eventKey = null;
          // reset to default
          this.setSpatialMethod(spatialMethod);
          this.clear();
        }
      })
    }

  }

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
   *
   * @returns { boolean } whether is clickmap
   *
   * @since 3.11.0
   */
  isClickMap() {
    return this.clickmap;
  }

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
   *
   * @FIXME add description
   *
   * @since 3.11.0
   */
  isToggled() {
    return this._toggled;
  }

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
   *
   * @FIXME add description
   *
   * @since 3.11.0
   */
  setEventKey({ eventType, eventKey }) {
    this.eventKeys[eventType] = {
      eventKey,
      originalHandler: eventKey.listener,
    };
  }

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
   *
   * Reset the original handler method of control event.
   * 
   * @param { string } type
   *
   * @since 3.11.0
   */
  resetOriginalHandlerEvent(type) {
    if (this.eventKeys?.[type]?.eventKey) {
      ol.Observable.unByKey(this.eventKeys[type].eventKey);
      this.eventKeys[type].eventKey = this.on(type, this.eventKeys[type].originalHandler);
    }
  }

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
   *
   * Override the original handler method of control event.
   * 
   * @param {string} eventType
   * @param {() => {}} handler
   *
   * @since 3.11.0
   */
  overwriteEventHandler({ eventType, handler }) {
    if (this.eventKeys?.[eventType]?.eventKey) {
      ol.Observable.unByKey(this.eventKeys[eventType].eventKey);
      this.eventKeys[eventType].eventKey = this.on(eventType, handler);
    }
  }

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
   *
   * @param pos position code
   *
   * @since 3.11.0
   */
  getPosition(pos) {
    pos = pos || this.positionCode;
    return {
      top:    pos.includes('t'),
      left:   pos.includes('l'),
      bottom: pos.includes('b'),
      right:  pos.includes('r'),
    };
  }

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
   *
   * Handle toggle of map controls
   * 
   * @param e
   *
   * @since 3.11.0
   */
  _handleClick(e) {
    if (this._enabled) {
      this.toggle();
      e.preventDefault();
      this.dispatchEvent('controlclick');
    }
  }

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
   *
   * Called when a control is added ore removed to map
   * 
   * @param {ol.Map | null} map instace to be added (null = remove from map)
   * 
   * @fires setMap event
   *
   * @since 3.11.0
   */
  setMap(map) {

    /** @since 3.11.0 */
    if (this._options.onSetMap) {
      this._options.onSetMap.call(this, { setter: 'before', map });
    }

    if (this._control) {
      this._control.setMap(map);
    } else {
      super.setMap(map);
    }

    if (!this._interaction && this._interactionClass) {
      this._interaction = new this._interactionClass(this._interactionClassOptions);
      map.addInteraction(this._interaction);
      this._interaction.setActive(false);
    }

    if (this._interaction && this.cursorClass) {
      this._interaction.on('change:active', e => this.setMouseCursor(e.target.get(e.key)));
    }

    /** ORIGINAL SOURCE: src/app/g3w-ol/controls/onclickcontrol.js@v3.10.0 */
    if (this._onclick) {
      const buttons = Array.from(this.element.querySelectorAll('button'));
      let loading = false; // whether already clicked (waiting for async "_onclick" method)
      this.element.addEventListener('click', async () => {
        if (!loading) {
          loading = true;
          buttons.forEach(btn => btn.classList.add('g3w-ol-disabled'));
          await this._onclick();
          buttons.forEach(btn => btn.classList.remove('g3w-ol-disabled'));
          loading = false;
        }
      });
    }

    /** @since 3.8.0 */
    this.dispatchEvent({ type: 'setMap', map });

    /** @since 3.11.0 */
    if (this._options.onSetMap) {
      this._options.onSetMap.call(this, { setter: 'after', map });
    }
  }

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
   *
   * Toggle pointer events and `g3w-ol-disabled` class on map control button
   * 
   * @param { Boolean } bool whether the map control button is clickable
   *
   * @since 3.11.0
   */
  setEnable(bool) {
    this.element.querySelector('button')?.classList?.toggle('g3w-ol-disabled', !bool);
    if (!bool && this._interaction) {
      this._interaction.setActive(false);
    }
    this._enabled = bool;
  }

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
   *
   * @FIXME add description
   *
   * @since 3.11.0
   */
  getEnable() {
    return this._enabled;
  }

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
   *
   * @FIXME add description
   *
   * @since 3.11.0
   */
  setVisible(visible = true) {
    this._visible              = visible;
    this.element.style.display = visible ? 'block' : 'none';
  }

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
   *
   * @FIXME add description
   *
   * @since 3.11.0
   */
  isVisible() {
    return this._visible;
  }

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/onclickcontrol.js@v3.10.0
   *
   * @since 3.11.0
   */
  overwriteOnClickEvent(handler) {
    this._originalonlick = this._originalonlick || this._onclick;
    this._onclick        = handler;
  };

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/onclickcontrol.js@v3.10.0
   *
   * @since 3.11.0
   */
  resetOriginalOnClickEvent() {
    this._onclick        = this._originalonlick || this._onclick;
    this._originalonlick = null;
  }

  /**
   * @virtual method need to be implemented by subclasses
   *
   * @since 3.8.0
   */
  onSelectLayer() {}

  /**
   * @virtual method need to be implemented by subclasses
   *
   * @since 3.8.0
   */
  runSpatialQuery() {}

  /**
   * @virtual method need to be implemented by subclasses
   *
   * @since 3.8.0
   */
  clear() {}

  /**
   * @virtual method need to be implemented by subclasses
   *
   * @since 3.8.0
   */
  onAddExternalLayer({ layer, unWatches } = {}) {}

  /**
   * @virtual method need to be implemented by subclasses
   *
   * @since 3.8.0
   */
  onRemoveExternalLayer(layer) {}

  /**
   * @virtual method need to be implemented by subclasses
   *
   * @param layers
   * @returns {boolean}
   *
   * @since 3.8.0
   */
  checkVisibile(layers) {
    return true;
  }

  /**
   * Enable map control dom
   */
  enable() {
    this.element.classList.remove('g3w-disabled');
  }

  disable() {
    this.element.classList.add('g3w-disabled');
  }

  /**
   * @deprecated use `this.on('toggled', ({ toggled }) => {` instead
   *
   * @param { Object }                     toggledTool
   * @param { 'spatialMethod' | 'custom' } toggledTool.type
   * @param { 'toggled' | 'hover' }        toggledTool.how      "toggled" => (show tools when control is toggled); "hover" => (show button tool as info help)
   * @param                                toggledTool.component vue component
   */
  createControlTool(toggledTool = {}) {

    console.warn('[G3W-CLIENT] this.toggledTool is deprecated');

    switch(toggledTool.type) {

      case 'spatialMethod':
        this.toggledTool = {
          template: /*html */ `
            <div style = "width: 100%; padding: 5px;">
              <select ref = "select" style = "width: 100%" :search = "false" v-select2 = "'method'">
                <option v-for = "method in methods">{{ method }}</option>
              </select>
            </div>`,
          data:           () => ({ methods: ['intersects', 'within'], method: this.getSpatialMethod() }),
          watch:          { method: m => this.setSpatialMethod(m) },
          created()       { GUI.toggleUserMessage(false); },
          beforeDestroy() { GUI.toggleUserMessage(true); }
        };
        break;

      case 'custom':
        this.toggledTool = toggledTool.component;
        break;

    }

    /**
     * @TODO check if it is deprecated. It used to show help message for map control
     */
    if ('how' === toggledTool.how && this._onhover) {
      this._toolButton = $(`<span style="display:none" class="tool_mapcontrol_button"><i class="${GUI.getFontClass('tool')}"></i></span>`);
      $(this.element).prepend(this._toolButton);
      this._toolButton.on('click', e => {
        e.stopPropagation();
        this.showToggledTool(true);
      });
      $(this.element).hover(() => this._toggled && this._toolButton.show());
      $(this.element).mouseleave(() => this._toolButton.hide());
    }
  }

  /**
   * @deprecated use `this.on('toggled', ({ toggled }) => {` instead
   */
  showToggledTool(show = true) {
    console.warn('[G3W-CLIENT] this.toggledTool is deprecated');

    if (show) {
      GUI.showUserMessage({
        title:     this.toggledTool.__title,
        type:      'tool',
        iconClass: this.toggledTool.__iconClass,
        closable:  this._toolButton ? true : false,
        hooks:     { body: this.toggledTool },
      });
    } else {
      GUI.closeUserMessage();
    }
  }

  /**
   * Set button status (pressed / not pressed)
   * 
   * @param { Boolean } toggled
   * @param { Object } opts
   */
  toggle(toggled = !this._toggled, opts = {}) {

    opts.parent = opts?.parent ?? false;

    // skip if button is already toggled or un-toggled
    if (toggled === this._toggled ) {
      return;
    }

    this._toggled = toggled;

    if (this.cursorClass) {
      this.setMouseCursor(toggled);
    }

    // toggle other toggleable control
    if (toggled) {
      this.getMap().getControls().forEach(c => {
        if (c.id && c.toggle && (c.id !== this.id) && c.id !== opts.parent) {
          c.toggle(false);
        }
      });
    }

    if (this._interaction) {
      this._interaction.setActive(toggled);
    }

    /** Add or remove g3w-ol-toggled class to control button */
    const btn = this.element.querySelector('button');
    if (btn) {
      btn.classList.toggle('g3w-ol-toggled', toggled);
    }

    /** @TODO Deprecated */
    if (toggled && this._toolButton) {
      this._toolButton.show();
    } else if (!toggled && this._toolButton) {
      this._toolButton.hide();
    }

    //** if not toggled and has a toggle tool (e.g., measure map control) close user message tool  */
    if (this.toggledTool) {
      this.showToggledTool(this._toggled);
    }

    this.dispatchEvent({ type: 'toggled', toggled });

    if (this._options.onToggled) {
      this._options.onToggled.call(this, toggled);
    }

  }

  getGeometryTypes() {
    return this._geometryTypes;
  }

  setGeometryTypes(types) {
    this._geometryTypes = types;
  }

  getInteraction() {
    return this._interaction;
  }

  /**
   * Method to set filter operation intersect or Contains
   */
  setSpatialMethod(method = 'intersects') {
    this.spatialMethod = method;
    this.dispatchEvent({
      type:          'change-spatial-method',
      spatialMethod: this.spatialMethod
    });
  }

  getSpatialMethod() {
    return this.spatialMethod;
  }

  setLayers(layers = []) {
    this.layers = layers;
  }

  /**
   * @returns { ol.control }
   * 
   * @since 3.11.0
   */
  getOlControl() {
    return this._control;
  }

  /**
   * @since 3.11.0
   */
  showHide() {
    if (this.element) {
      this.element.style.display = 'none' === this.element.style.display ? 'block' : 'none';
    }
  }

}

