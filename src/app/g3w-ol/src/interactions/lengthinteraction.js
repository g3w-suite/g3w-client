import MeasureInteraction  from './measureinteraction';

// LenghtInteracion
class LengthIteraction extends MeasureInteraction {
  constructor(options={}) {
    options.geometryType = "LineString";
    super(options);
  }
}

export default  LengthIteraction;
