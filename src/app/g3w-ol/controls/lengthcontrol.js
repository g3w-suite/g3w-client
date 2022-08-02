const utils = require('core/utils/ol');
const LenghtIteraction = require('../interactions/lengthinteraction');
const MeasureControl = require('./measurecontrol');

const LengthControl = function(options={}) {
  const _options = {
    tipLabel: "sdk.mapcontrols.measures.length.tooltip",
    label: "\ue908",
    clickmap: true, // set ClickMap
    interactionClass: LenghtIteraction
  };

  options = utils.merge(options,_options);
  MeasureControl.call(this, options);
};

ol.inherits(LengthControl, MeasureControl);


module.exports = LengthControl;
