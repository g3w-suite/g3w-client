var utils = require('../utils');
var InteractionControl = require('./interactioncontrol');

var PickCoordinatesInteraction = require('../interactions/pickcoordinatesinteraction');

var QueryControl = function(options){
  var self = this;
  var _options = {
    name: "Query layer",
    tipLabel: "Query layer",
    label: "\uea0f",
    interaction: new PickCoordinatesInteraction
  };
  
  options = utils.merge(options,_options);
  
  InteractionControl.call(this,options);
  
  this._interaction.on('picked',function(e){
    self.dispatchEvent({
      type: 'picked',
      coordinates: e.coordinate
    });
  });
}
ol.inherits(QueryControl, InteractionControl);

module.exports = QueryControl;
