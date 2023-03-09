import { SPATIALMETHODS } from 'g3w-ol/constants';
import GUI from 'services/gui';

const { t } = require('core/i18n/i18n.service');
const Control = require('g3w-ol/controls/control');

const InteractionControl = function(options={}) {

  const {
    visible=true,
    enabled=true,
    toggled=false,
    clickmap=false,
    interactionClass=null,
    autountoggle=false,
    geometryTypes=[],
    onSelectlayer,
    onhover=false,
    help=null,
    toggledTool,
    interactionClassOptions={},
    spatialMethod
  } = options;

  this._visible = visible;
  this._toggled = false;
  this.clickmap = clickmap; // check if interact with map
  this._interactionClass = interactionClass;
  this._interaction = null;
  this._autountoggle = autountoggle;
  this._geometryTypes = geometryTypes; // array of types geometries
  this.onSelectLayer = onSelectlayer;
  this._onhover = onhover;
  this._help = help;
  this._helpButton; // used to show help info button
  this._toolButton; // used to show toolbutton
  //spatial method (intersect, within)
  this.spatialMethod = spatialMethod;
  this.toggledTool;
  this._interactionClassOptions = interactionClassOptions;

  options.buttonClickHandler = InteractionControl.prototype._handleClick.bind(this);

  Control.call(this, options);

  /**
   * Store current selected layer
   *
   * @since 3.8.0
   */
  this.selectedLayer = null;

  if (true === toggled) {
    // in case of toggled true
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

  /**
   * @since 3.8.0
   * Here put method or logic that are done just one time
   */
  if (false === InteractionControl.instanced) {
    this._handleExternalLayers();
    InteractionControl.instanced = true;
  }
};

ol.inherits(InteractionControl, Control);

/**
 * Classe property
 * @type {boolean}
 */
InteractionControl.instanced = false;

const proto = InteractionControl.prototype;

/**
 * Class property
 * @type {boolean}
 */
InteractionControl.instanced = false;

/**
 * @param { unknown | null } layer
 *
 * @since 3.8.0
 */
proto.setSelectedLayer = function(layer) {
  this.selectedLayer = layer;
};

/**
 * @virtual method need to be implemented by subclasses
 *
 * @since 3.8.0
 */
proto.change = function(layers=[]){};

/**
 * @virtual method need to be implemented by subclasses
 *
 * @since 3.8.0
 */
proto.runSpatialQuery = function(){};

/**
 * @virtual method need to be implemented by subclasses
 *
 * @since 3.8.0
 */
proto.clear = function(){};

/**
 * @virtual method need to be implemented by subclasses
 *
 * @since 3.8.0
 */
proto.handleAddExternalLayer = function(layer, unWatches) {};

/**
 * @virtual method need to be implemented by subclasses
 *
 * @since 3.8.0
 */
proto.handleRemoveExternalLayer = function(layer){};

proto.isClickMap = function(){
  return this.clickmap;
};

/**
 * Enable map control dom
 */
proto.enable = function(){
  $(this.element).removeClass('g3w-disabled');
};

proto.disable = function(){
  $(this.element).addClass('g3w-disabled');
};

proto.createControlTool = function(toggledTool={}){
  /**
   * how can be {
   *  'toggled'(default) => show tools when control is toggled
   *  'hover' =>  (show button tool as info help)
   * }
   */
  const {type, component, how="toggled"} = toggledTool;
  switch(type){
    case 'spatialMethod':
      const method = this.getSpatialMethod();
      this.toggledTool = {
        data() {
          this.methods = SPATIALMETHODS;
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
        created(){
          GUI.setCloseUserMessageBeforeSetContent(false);
        },
        beforeDestroy(){
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
};

proto._createToolOnHoverButton = function(){
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
};

proto.showToggledTool = function(show=true){
  if (show){
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
};

//show help message
proto._showModalHelp = function() {
  GUI.showModalDialog({
    title: t(this._help.title),
    message: t(this._help.message),
  });
};

// create modal help
proto._createModalHelp = function() {
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
};

proto.getGeometryTypes = function() {
  return this._geometryTypes;
};

proto.isToggled = function() {
  return this._toggled;
};

/**
 *
 * Get dom bottom
 * @returns {JQuery<HTMLElement> | jQuery | HTMLElement}
 */
proto.getControlBottom = function(){
  return $(this.element).find('button').first();
};

proto.addClassToControlBottom = function(className=''){
  const controlButton = this.getControlBottom();
  controlButton.addClass(className);
};

proto.removeClassToControlBottom = function(className=''){
  const controlButton = this.getControlBottom();
  controlButton.removeClass(className);
};

/**
 * Set button status (pressed / not pressed)
 * 
 * @param {boolean} [toggled]
 * 
 * @fires toggled event
 */
proto.toggle = function(toggled = !this._toggled) {

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

};

proto.getGeometryTypes = function() {
  return this._geometryTypes;
};

proto.setGeometryTypes = function(types) {
  this._geometryTypes = types;
};

/**
 * @param {ol.Map} map 
 */
proto.setMap = function(map) {

  Control.prototype.setMap.call(this, map);

  if (!this._interaction && this._interactionClass) {
    this._interaction = new this._interactionClass(this._interactionClassOptions);
    map.addInteraction(this._interaction);
    this._interaction.setActive(false);
  }

  /**
   * @since 3.8.0
   */
  this.dispatchEvent({
    type: 'setMap',
    map
  })

};

proto._handleClick = function(evt) {
  if (this._enabled) {
    this.toggle();
    Control.prototype._handleClick.call(this, evt);
  }
};

proto.getInteraction = function() {
  return this._interaction;
};

/**
 * Method to set filter operation intersect or Contains
 */
proto.setSpatialMethod = function(method='intersects'){
  this.spatialMethod = method;
  this.dispatchEvent({
    type: 'change-spatial-method',
    spatialMethod: this.spatialMethod
  });
};

proto.getSpatialMethod = function(){
  return this.spatialMethod;
};

proto.setLayers = function(layers=[]){
  this.layers = layers;
};

/**
 * @param { 'intersects' | 'within' } spatialMethod
 * 
 * @listens change-spatial-method
 * 
 * @since 3.8.0
 */
proto.handleChangeSpatialMethod = function(spatialMethod) {
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
};

/**
 * Handle temporary layers added by `addlayers` map control (Polygon or Multipolygon)
 *
 * @listens CatalogService~addExternalLayer
 * @listens CatalogService~removeExternalLayer
 *
 * @since 3.8.0
 */
proto._handleExternalLayers = function() {
  const CatalogService = GUI.getService('catalog');

  // 0. store unwatches of external layers (selected or visible)
  const unWatches = {};

  // 1. update list `this.externalLayers`
  // 2. update list `unWatches` of layer un-watchers (based on unique name of layer)
  // 3. call `this.handleAddExternalLayer`
  CatalogService.onafter('addExternalLayer', ({layer, type}) => {
    if ('vector' === type) {
      this.externalLayers.push(layer);
      unWatches[layer.name] = [];
      this.handleAddExternalLayer(layer, unWatches);
    }
  });

  // 4. clean up any previously attached event listener
  CatalogService.onafter('removeExternalLayer', ({name, type}) => {
    if ('vector' === type) {
      this.externalLayers = this.externalLayers.filter(layer => {
        if (name === layer.name) {
          this.handleRemoveExternalLayer(layer);
          (layer === this.selectedLayer) && this.setSelectedLayer(null);
        }
        return name !== layer.name;
      });
      unWatches[name].forEach(unWatch => unWatch());
      delete unWatches[name];
    }
  });

};

/**
 * Store external vector layers add to project
 * @since 3.8.0
 */
proto.externalLayers = [];

module.exports = InteractionControl;
