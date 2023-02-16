import { SPATIALMETHODS } from 'g3w-ol/constants';
import GUI from 'services/gui';

const { t } = require('core/i18n/i18n.service');
const Control = require('g3w-ol/controls/control');

const InteractionControl = function(options={}) {

  const {
    visible                 = true,
    enabled                 = true,
    toggled                 = false,
    clickmap                = false,
    interactionClass        = null,
    autountoggle            = false,
    geometryTypes           = [],
    onSelectlayer,
    onhover                 = false,
    help                    = null,
    toggledTool,
    interactionClassOptions = {},
    spatialMethod
  } = options;


  /**
   * @type {boolean}
   */
  this._visible = visible;

  /**
   * @type {boolean}
   */
  this._toggled = toggled;

  /**
   * Check if interact with map
   * 
   * @type {boolean}
   */
  this.clickmap = clickmap;

  /**
   * @FIXME add description
   */
  this._interactionClass = interactionClass;

  /**
   * @FIXME add description
   */
  this._interaction = null;

  /**
   * @type {boolean}
   */
  this._autountoggle = autountoggle;

  /**
   * Types of geometries
   * 
   * @type {string[]}
   */
  this._geometryTypes = geometryTypes;
  
  /**
   * @FIXME add description
   */
  this.onSelectLayer = onSelectlayer;

  /**
   * @FIXME add description
   */
  this._onhover = onhover;

  /**
   * @FIXME add description
   */
  this._help = help;

  /**
   * @FIXME un-initialized variable
   * 
   * Used to show help info button
   */
  this._helpButton;

  /**
   * @FIXME un-initialized variable
   * 
   * Used to show toolbutton
   */
  this._toolButton;

  /**
   * @type { 'intersect' | 'within' }
   */
  this.spatialMethod = spatialMethod;

  /**
   * @FIXME un-initialized variable
   */
  this.toggledTool;

  /**
   * @FIXME add description
   */
  this._interactionClassOptions = interactionClassOptions;

  /**
   * @FIXME add description
   */
  options.buttonClickHandler = InteractionControl.prototype._handleClick.bind(this);

  Control.call(this, options);

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
  
  // set toggled
  if(toggled) {
    this.toggle(toggled);
  }

};

ol.inherits(InteractionControl, Control);

const proto = InteractionControl.prototype;

/**
 * @FIXME add description
 */
proto.isClickMap = function() {
  return this.clickmap;
};

/**
 * Enable map control (DOM element)
 */
proto.enable = function() {
  $(this.element).removeClass('g3w-disabled');
};

/**
 * Disable map control (DOM element)
 */
proto.disable = function() {
  $(this.element).addClass('g3w-disabled');
};

/**
 * @FIXME add description
 */
proto.createControlTool = function(toggledTool={}) {
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
};

/**
 * @FIXME add description
 */
proto._createToolOnHoverButton = function() {
  if (!this._onhover) {
    return;
  }

  this._toolButton = $(`<span style="display:none" class="tool_mapcontrol_button"><i class="${GUI.getFontClass('tool')}"></i></span>`);
  
  $(this.element).prepend(this._toolButton);
  
  this._toolButton.on('click', event => { event.stopPropagation(); this.showToggledTool(true); });
  
  $(this.element).hover(() => this._toggled && this._toolButton.show());
  
  $(this.element).mouseleave(() => this._toolButton.hide());
};

/**
 * @FIXME add description
 *
 * @param {boolean} [show=true]
 */
proto.showToggledTool = function(show=true) {
  if (!show) {
    GUI.closeUserMessage();
  } else {
    GUI.showUserMessage({
      title: '',
      type: 'tool',
      size: 'small',
      closable: (this._toolButton) ? true : false,
      hooks: {
        body: this.toggledTool
      }
    });
  }
};

/**
 * Show help message 
 */
proto._showModalHelp = function() {
  GUI.showModalDialog({ title: t(this._help.title), message: t(this._help.message) });
};

/**
 * Create modal help
 */
proto._createModalHelp = function() {
  if (!this._onhover) {
    return;
  }
  
  this._helpButton = $('<span style="display:none" class="info_mapcontrol_button">i</span>');
  
  $(this.element).prepend(this._helpButton);
  
  this._helpButton.on('click', event => { event.stopPropagation(); this._showModalHelp(); });

  $(this.element).hover(() => this._helpButton.show());

  $(this.element).mouseleave(() => this._helpButton.hide());
};

/**
 * @FIXME add description
 */
proto.getGeometryTypes = function() {
  return this._geometryTypes;
};

/**
 * @FIXME add description
 */
proto.getInteraction = function() {
  return this._interaction;
};

/**
 * @FIXME add description
 */
proto.isToggled = function() {
  return this._toggled;
};

/**
 * Get DOM bottom control
 * 
 * @returns { JQuery<HTMLElement> | jQuery | HTMLElement }
 */
proto.getControlBottom = function() {
  return $(this.element).find('button').first();
};

/**
 * @FIXME add description
 *
 * @param {string} [className='']
 */
proto.addClassToControlBottom = function(className='') {
  this.getControlBottom().addClass(className);
};

/**
 * @FIXME add description
 */
proto.removeClassToControlBottom = function(className='') {
  this.getControlBottom().removeClass(className);
};

/**
 * Press or not press
 * 
 * @param {boolean} toggle 
 */
proto.toggle = function(toggle) {
  toggle = (undefined !== toggle) ? toggle : !this._toggled;
  this._toggled = toggle;
  if (toggle) {
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
  this.dispatchEvent('toggled', toggle);
};

/**
 * @FIXME add description
 */
proto.getGeometryTypes = function() {
  return this._geometryTypes;
};

/**
 * @FIXME add description
 */
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

  if (this._toggled) {
    setTimeout(() => { this.toggle(true); });
  }
};

/**
 * @FIXME add description
 */
proto._handleClick = function(evt) {
  if (this._enabled) {
    this.toggle();
    Control.prototype._handleClick.call(this, evt);
  }
};

/**
 * @FIXME add description
 */
proto.getIteraction = function() {
  return this._interaction;
};

/**
 * @FIXME invalid default value for `method` parameter
 * 
 * Set filter operation
 * 
 * @param { 'intersect' | 'contains' } [method='intersects']
 */
proto.setSpatialMethod = function(method='intersects') {
  this.spatialMethod = method;
};

/**
 * @returns { 'intersect' | 'contains' }
 */
proto.getSpatialMethod = function() {
  return this.spatialMethod;
};

/**
 * @FIXME add description
 */
proto.setLayers = function(layers=[]) {
  this.layers = layers;
};

/**
 * Called when project change (owerwrite in each control)
 * 
 * @param layers
 */
proto.change = function(layers=[]) { };

module.exports = InteractionControl;
