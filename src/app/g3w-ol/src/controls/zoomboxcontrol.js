const InteractionControl = require('./interactioncontrol');

const ZoomBoxControl = function(options){
  this._startCoordinate = null;
  const _options = {
      name: "zoombox",
      tipLabel: "Zoom to box",
      label: "\ue901",
      interactionClass: ol.interaction.DragBox
    };
  options = Object.assign({},options,_options);
  InteractionControl.call(this,options);

};
ol.inherits(ZoomBoxControl, InteractionControl);
module.exports = ZoomBoxControl;

const proto = ZoomBoxControl.prototype;

proto.setMap = function(map) {
  InteractionControl.prototype.setMap.call(this,map);
  this._interaction.on('boxstart',(e) => {
    this._startCoordinate = e.coordinate;
  });

  this._interaction.on('boxend',(e) => {
    const start_coordinate = this._startCoordinate;
    const end_coordinate = e.coordinate;
    const extent = ol.extent.boundingExtent([start_coordinate,end_coordinate]);
    this.dispatchEvent({
      type: 'zoomend',
      extent: extent
    });
    this._startCoordinate = null;
    if (this._autountoggle) {
      this.toggle();
    }
  });
};

