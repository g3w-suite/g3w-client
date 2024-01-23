/**
 * Transform length meter in a specific unit (ex.nautical mile)
 * 
 * @param length
 * @param tounit
 * 
 * @returns { number }
 */
export function transformMeterLength(length, tounit) {
  if ('nautical' === tounit) {
    return length * 0.0005399568;
  }
  return length;
}