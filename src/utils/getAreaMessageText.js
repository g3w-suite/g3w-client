import { needUseSphereMethods } from 'utils/needUseSphereMethods';
import { getLengthMessageText } from 'utils/getLengthMessageText';

/**
 * @param area 
 * @param tounit
 * 
 * @returns { number } 
 */
function transformMeterArea(area, tounit) {
  if ('nautical' === tounit) {
    return area * 0.000000291553349598122862913947445759414840765222583489217190918463024037990567;
  }
  return area;
}

export function getAreaMessageText({
  unit,
  geometry,
  projection,
  segments = []
}) {
  const useSphereMethods = needUseSphereMethods(projection);
  const area =  Math.round(useSphereMethods ? ol.sphere.getArea(geometry, {
    projection: projection.getCode()
  }): geometry.getArea());
  let message;
  let segments_info_meausure = '';
  const segmentLength        = segments.length;
  if (segmentLength > 2) {
    segments_info_meausure+=`${getLengthMessageText({
      unit, 
      projection,
      geometry: new ol.geom.LineString(segments)
    })} <br>`;
  }
  switch (unit) {
    case 'nautical':
      message = `${transformMeterArea(area, unit)}  nmi²`;
      break;
    case 'metric':
    default:
      message = area > 1000000 ? `${(Math.round(area / 1000000 * 100) / 100).toFixed(6)} km<sup>2</sup>` : `${(Math.round(area * 100) / 100).toFixed(3)} m<sup>2</sup>`;
  }
  if (segments_info_meausure) {
    message =`Area: ${message} <br><div style="width: 100%; padding: 3px; border-bottom: 2px solid #ffffff"></div> ${segments_info_meausure}`;
  }
  return message;
}