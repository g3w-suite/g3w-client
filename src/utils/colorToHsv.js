/**
 * Convert an app color object with 0-255 RGB channels to HSV.
 * Hue is returned in degrees; saturation and brightness are in the 0-1 range.
 * Achromatic colors have a hue of 0.
 *
 * @param {{rgba: {r: number, g: number, b: number}}} color Color object to convert.
 * @returns {{hue: number, saturation: number, brightness: number}}
 */
export function colorToHsv(color) {
  const red   = color.rgba.r / 255;
  const green = color.rgba.g / 255;
  const blue  = color.rgba.b / 255;
  const max    = Math.max(red, green, blue);
  const min    = Math.min(red, green, blue);
  const delta  = max - min;
  let hue      = 0;

  if (delta > 0) {
    if (max === red)   hue = 60 * (((green - blue) / delta) % 6);
    if (max === green) hue = 60 * ((blue - red) / delta + 2);
    if (max === blue)  hue = 60 * ((red - green) / delta + 4);
  }

  return {
    hue:        (hue + 360) % 360,
    saturation: delta / max || 0,
    brightness: max,
  };
}