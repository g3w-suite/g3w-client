/**
 * Convert Degree to Degree Minutes
 * 
 * @param { Object } opts
 * @param { number } opts.deg
 * @param { 'Array' | 'Object' | 'Text' } opts.output
 * 
 * @returns { string }
 */
export function convertDEGToDM({
  deg,
  output = 'Array',
} = {}) {
  const absolute = Math.abs(deg);
  const degrees = Math.floor(absolute);
  const minutes = (absolute - degrees) * 60;
  switch (output) {
    case 'Array':  return [degrees, minutes];
    case 'Object': return { degrees, minutes };
    default:       return degrees + "°" + minutes + "'";
  }
}