const MeasureInteraction = require('./measureinteraction');

// LenghtInteracion
const LengthIteraction = function(options={}) {
  options.geometryType = "LineString";
  MeasureInteraction.call(this, options)
};

ol.inherits(LengthIteraction, MeasureInteraction);


module.exports = LengthIteraction;
