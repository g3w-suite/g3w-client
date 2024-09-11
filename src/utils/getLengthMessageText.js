import { needUseSphereMethods } from 'utils/needUseSphereMethods';
import { isMultiGeometry }      from "utils/isMultiGeometry";

/**
 * Transform length meter in a specific unit (ex.nautical mile)
 * 
 * @param length
 * @param tounit
 * 
 * @returns { number }
 */
function transformMeterLength(length, tounit) {
  if ('nautical' === tounit) {
    return length * 0.0005399568;
  }
  return length;
}

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
  //
  const geometryType     = geometry.getType();
  const useSphereMethods = needUseSphereMethods(projection);
  const length           = useSphereMethods ? ol.sphere.getLength(geometry, {
    projection: projection.getCode()
  }) : isMultiGeometry(geometryType)
    ? geometry.getLineStrings().reduce((totalLength, lineGeometry) => totalLength+= lineGeometry.getLength(), 0)
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
}