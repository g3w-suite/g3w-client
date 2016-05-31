var Control = require('./control');

var InteractionControl = function(options){
  this._toggled = false;
  this._interaction = options.interaction || null;
  this._autountoggle = options.autountoggle || true;
  
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
    map.addInteraction(this._interaction);
    controlButton.addClass('g3w-ol-toggled');
  }
  else {
    map.removeInteraction(this._interaction);
    controlButton.removeClass('g3w-ol-toggled');
  }
}

proto._handleClick = function(e){
  this.toggle();
  Control.prototype._handleClick.call(this,e);
};

module.exports = InteractionControl;
