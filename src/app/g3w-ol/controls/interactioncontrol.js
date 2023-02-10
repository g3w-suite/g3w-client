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
  this._toggled = toggled;
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
  // create an help message
  this._help && this._createModalHelp();
  // create tool
  toggledTool && this.createControlTool(toggledTool);
  ///se enabled
  this.setEnable(enabled);
  toggled && this.toggle(toggled);
};

ol.inherits(InteractionControl, Control);

const proto = InteractionControl.prototype;

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

proto.getInteraction = function() {
  return this._interaction;
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

// press or not press
proto.toggle = function(toggle) {
  toggle = toggle !== undefined ? toggle : !this._toggled;
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
  this._toolButton === undefined && this.toggledTool && this.showToggledTool(this._toggled);
  this.dispatchEvent('toggled', toggle);
};

proto.getGeometryTypes = function() {
  return this._geometryTypes;
};

proto.setGeometryTypes = function(types) {
  this._geometryTypes = types;
};

proto.setMap = function(map) {
  Control.prototype.setMap.call(this, map);
  if (!this._interaction && this._interactionClass) {
    this._interaction = new this._interactionClass(this._interactionClassOptions);
    map.addInteraction(this._interaction);
    this._interaction.setActive(false);
  }
  this._toggled && setTimeout(()=> {this.toggle(true)});
};

proto._handleClick = function(evt) {
  if (this._enabled) {
    this.toggle();
    Control.prototype._handleClick.call(this, evt);
  }
};

proto.getIteraction = function() {
  return this._interaction;
};

/**
 * Method to set filter operation intersect or Contains
 */

proto.setSpatialMethod = function(method='intersects'){
  this.spatialMethod = method;
};

proto.getSpatialMethod = function(){
  return this.spatialMethod;
};

proto.setLayers = function(layers=[]){
  this.layers = layers;
};

/**
 * called when project change
 * @param layers
 */
proto.change = function(layers=[]){
  //to owerwite to each control
};

module.exports = InteractionControl;
