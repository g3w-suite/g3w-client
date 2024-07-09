const MeasureInteraction = require('g3w-ol/interactions/measureinteraction');

module.exports = class LengthIteraction extends MeasureInteraction {
  constructor(opts = {}) {
    opts.geometryType = "LineString";
    super(opts);
  }
};
