var utils = require('../utils');
var InteractionControl = require('./interactioncontrol');

var ZoomBoxControl = function(options){
  var self = this;
  var _options = {
      name: "Zoom to box",
      tipLabel: "Zoom to box",
      label: "\ue900",
      interaction: new ol.interaction.DragBox
    };
  
  options = utils.merge(options,_options);
  
  InteractionControl.call(this,options);
  
  this._interaction.on('boxstart',function(e){
    console.log(self.name+' ('+self.id+'): '+e.coordinate);
  });
  
  this._interaction.on('boxend',function(e){
    console.log(self.name+' ('+self.id+'): '+e.coordinate);
  })
}
ol.inherits(ZoomBoxControl, InteractionControl);
module.exports = ZoomBoxControl;
