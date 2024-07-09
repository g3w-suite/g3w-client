import { SPATIAL_METHODS } from 'app/constant';
import { VM }              from 'app/eventbus';
import GUI                 from 'services/gui';
import ControlsRegistry    from 'store/map-controls'
import MapControlButton    from 'components/MapControlButton';

const { t }   = require('core/i18n/i18n.service');

export class InteractionControl extends ol.control.Control {

  /**
   * @param {Object}  options 
   * @param {string}  options.name
   * @param {boolean} options.enabled 
   */
  constructor(options = {}) {
    // wrapper for native ol controls
    if (options.ol) {
      super({ element: options.ol.element });
      this._options     = options;
      this._control     = options.ol;
      this.positionCode = options.position || 'tl';
      $(this._control.element).addClass("ol-control-" + this.positionCode);
      this.offline = true;
      return this;
    }

    /** @TODO simplify */
    options.enabled = undefined !== options.enabled ? options.enabled : !!options.interactionClass;
    
    options.visible = undefined !== options.visible ? options.visible : true;

    const name = (options.name || '').split(' ').join('-').toLowerCase();

    if (!options.element) {
      options.element = (new (Vue.extend(MapControlButton({
        className:   "ol-" + name,
        customClass: options.customClass,
        tipLabel:    options.tipLabel || name,
        label:       options.label    || '',
      })))()).$mount().$el;
    }

    super(options);

    this._options = options;

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
    this._enabled = options.enabled;

    /**
     * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
     *
     * @FIXME add description
     */
    this.offline = undefined !== options.offline ? options.offline : true;

    /**
     * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
     *
     * @FIXME add description
     */
    this.name = name;

    /**
     * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
     *
     * @FIXME add description
     */
    this.id = this.name + '_' + (Math.floor(Math.random() * 1000000));

    /**
     * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
     *
     * store eventKey and original havenHandler
     */
    this.eventKeys = {};

    /**
     * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
     *
     * tl: top-left
     * tr: top-right
     * bl: bottom-left
     * bt: bottom-right
     */
    this.positionCode = options.position || 'tl';

    /**
     * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
     *
     * @FIXME add description
     */
    this.priority = options.priority || 0;

    /**
     * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
     *
     * button click handler
     */
    $(options.element).on('click', e => this._handleClick(e));

    this.setVisible(options.visible);

    this._postRender();

    /** @since 3.11.0 */
    if (options.interactionClass) {
      this.initInteraction(options);
    }
  }

  initInteraction(options) {

    const {
      visible=true,
      enabled=true,
      toggled=false,
      clickmap=false,
      interactionClass=null,
      autountoggle=false,
      geometryTypes=[],
      onhover=false,
      help=null,
      toggledTool,
      interactionClassOptions={},
      layers=[],
      spatialMethod
    } = options;

    /**
     * Project layers dependencies
     * 
     * @since 3.8.0
     */
    this.layers = layers;

    /**
     * @since 3.8.0
     */
    this.unwatches = [];

    this.listenLayersVisibilityChange();

    this._visible = visible;

    this._toggled = false;

    /**
     * Check if interact with map
     */
    this.clickmap = clickmap;

    this._interactionClass = interactionClass;

    this._interaction = null;

    this._autountoggle = autountoggle;

    /**
     * Array of types geometries
     */
    this._geometryTypes = geometryTypes;

    this._onhover = onhover;

    this._help = help;

    /**
     * Used to show help info button
     */
    this._helpButton;

    /**
     * Used to show toolbutton
     */
    this._toolButton;

    /**
     * @type { 'intersect' | 'within' }
     */
    this.spatialMethod = spatialMethod;

    this.toggledTool;

    this._interactionClassOptions = interactionClassOptions;

    // in case of toggled true, then ... ?
    if (true === toggled) {
      this.on('setMap', () => this.toggle(toggled));
    }

    // create an help message
    if (this._help) {
      this._createModalHelp();
    }

    // create tool
    if (toggledTool) {
      this.createControlTool(toggledTool);
    }

    // set enabled
    this.setEnable(enabled);

    // check if spatial method is set
    if (this.spatialMethod) {
      this.handleChangeSpatialMethod(this.spatialMethod);
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
  setEventKey({ eventType, eventKey }){
    this.eventKeys[eventType] = {
      eventKey,
      originalHandler: eventKey.listener
    };
  }

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
   *
   * Reset original handler method of control event.
   * 
   * @param { string } eventType
   *
   * @since 3.11.0
   */
  resetOriginalHandlerEvent(eventType) {
    if (this.eventKeys[eventType] && this.eventKeys[eventType].eventKey) {
      ol.Observable.unByKey(this.eventKeys[eventType].eventKey);
      this.eventKeys[eventType].eventKey = this.on(eventType, this.eventKeys[eventType].originalHandler);
    }
  }

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
   *
   * Override original handler method of control event.
   * 
   * @param {string} eventType
   * @param {() => {}} handler
   *
   * @since 3.11.0
   */
  overwriteEventHandler({eventType, handler}) {
    if (this.eventKeys[eventType] && this.eventKeys[eventType].eventKey) {
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
   * @param event
   *
   * @since 3.11.0
   */
  _handleClick(event) {

    if (this._interactionClass && this._enabled) {
      this.toggle();
    }

    event.preventDefault();
    const map = this.getMap();

    let resetControl = null;

    // remove all the other, eventually toggled, interactioncontrols
    const controls = map.getControls();

    this._toggled && controls.forEach(control => {
      if (control.id && control.toggle && (control.id !== this.id)) {
        control.toggle(false);
        if (control.name === 'reset') {
          resetControl = control;
        }
      }
    });

    if (!this._toggled && resetControl) {
      resetControl.toggle(true);
    }

    this.dispatchEvent('controlclick');
  }

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
   *
   * shift control's position
   *
   * @since 3.11.0
   */
  shiftPosition(position) {
    $(this.element).css(hWhere, position+'px');
  }

  /**
   * ORIGINAL SOURCE: src/app/gui/map/mapservice.js#3152@v3.10.0
   *
   * layout handler
   *
   * @since 3.11.0
   */
  layout(map) {
    const previusControls = $(map.getViewport()).find(`.ol-control-${this.positionCode}`);
    if (previusControls.length) {
      const position     =  this.getPosition();
      let previusControl = previusControls.last();
      const offset       = position.left ? previusControl.position().left : previusControl.position().right;
      const hWhere       = position.left ? 'left' : 'right';
      const hOffset      = $(this.element).position()[hWhere] + offset + previusControl[0].offsetWidth + 2;
      $(this.element).css(hWhere, hOffset+'px');
    }
  }

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
   *
   * @virtual change layout of controls
   *
   * @since 3.11.0
   */
  changelayout(map) {}

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

    // update GUI
    this.layout(map);

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

    /** ORIGINAL SOURCE: src/app/g3w-ol/controls/onclickcontrol.js@v3.10.0 */
    if (this._onclick) {
      const btn = $(this.element).children('button');
      let loading = false; // whether already clicked (waiting for async "_onclick" method)
      $(this.element).on('click', async () => {
        if (!loading) {
          loading = true;
          btn.addClass('g3w-ol-disabled');
          await this._onclick();
          btn.removeClass('g3w-ol-disabled');
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
   * @FIXME add description
   *
   * @since 3.11.0
   */
  showControl() {
    $(this.element).show();
  }

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
   *
   * Hide control and move all controls that sit on his right position
   *
   * @since 3.11.0
   */
  hideControl() {
    let position = $(this.element).position().left;
    let controlWidth = $(this.element).outerWidth();
    let newPosition = position;
    const controls = $(this.element).siblings('.ol-control-tl');
    controls.each(function() {
      if ($(this).position().left > position) {
        newPosition = $(this).position().left;
        if (controlWidth > $(this).outerWidth()) {
          position = position + (controlWidth - $(this).outerWidth())
        }
        $(this).css('left', position+'px');
        position = newPosition;
        controlWidth = $(this).outerWidth();
      }
    });
    $(this.element).hide();
  }

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
   *
   * Toggle pointer events and `g3w-ol-disabled` class on map control button
   * 
   * @param {boolean} enabled wheter the map control button is clickable
   *
   * @since 3.11.0
   */
  setEnable(enabled) {
    $(this.element).find('button').first().toggleClass('g3w-ol-disabled', !enabled);
    if(!enabled && this._interaction) {
      this._interaction.setActive(false);
    }
    this._enabled = enabled;
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
  setVisible(visible=true) {
    this._visible = visible;
    $(this.element)[visible ? 'show': 'hide']();
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
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/control.js@v3.10.0
   *
   * @virtual
   *
   * @since 3.11.0
   */
  _postRender() {
    if (this._options.postRender) {
      this._options.postRender.call(this);
    }
  }

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/onclickcontrol.js@v3.10.0
   *
   * @since 3.11.0
   */
  overwriteOnClickEvent(clickHandler){
    this._originalonlick = this._originalonlick || this._onclick;
    this._onclick        = clickHandler;
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
  onAddExternalLayer({layer, unWatches}={}) {}

  /**
   * @virtual method need to be implemented by subclasses
   *
   * @since 3.8.0
   */
  onRemoveExternalLayer(layer) {}

  /**
   * @virtual method need to be implemented by subclasses
   *
   * @since 3.8.0
   */
  handleSelectedLayer(event) {}

  /**
   * @virtual method need to be implemented by subclasses
   * 
   * @param {{ type: {string}, data: any}} layer event
   * 
   * @since 3.8.0
   */
  handleExternalSelectedLayer(layer) {}

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
   * @virtual method need to be implemented by subclasses
   *
   * @since v3.8.0
   */
  listenLayersVisibilityChange() {}

  /**
   * @virtual method need to be implemented by subclasses
   *
   * @since 3.8.0
   */
  change(layers=[]) {
    this.layers = layers;
    const visible = this.checkVisibile(layers);
    this.setVisible(visible);
    this.setEnable(false);
    this.listenLayersVisibilityChange();
  }

  /**
   * Enable map control dom
   */
  enable() {
    $(this.element).removeClass('g3w-disabled');
  }

  disable() {
    $(this.element).addClass('g3w-disabled');
  }

  /**
   * @param {{ type: {'spatialMethod' | 'custom'}, component: unknown, how: {'toggled' | 'hover'} }} toggledTool 
   */
  createControlTool(toggledTool={}) {
    /**
     * how can be {
     *  'toggled'(default) => show tools when control is toggled
     *  'hover' =>  (show button tool as info help)
     * }
     */
    const {type, component, how="toggled"} = toggledTool;
    switch(type) {
      case 'spatialMethod':
        const method = this.getSpatialMethod();
        this.toggledTool = {
          template: `
            <div style="width: 100%; padding: 5px;">
              <select ref="select" style="width: 100%"  :search="false" v-select2="'method'">
                <option v-for="method in methods">{{method}}</option>
              </select>
            </div>`,
          data()          { this.methods = SPATIAL_METHODS; return { method }; },
          watch:          { 'method': method => this.setSpatialMethod(method) },
          created()       { GUI.setCloseUserMessageBeforeSetContent(false); },
          beforeDestroy() { GUI.setCloseUserMessageBeforeSetContent(true); }
        };
        break;
      case 'custom':
        this.toggledTool = component;
        break;
      // if we want to create a button (as info on hover)
    }
    switch (how) {
      case 'hover':
        this._createToolOnHoverButton();
        break;
    }
  }

  _createToolOnHoverButton() {
    if (this._onhover) {
      this._toolButton = $(`<span style="display:none" class="tool_mapcontrol_button"><i class="${GUI.getFontClass('tool')}"></i></span>`);
      $(this.element).prepend(this._toolButton);
      this._toolButton.on('click', event => {
        event.stopPropagation();
        this.showToggledTool(true);
      });
      $(this.element).hover(() => this._toggled && this._toolButton.show());
      $(this.element).mouseleave(() => this._toolButton.hide());
    }
  }

  showToggledTool(show=true) {
    if (show) {
      GUI.showUserMessage({
        title: '',
        type: 'tool',
        size: 'small',
        closable: this._toolButton ? true : false,
        hooks: {
          body: this.toggledTool
        }
      });
    } else GUI.closeUserMessage();
  }

  /**
   * Show help message
   */
  _showModalHelp() {
    GUI.showModalDialog({
      title: t(this._help.title),
      message: t(this._help.message),
    });
  }

  /**
   * Create modal help
   */
  _createModalHelp() {
    if (this._onhover) {
      this._helpButton = $('<span style="display:none" class="info_mapcontrol_button">i</span>');
      $(this.element).prepend(this._helpButton);
      this._helpButton.on('click', event => {
        event.stopPropagation();
        this._showModalHelp();
      });
      $(this.element).hover(() => this._helpButton.show());
      $(this.element).mouseleave(() => this._helpButton.hide());
    }
  }

  getGeometryTypes() {
    return this._geometryTypes;
  };

  /**
   * Get dom bottom
   * 
   * @returns {JQuery<HTMLElement> | jQuery | HTMLElement}
   */
  getControlBottom() {
    return $(this.element).find('button').first();
  }

  addClassToControlBottom(className='') {
    this.getControlBottom().addClass(className);
  }

  removeClassToControlBottom(className='') {
    this.getControlBottom().removeClass(className);
  }

  /**
   * Set button status (pressed / not pressed)
   * 
   * @param {boolean} [toggled]
   * 
   * @fires toggled event
   */
  toggle(toggled = !this._toggled) {

    // skip if button is already toggled or un-toggled
    if (this._toggled === toggled) {
      return;
    }

    this._toggled = toggled;

    // TODO: simplify this by removing all that short circuiting logic
    if (toggled) {
      this._interaction && this._interaction.setActive(true);
      this.addClassToControlBottom('g3w-ol-toggled');
      this._toolButton && this._toolButton.show();
    } else {
      this._help && this._helpButton.hide();
      this._interaction && this._interaction.setActive(false);
      this.removeClassToControlBottom('g3w-ol-toggled');
      this._toolButton && this._toolButton.hide();
      this.toggledTool && this.showToggledTool(false);
    }

    if (undefined === this._toolButton && this.toggledTool) {
      this.showToggledTool(this._toggled);
    }

    this.dispatchEvent({ type: 'toggled', toggled });

    if (this._options.onToggled) {
      this._options.onToggled.call(this);
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
  setSpatialMethod(method='intersects') {
    this.spatialMethod = method;
    this.dispatchEvent({
      type: 'change-spatial-method',
      spatialMethod: this.spatialMethod
    });
  }

  getSpatialMethod() {
    return this.spatialMethod;
  }

  setLayers(layers=[]) {
    this.layers = layers;
  }

  /**
   * @param { unknown | null } layer
   *
   * @since 3.8.0
   */
  setSelectedLayer(layer) {
    ControlsRegistry.setSelectedLayer(layer);
  }

  /**
   * @since 3.8.0
   */
  getSelectedLayer() {
    return ControlsRegistry.getSelectedLayer();
  }

  /**
   * @since 3.8.0
   */
  getExternalLayers() {
    return ControlsRegistry.getExternalLayers();
  }

  /**
   * @param { 'intersects' | 'within' } spatialMethod
   * 
   * @listens change-spatial-method
   * 
   * @since 3.8.0
   */
  handleChangeSpatialMethod(spatialMethod) {
    let eventKey = null;

    const unlistenSpatialMethodChange = () => {
      ol.Observable.unByKey(eventKey);
      eventKey = null;
    };

    this.on('toggled', ({toggled}) => {
      if (true === toggled) {
        eventKey = this.on('change-spatial-method', this.runSpatialQuery);
      } else if (null !== eventKey) {
        unlistenSpatialMethodChange();
        // reset to default
        this.setSpatialMethod(spatialMethod);
        this.clear();
      }
    })
  }

  /**
   * @since 3.8.0
   */
  watchLayer(expOrFn, callback) {
    return VM.$watch(expOrFn, callback)
  }

  /**
   * @returns {boolean}
   *
   * @since 3.8.0
   */
  isSelectedLayerVisible() {
    return (
      'function' === typeof this.getSelectedLayer().isVisible
        ? this.getSelectedLayer().isVisible()                 // in case of a project project
        : this.getSelectedLayer().visible                     // in case of external layer
    )
  }

  /**
   * @returns {boolean} whether at least one of stored `this.layers` is visible
   *
   * @since 3.8.0
   */
  hasVisibleProjectLayer() {
    return !!((this.layers.length > 0) && this.layers.find(layer => layer.isVisible()));
  }

  /**
   * @returns {boolean} whether at least one of stored `this.getExternalLayers()` is visible
   *
   * @since 3.8.0
   */
  hasVisibleExternalLayer() {
    return !!(this.getExternalLayers().find(layer => layer !== this.layer && true === layer.visible));
  }

  /**
   * @returns {boolean} whether at least one of stored `this.layers` or `this.getExternalLayers()` is visible
   * 
   * @since 3.8.0
   */
  hasVisibleLayers() {
    return !!(this.hasVisibleProjectLayer() || this.hasVisibleExternalLayer());
  }

  /**
   * @returns {boolean} whether selectedLayer is not external
   * 
   * @since 3.8.0
   */
  addExternalLayerToResult() {
    return (
      null === this.getSelectedLayer() ||
      undefined !== this.getExternalLayers().find(layer => layer === this.getSelectedLayer())
    );
  }

  /**
   * @returns {boolean}
   * 
   * @since 3.8.0
   */
  isExternalLayerSelected() {
    return (
      null !== this.getSelectedLayer() &&
      undefined !== this.getExternalLayers().find(layer => layer === this.getSelectedLayer())
    )
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
      $(this.element).toggle();
    }
  }

}