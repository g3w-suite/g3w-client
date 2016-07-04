var utils = require('../utils');
var InteractionControl = require('./interactioncontrol');

var ResetControl = function(options){
  var self = this;
  this._toggled = true;
  this._startCoordinate = null;
  var _options = {
      name: "reset",
      tipLabel: "Pan",
      label: "\ue901",
    };
  
  options = utils.merge(options,_options);
  
  InteractionControl.call(this,options);
}
ol.inherits(ResetControl, InteractionControl);
module.exports = ResetControl;

var proto = ResetControl.prototype;

proto._postRender = function(){
  this.toggle(true);
};
