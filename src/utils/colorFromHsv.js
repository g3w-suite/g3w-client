/**
 * Convert HSV values to the app's hex/RGBA color object.
 * Hue is in degrees; saturation and brightness are expected in the 0-1 range.
 *
 * @param {number} hue Hue in degrees; values outside 0-360 are wrapped.
 * @param {number} saturation Saturation between 0 and 1.
 * @param {number} brightness Brightness between 0 and 1.
 * @param {number} [alpha=1] Opacity between 0 and 1.
 * @returns {{hex: string, rgba: {r: number, g: number, b: number, a: number}, a: number}}
 */
export function colorFromHsv(hue, saturation, brightness, alpha = 1) {
  hue = ((hue % 360) + 360) % 360;
  const chroma       = brightness * saturation;
  const intermediate = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
  const minimum      = brightness - chroma;
  const rgb = [
    [chroma, intermediate, 0],
    [intermediate, chroma, 0],
    [0, chroma, intermediate],
    [0, intermediate, chroma],
    [intermediate, 0, chroma],
    [chroma, 0, intermediate],
  ][Math.floor(hue / 60) % 6].map(channel => Math.round((channel + minimum) * 255));
  const hex = `#${rgb.map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
  const [red, green, blue] = rgb;

  return { hex, rgba: { r: red, g: green, b: blue, a: alpha }, a: alpha };
}