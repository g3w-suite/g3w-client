/**
 * @param area 
 * @param tounit
 * 
 * @returns { number } 
 */
export function transformMeterArea(area, tounit) {
  if ('nautical' === tounit) {
    return area * 0.000000291553349598122862913947445759414840765222583489217190918463024037990567;
  }
  return area;
}