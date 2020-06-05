const Control = require('./control');
const GUI = require('gui/gui');

const InteractionControl = function(options={}) {
  this._visible = options.visible === false ? false : true;
  this._toggled = options.toggled || false;
  this._interactionClass = options.interactionClass || null;
  this._interaction = null;
  this._autountoggle = options.autountoggle || false;
  this._geometryTypes = options.geometryTypes || []; // array of types geometries
  this._onSelectLayer = options.onselectlayer || false;
  this._onhover = options.onhover || false;
  this._help = options.help  || null;
  this._helpButton = null;
  this._interactionClassOptions = options.interactionClassOptions || {};
  options.buttonClickHandler = InteractionControl.prototype._handleClick.bind(this);
  Control.call(this, options);
  // create an help message
  this._help && this._createModalHelp();
};

ol.inherits(InteractionControl, Control);

const proto = InteractionControl.prototype;

proto.isVisible = function() {
  return this._visible
};

proto.setVisible = function(bool) {
  this._visible = bool;
};

//shwo help message
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
    this._helpButton.on('click', (event) => {
      event.stopPropagation();
      this._showModalHelp();
    });
    $(this.element).hover(() => {
      this._helpButton.show();
    });
    $(this.element).mouseleave(() => {
      this._helpButton.hide();
    });
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

// press or not press
proto.toggle = function(toggle) {
  toggle = toggle !== undefined ? toggle : !this._toggled;
  this._toggled = toggle;
  const controlButton = $(this.element).find('button').first();
  if (toggle) {
    //this._help && this._showModalHelp();
    this._interaction && this._interaction.setActive(true);
    controlButton.addClass('g3w-ol-toggled');
  } else {
    this._help && this._helpButton.hide();
    this._interaction && this._interaction.setActive(false);
    controlButton.removeClass('g3w-ol-toggled');
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

proto._handleClick = function(e) {
  if (this._enabled) {
    this.toggle();
    Control.prototype._handleClick.call(this,e);
  }
};

proto.getIteraction = function() {
  return this._interaction;
};


module.exports = InteractionControl;
