/**
 * Convert Degree to Degree Minutes Seconds
 * 
 * @param { Object } opts
 * @param opts.deg
 * @param opts.lat
 * @param opts.lon
 * @param { 'Array' | 'Object' | 'Text' } opts.output
 * 
 * @returns { string }
 */
export function convertDEGToDMS({
  deg,
  lat,
  lon,
  output = 'Array',
} = {}) {
  const absolute            = Math.abs(deg);
  const degrees             = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes             = Math.floor(minutesNotTruncated);
  const seconds             = ((minutesNotTruncated - minutes) * 60).toFixed(2);
  let direction;
  if (lat) { direction = deg >= 0 ? "N" : "S" }
  if (lon) { direction = deg >= 0 ? "E" : "W" }
  switch (output) {
    case 'Array':  return [degrees, minutes, seconds, direction];
    case 'Object': return { degrees, minutes, seconds, direction };
    default:       return  degrees + "°" + minutes + "'" + seconds + "\"" + direction;
  }
}