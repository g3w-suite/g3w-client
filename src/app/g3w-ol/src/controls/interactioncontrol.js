const Control = require('./control');
const GUI = require('gui/gui');

const InteractionControl = function(options={}) {
  const {visible=true, toggled=false, clickmap=false, interactionClass=null, autountoggle=false,
    geometryTypes=[], onselectlayer=false, onhover=false, help=null, interactionClassOptions={}, spatialMethod} = options;
  this._visible = visible;
  this._toggled = toggled;
  this.clickmap = clickmap; // check if interact with map
  this._interactionClass = interactionClass;
  this._interaction = null;
  this._autountoggle = autountoggle;
  this._geometryTypes = geometryTypes; // array of types geometries
  this._onSelectLayer = onselectlayer;
  this._onhover = onhover;
  this._help = help;
  this._helpButton = null;
  this._interactionClassOptions = interactionClassOptions;
  //spatial method (intersect, within)
  this.spatialMethod = spatialMethod;
  options.buttonClickHandler = InteractionControl.prototype._handleClick.bind(this);
  Control.call(this, options);
  // create an help message
  this._help && this._createModalHelp();
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

proto.isVisible = function() {
  return this._visible
};

proto.setVisible = function(bool) {
  this._visible = bool;
};

//show help message
proto._showModalHelp = function() {
  GUI.showUserMessage({
    type: 'info',
    message: this._help,
    position: 'left',
    size: 'small',
    autoclose: false
  })
};

proto._closeModalHelp = function() {
  GUI.closeUserMessage();
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
    //this._help && this._showModalHelp();
    this._interaction && this._interaction.setActive(true);
    this.addClassToControlBottom('g3w-ol-toggled');
  } else {
    this._help && this._helpButton.hide();
    this._interaction && this._interaction.setActive(false);
    this.removeClassToControlBottom('g3w-ol-toggled');
  }
  this.dispatchEvent('toggled', toggle);
};

proto.getGeometryTypes = function() {
  return this._geometryTypes;
};

proto.setGeometryTypes = function(types) {
  this._geometryTypes = types;
};

proto.onSelectLayer = function() {
  return this._onSelectLayer;
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

module.exports = InteractionControl;
