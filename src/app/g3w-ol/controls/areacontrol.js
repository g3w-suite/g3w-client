const utils = require('core/utils/ol');
const AreaIteraction = require('../interactions/areainteraction');
const MeasureControl = require('./measurecontrol');

const AreaControl = function(options={}) {
  const _options = {
    tipLabel: "sdk.mapcontrols.measures.area.tooltip",
    label: "\ue909",
    clickmap: true, // set ClickMap
    interactionClass: AreaIteraction
  };
  options = utils.merge(options, _options);
  MeasureControl.call(this, options);
};

ol.inherits(AreaControl, MeasureControl);

module.exports = AreaControl;
