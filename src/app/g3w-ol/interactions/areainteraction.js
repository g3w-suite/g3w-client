import MeasureInteraction from 'g3w-ol/interactions/measureinteraction';

export default class AreaIteraction extends MeasureInteraction {
  constructor(opts = {}) {
    opts.geometryType = "Polygon";
    super(opts);
  }
};
