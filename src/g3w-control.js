/**
 * @file 
 * @since 3.11.0
 */
import GUI from 'g3w-app';

/**
 * Create a map control and, optionally, its OpenLayers interaction.
 *
 * When `options.ol` is supplied, the control wraps an existing OpenLayers
 * control and skips creation of the default button.
 *
 * @param { Object }   [options={}]                        control configuration.
 * @param { string }   options.name                        CSS-safe control name. Defaults to `''`.
 * @param { boolean }  options.enabled                     whether the control accepts clicks.
 * @param { boolean }  [options.visible=true]              whether the control is visible.
 * @param { string }   [options.position='tl']             position code: `tl`, `tr`, `bl` or `br`.
 * @param { string }   options.label                       visible button label or HTML content.
 * @param { string }   options.tipLabel                    button tooltip; falls back to `name`.
 * @param { string }   options.customClass                 CSS class for the button icon.
 * @param { Function } options.onclick                     async handler run when the control is clicked.
 * @param { Function } options.postRender                  callback invoked after the control is rendered.
 * @param { Function } options.onSetMap                    callback invoked before and after `setMap`.
 * @param { Function } options.onToggled                   callback invoked with the new toggled state.
 * @param { boolean }  [options.clickmap=false]             whether the control interacts with the map.
 * @param { boolean }  [options.autountoggle=false]         whether the interaction toggles itself off.
 * @param { Array<string> } [options.geometryTypes=[]]     geometry types accepted by the interaction.
 * @param { boolean }  [options.onhover=false]             whether hover behavior is enabled.
 * @param { string }   options.help                        help text displayed for the control.
 * @param { Object }   options.toggledTool                 deprecated tool displayed while toggled.
 * @param { Function } options.interactionClass            OpenLayers interaction constructor.
 * @param { Object }   options.interactionClassOptions     options passed to the interaction.
 * @param { Array }    [options.layers=[]]                 layers used by the interaction.
 * @param { 'intersects'|'within' } options.spatialMethod  spatial query method.
 * @param { string }   options.cursorClass                 CSS class applied to the map cursor when active.
 * @param { boolean }  [options.offline=true]              whether the control is available offline.
 * @param { ol.control.Control } [options.ol]              existing OpenLayers control to wrap.
 */
export default class MapControl extends ol.control.Control {

  constructor(options = {}) {
    // wrapper for native ol controls
    if (options.ol) {
      super({ element: options.ol.element });
      this._options     = options;
      this._control     = options.ol;
      this.positionCode = options.position ?? 'tl';
      this.offline      = true;
      this._control.element.classList.add(`ol-control-${this.positionCode}`);
      return this;
    }

    options.enabled = options.enabled ?? !!options.interactionClass;
    
    options.visible = options.visible ?? true;

    const name      = (options.name ?? '').split(' ').join('-').toLowerCase();

    /** Create the default control button when one was not supplied. */
    options.element = options.element ?? (new (Vue.extend({
      template: /* html */ `<div class="ol-${name} ol-unselectable ol-control">
        <button type="button" title="${(options.tipLabel || name).toString()}">
          ${ options.customClass ? '<i class="' + options.customClass + '" aria-hidden="true"></i>' : '' }
          ${ options.label ?? options.tipLabel ?? name ?? '' }
        </button>
      </div>`,
    }))()).$mount().$el;

    super(options);

    /**
     * @type { Object } normalized constructor options.
     */
    this._options        = options;

    /**
     * @type { string|undefined } CSS class applied to the map cursor.
     * 
     * @since 3.11.0
     */
    this.cursorClass = options.cursorClass;

    /**
     * @type { Function|null } original click handler restored by resetOriginalOnClickEvent().
     */
    this._originalonlick = null;

    /**
     * @type { Function|undefined } custom handler for button clicks.
     */
    this._onclick = options.onclick;

    /**
     * @type {boolean} whether the control currently accepts clicks.
     */
    this._enabled = options.enabled;

    /**
     * @type { boolean } whether the control is available offline.
     */
    this.offline = options.offline ?? true;

    /**
     * @type { string } normalized control name.
     */
    this.name = name;

    /**
     * @type { string } unique identifier used to coordinate toggled controls.
     */
    this.id = `${this.name}_${(Math.floor(Math.random() * 1000000))}`;

    /**
     * @type { Object<string, {eventKey: Object, originalHandler: Function}> } registered event handlers.
     */
    this.eventKeys = {};

    /**
     * @type { 'tl'|'tr'|'bl'|'br' } position code.
     */
    this.positionCode = options.position || 'tl';

    /**
     * @type { number } ordering priority among controls.
     */
    this.priority = options.priority ?? 0;

    /**
     * @type { boolean } whether the control interaction uses the map.
     * 
     * @since 4.0.0
     */
    this.clickmap = options.clickmap ?? false;

    this.element.querySelector('button').addEventListener('click', e => this._handleClick(e));

    this.setVisible(options.visible);

    /** @since 3.11.0 */
    if (this._options.postRender) {
      this._options.postRender.call(this);
    }

    /**
     * @type {boolean} Whether the control button is currently toggled.
     */
    this._toggled = false;

    /**
     * @type { Object } options passed to the interaction constructor.
     */
    this._interactionClassOptions = options.interactionClassOptions;

    /** @since 3.11.0 */
    if (options.interactionClass) {
      this.initInteraction(options);
    }
  }

  /**
   * Toggle the cursor CSS class on the map viewport.
   *
   * @param {boolean} toggled Whether the interaction is active.
   * @param {string} [className=this.cursorClass] CSS class to toggle.
   * 
   * @since 3.11.0
   */
  setMouseCursor(toggled, className = this.cursorClass) {
    this.getMap().getViewport().classList.toggle(className, toggled);
  }

  /**
   * Configure the optional OpenLayers interaction and its layer dependencies.
   *
   * @param { Object }  [options={}]                          interaction configuration.
   * @param { boolean } [options.visible=true]                whether the interaction control is visible.
   * @param { boolean } [options.enabled=true]                whether the interaction is enabled.
   * @param { boolean } [options.toggled=false]               whether to toggle it when attached to a map.
   * @param { boolean } [options.clickmap=false]              whether the interaction uses the map.
   * @param { Function|null } [options.interactionClass=null] interaction constructor.
   * @param { boolean } [options.autountoggle=false]          whether to disable after use.
   * @param { Array<string> } [options.geometryTypes=[]]      accepted geometry types.
   * @param { boolean } [options.onhover=false]               whether hover behavior is enabled.
   * @param { string|null } [options.help=null]               help text associated with the control.
   * @param { Object } [options.toggledTool]                  deprecated auxiliary tool configuration.
   * @param { Object } [options.interactionClassOptions={}]   constructor options for the interaction.
   * @param { Array }  [options.layers=[]]                    layers used by the interaction.
   * @param { 'intersects'|'within' } [options.spatialMethod] spatial query method.
   */
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
     * @type {Array} Layers used by the interaction.
     * 
     * @since 3.8.0
     */
    this.layers = layers;

    /**
     * @type { Array } unwatch callbacks registered by the interaction.
     * 
     * @since 3.8.0
     */
    this.unwatches = [];

    /**
     * @type { boolean } whether the interaction control is visible.
     */
    this._visible = visible;

    /**
     * @type { boolean } whether the interaction uses the map.
     */
    this.clickmap = clickmap;

    /**
     * @type { Function|null } OpenLayers interaction constructor.
     */
    this._interactionClass = interactionClass;

    /**
     * @type { ol.interaction.Interaction|null } instantiated interaction.
     */
    this._interaction = null;

    /**
     * @type { boolean } whether the interaction disables itself after use.
     */
    this._autountoggle = autountoggle;

    /**
     * @type { Array<string> } geometry types accepted by the interaction.
     */
    this._geometryTypes = geometryTypes;

    /**
     * @type { boolean } whether hover behavior is enabled.
     */
    this._onhover = onhover;

    /**
     * @type { string|null } help text associated with the control.
     */
    this._help = help;

    /**
     * @type { HTMLElement|undefined } optional help button element.
     */
    this._helpButton;

    /**
     * @type { HTMLElement|undefined } optional toggled-tool button element.
     */
    this._toolButton;

    /**
     * @type { Object|undefined } deprecated tool shown while the control is toggled.
     */
    this.toggledTool;

    /**
     * @type { 'intersects'|'within'|undefined } spatial query method.
     */
    this.spatialMethod = spatialMethod;

    /**
     * @type { Object } options passed to the interaction constructor.
     */
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
   * Return whether this control uses the map.
   *
   * @returns { boolean } `true` when the control interacts with the map.
   * 
   * @since 3.11.0
   */
  isClickMap() {
    return this.clickmap;
  }

  /**
   * Return whether the control is toggled.
   *
   * @returns { boolean } current toggled state.
   * 
   * @since 3.11.0
   */
  isToggled() {
    return this._toggled;
  }

  /**
   * Store an event key and its original listener for later replacement.
   *
   * @param {{ eventType: string, eventKey: Object }} event event registration data.
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
   * Restore the original listener for a registered control event.
   *
   * @param { string } type event type to restore.
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
   * Replace the listener for a registered control event.
   *
   * @param {{ eventType: string, handler: Function }} event event type and replacement listener.
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
  * Convert a position code into edge flags.
  *
  * @param { string } [pos=this.positionCode] position code containing `t`, `r`, `b` and/or `l`.
  * 
  * @returns {{ top: boolean, left: boolean, bottom: boolean, right: boolean }}
   *
   * @since 3.11.0
   */
  getPosition(pos) {
    pos = pos ?? this.positionCode;
    return {
      top:    pos.includes('t'),
      left:   pos.includes('l'),
      bottom: pos.includes('b'),
      right:  pos.includes('r'),
    };
  }

  /**
   * Handle a click on the control button.
   *
   * @param { Event } e button click event.
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
   * Attach the control to a map or remove it from the current map.
   *
   * @param { ol.Map|null } map map instance, or `null` when removing the control.
   * 
   * @fires setMap
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

    // disable the button while the custom handler is running.
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
   * @param {boolean} bool whether the button is clickable.
   * 
   * @since 3.11.0
   */
  setEnable(bool) {
    this.element.querySelector('button')?.classList?.toggle?.('g3w-ol-disabled', !bool);
    if (!bool && this._interaction) {
      this._interaction.setActive(false);
    }
    this._enabled = bool;
  }

  /**
   * @returns { boolean } whether the control accepts clicks.
   * 
   * @since 3.11.0
   */
  getEnable() {
    return this._enabled;
  }

  /**
   * @param { boolean } [visible=true] whether the control should be displayed.
   * 
   * @since 3.11.0
   */
  setVisible(visible = true) {
    this._visible              = visible;
    this.element.style.display = visible ? 'block' : 'none';
  }

  /**
   * @returns { boolean } whether the control is visible.
   * 
   * @since 3.11.0
   */
  isVisible() {
    return this._visible;
  }

  /**
   * Temporarily replace the custom click handler.
   *
   * @param { Function } handler replacement click handler.
   * 
   * @since 3.11.0
   */
  overwriteOnClickEvent(handler) {
    this._originalonlick = this._originalonlick ?? this._onclick;
    this._onclick        = handler;
  };

  /**
   * Restore the click handler saved by overwriteOnClickEvent().
   */
  resetOriginalOnClickEvent() {
    this._onclick        = this._originalonlick ?? this._onclick;
    this._originalonlick = null;
  }

  /**
   * Hook called when a layer is selected by the control.
   * 
   * @since 3.8.0
   */
  onSelectLayer() {}

  /**
   * Hook that executes the control's spatial query.
   * 
   * @since 3.8.0
   */
  runSpatialQuery() {}

  /**
   * Hook that clears the control's current query state.
   * 
   * @since 3.8.0
   */
  clear() {}

  /**
   * Hook called when an external layer is added.
   * 
   * @since 3.8.0
   */
  onAddExternalLayer({ layer, unWatches } = {}) {}

  /**
   * Hook called when an external layer is removed.
   * 
   * @since 3.8.0
   */
  onRemoveExternalLayer(layer) {}

  /**
   * @param { Array } layers layers to check.
   * 
   * @returns { boolean } whether the control can be used with the supplied layers.
   * 
   * @since 3.8.0
   */
  checkVisibile(layers) {
    return true;
  }

  /**
   * Enable the control's DOM state.
   */
  enable() {
    this.element.classList.remove('g3w-disabled');
  }

  /**
   * Disable the control's DOM state.
   */
  disable() {
    this.element.classList.add('g3w-disabled');
  }

  /**
   * Create the deprecated auxiliary tool shown for a toggled control.
   *
   * @deprecated Use `this.on('toggled', ({ toggled }) => {})` instead.
   * 
   * @param { Object } toggledTool auxiliary tool configuration.
   * @param { 'spatialMethod'|'custom' } toggledTool.type tool type.
   * @param { 'toggled'|'hover' } toggledTool.how when to show the tool.
   * @param { Object } toggledTool.component Vue component for custom tools.
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

    /** Add the legacy hover button when requested. */
    if ('how' === toggledTool.how && this._onhover) {
      this._toolButton               = document.createElement('span');
      this._toolButton.style.display = 'none';
      this._toolButton.className     = 'tool_mapcontrol_button';
      this._toolButton.innerHTML     = '<i class="fas fa-cog"></i>';
      this.element.prepend(this._toolButton);
      this._toolButton.addEventListener('click', e => {
        e.stopPropagation();
        this.showToggledTool(true);
      });
      this.element.addEventListener('mouseover',  () => this._toggled && (this._toolButton.style.display = ''));
      this.element.addEventListener('mouseleave', () => this._toolButton.style.display = 'none');
    }
  }

  /**
   * Show or close the deprecated auxiliary tool.
   *
   * @deprecated Use `this.on('toggled', ({ toggled }) => {})` instead.
   * 
   * @param { boolean } [show=true] whether to show the tool.
   */
  showToggledTool(show = true) {
    console.warn('[G3W-CLIENT] this.toggledTool is deprecated');

    if (show) {
      GUI.showUserMessage({
        title:     this.toggledTool.__title,
        type:      'tool',
        iconClass: this.toggledTool.__iconClass,
        closable:  !!this._toolButton,
        hooks:     { body: this.toggledTool },
      });
    } else {
      GUI.closeUserMessage();
    }
  }

  /**
   * Set the pressed state of the control button.
   *
   * Enabling one control automatically untoggles other controls on the same map,
   * except when their id matches `opts.parent`.
   *
   * @param { boolean } [toggled=!this._toggled] desired toggled state.
   * @param {{ parent?: string|boolean }} [opts={}] toggle coordination options.
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
    this.element.querySelector('button')?.classList?.toggle?.('g3w-ol-toggled', toggled);
    

    if (toggled && this._toolButton) {
      this._toolButton.style.display = '';
    } else if (!toggled && this._toolButton) {
      this._toolButton.style.display = 'none';
    }

    // close user message tool (eg. measure map control) 
    if (this.toggledTool) {
      this.showToggledTool(this._toggled);
    }

    this.dispatchEvent({ type: 'toggled', toggled });

    if (this._options.onToggled) {
      this._options.onToggled.call(this, toggled);
    }

  }

  /**
   * @returns { Array<string> } geometry types accepted by the interaction.
   */
  getGeometryTypes() {
    return this._geometryTypes;
  }

  /**
   * @param { Array<string> } types geometry types accepted by the interaction.
   */
  setGeometryTypes(types) {
    this._geometryTypes = types;
  }

  /**
   * @returns { ol.interaction.Interaction|null } active OpenLayers interaction.
   */
  getInteraction() {
    return this._interaction;
  }

  /**
   * @param {'intersects'|'within'} [method='intersects'] spatial filter operation.
   */
  setSpatialMethod(method = 'intersects') {
    this.spatialMethod = method;
    this.dispatchEvent({
      type:          'change-spatial-method',
      spatialMethod: this.spatialMethod
    });
  }

  /**
   * @returns { 'intersects'|'within'|undefined } current spatial filter operation.
   */
  getSpatialMethod() {
    return this.spatialMethod;
  }

  /**
   * @param { Array } [layers=[]] layers used by the interaction.
   */
  setLayers(layers = []) {
    this.layers = layers;
  }

  /**
   * @returns { ol.control.Control|undefined } wrapped OpenLayers control, if any.
   * 
   * @since 3.11.0
   */
  getOlControl() {
    return this._control;
  }

  /**
   * Toggle the visibility of the control element.
   *
   * @since 3.11.0
   */
  showHide() {
    if (this.element) {
      this.element.style.display = 'none' === this.element.style.display ? 'block' : 'none';
    }
  }

}

