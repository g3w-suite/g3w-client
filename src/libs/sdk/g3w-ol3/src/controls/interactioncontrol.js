var Control = require('./control');

var InteractionControl = function(options){
  this._toggled = this._toggled || false;
  this._interactionClass = options.interactionClass || null;
  this._interaction = null;
  this._autountoggle = options.autountoggle || false;

  
  options.buttonClickHandler = InteractionControl.prototype._handleClick.bind(this);
  
  Control.call(this,options);
};
ol.inherits(InteractionControl, Control);

var proto = InteractionControl.prototype;

proto.toggle = function(toggle){
  var toggle = toggle !== undefined ? toggle : !this._toggled
  this._toggled = toggle;
  var map = this.getMap();
  var controlButton = $(this.element).find('button').first();
  
  if (toggle) {
    if (this._interaction) {
      //map.addInteraction(this._interaction);
      this._interaction.setActive(true);
    }
    controlButton.addClass('g3w-ol-toggled');
  }
  else {
    if (this._interaction) {
      //map.removeInteraction(this._interaction);
      this._interaction.setActive(false);
    }
    controlButton.removeClass('g3w-ol-toggled');
  }
};

proto.setMap = function(map) {
  if (!this._interaction && this._interactionClass) {
    this._interaction = new this._interactionClass;
    map.addInteraction(this._interaction);
    this._interaction.setActive(false);
  }
  Control.prototype.setMap.call(this,map);
};

proto._handleClick = function(e){
  this.toggle();
  Control.prototype._handleClick.call(this,e);
};

module.exports = InteractionControl;
