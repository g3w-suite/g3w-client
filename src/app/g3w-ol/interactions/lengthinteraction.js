import MeasureInteraction  from 'g3w-ol/interactions/measureinteraction';

export default class LengthIteraction extends MeasureInteraction {
  constructor(opts = {}) {
    opts.geometryType = "LineString";
    super(opts);
  }
};
