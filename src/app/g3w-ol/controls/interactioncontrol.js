import { SPATIAL_METHODS } from 'app/constant';
import { VM }              from 'app/eventbus';
import GUI                 from 'services/gui';
import ControlsRegistry    from 'store/map-controls'

const { t }   = require('core/i18n/i18n.service');
const Control = require('g3w-ol/controls/control');

module.exports = class InteractionControl extends Control {

  constructor(options={}) {

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

    options.buttonClickHandler = (e) => this._handleClick(e);

    super(options);

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

  isClickMap() {
    return this.clickmap;
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
          data() {
            this.methods = SPATIAL_METHODS;
            return {
              method
            }
          },
          template: `
            <div style="width: 100%; padding: 5px;">
              <select ref="select" style="width: 100%"  :search="false" v-select2="'method'">
                <option v-for="method in methods">{{method}}</option>
              </select>
            </div>`,
          watch: {
            'method': method => this.setSpatialMethod(method)
          },
          created() {
            GUI.setCloseUserMessageBeforeSetContent(false);
          },
          beforeDestroy() {
            GUI.setCloseUserMessageBeforeSetContent(true);
          }
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

  isToggled() {
    return this._toggled;
  }

  /**
   * Get dom bottom
   * 
   * @returns {JQuery<HTMLElement> | jQuery | HTMLElement}
   */
  getControlBottom() {
    return $(this.element).find('button').first();
  }

  addClassToControlBottom(className='') {
    const controlButton = this.getControlBottom();
    controlButton.addClass(className);
  }

  removeClassToControlBottom(className='') {
    const controlButton = this.getControlBottom();
    controlButton.removeClass(className);
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

  }

  getGeometryTypes() {
    return this._geometryTypes;
  }

  setGeometryTypes(types) {
    this._geometryTypes = types;
  }

  /**
   * @param {ol.Map} map
   * 
   * @fires setMap event
   */
  setMap(map) {

    Control.prototype.setMap.call(this, map);

    if (!this._interaction && this._interactionClass) {
      this._interaction = new this._interactionClass(this._interactionClassOptions);
      map.addInteraction(this._interaction);
      this._interaction.setActive(false);
    }

    /** @since 3.8.0 */
    this.dispatchEvent({ type: 'setMap', map });

  }

  _handleClick(evt) {
    if (this._enabled) {
      this.toggle();
      Control.prototype._handleClick.call(this, evt);
    }
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

}