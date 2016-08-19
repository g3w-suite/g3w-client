var utils = require('../utils');
var InteractionControl = require('./interactioncontrol');

var ZoomBoxControl = function(options){
  var self = this;
  this._startCoordinate = null;
  var _options = {
      name: "zoombox",
      tipLabel: "Zoom to box",
      label: "\ue900",
      interactionClass: ol.interaction.DragBox
    };
  
  options = utils.merge(options,_options);
  
  InteractionControl.call(this,options);
}
ol.inherits(ZoomBoxControl, InteractionControl);
module.exports = ZoomBoxControl;

var proto = ZoomBoxControl.prototype;

proto.setMap = function(map) {
  var self = this;
  InteractionControl.prototype.setMap.call(this,map);
  this._interaction.on('boxstart',function(e){
    self._startCoordinate = e.coordinate;
  });
  
  this._interaction.on('boxend',function(e){
    var start_coordinate = self._startCoordinate;
    var end_coordinate = e.coordinate;
    var extent = ol.extent.boundingExtent([start_coordinate,end_coordinate]);
    self.dispatchEvent({
      type: 'zoomend',
      extent: extent
    });
    self._startCoordinate = null;
    if (self._autountoggle) {
      self.toggle();
    }
  })
};
