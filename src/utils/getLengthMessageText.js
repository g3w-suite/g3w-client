import { needUseSphereMethods } from 'utils/needUseSphereMethods';
import { transformMeterLength } from 'utils/transformMeterLength';

/**
 * @param { Object } opts
 * @param opts.unit
 * @param opts.projection
 * @param opts.geometry 
 */
export function getLengthMessageText({
  unit,
  projection,
  geometry
} = {}){
  /**
   * @FIXME circular dependency (ie. empty object when importing at top level), ref: #130
   */
  const { Geometry } = require('utils/geo');
  //
  const geometryType = geometry.getType();
  const useSphereMethods = needUseSphereMethods(projection);
  const length = useSphereMethods ? ol.sphere.getLength(geometry, {
    projection: projection.getCode()
  }) : Geometry.isMultiGeometry(geometryType) ?
    geometry.getLineStrings().reduce((totalLength, lineGeometry) => totalLength+= lineGeometry.getLength(), 0)
    : geometry.getLength();
  let message;
  switch(unit) {
    case 'nautical':
      message = `${transformMeterLength(length, unit)} nm`;
      break;
    case 'metric':
    default:
      message = (length > 1000) ? `${(Math.round(length / 1000 * 100) / 100).toFixed(3)} km` : `${(Math.round(length * 100) / 100).toFixed(2)} m`;
  }
  return message;
};