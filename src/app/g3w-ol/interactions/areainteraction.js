const MeasureInteraction = require('./measureinteraction');
// Area
const AreaIteraction = function (options = {}) {
  options.geometryType = 'Polygon';
  MeasureInteraction.call(this, options);
};

ol.inherits(AreaIteraction, MeasureInteraction);

module.exports = AreaIteraction;
