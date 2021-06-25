const utils = require('../utils');
const InteractionControl = require('./interactioncontrol');

const QueryBBoxControl = function(options = {}){
  this._startCoordinate = null;
  const _options = {
    offline: false,
    name: "querybbox",
    tipLabel: "sdk.mapcontrols.querybybbox.tooltip",
    label: options.label || "\ue902",
    clickmap: true, // set ClickMap
    interactionClass: ol.interaction.DragBox,
    onhover: true
  };
  options = utils.merge(options,_options);
  const layers = options.layers || [];
  options.visible = this.checkVisible(layers);
  InteractionControl.call(this, options);
};

ol.inherits(QueryBBoxControl, InteractionControl);

const proto = QueryBBoxControl.prototype;

proto.checkVisible = function(layers){
  return layers.length > 0;
};

proto.setMap = function(map) {
  InteractionControl.prototype.setMap.call(this,map);
  this._interaction.on('boxstart', evt => {
    this._startCoordinate = evt.coordinate;
  });
  this._interaction.on('boxend', evt => {
    const start_coordinate = this._startCoordinate;
    const end_coordinate = evt.coordinate;
    const extent = ol.extent.boundingExtent([start_coordinate, end_coordinate]);
    this.dispatchEvent({
      type: 'bboxend',
      extent
    });
    this._startCoordinate = null;
    this._autountoggle && this.toggle();
  })
};

module.exports = QueryBBoxControl;
