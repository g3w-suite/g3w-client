import MeasureInteraction  from './measureinteraction';
// Area
class AreaIteraction extends MeasureInteraction {
  constructor(options={}) {
    options.geometryType = "Polygon";
    super(options);
  }
};


export default  AreaIteraction;
