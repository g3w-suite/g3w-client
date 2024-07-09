const MeasureInteraction = require('g3w-ol/interactions/measureinteraction');

module.exports = class AreaIteraction extends MeasureInteraction {
  constructor(opts = {}) {
    opts.geometryType = "Polygon";
    super(opts);
  }
};
