/**
 * Convert Hex value color to RGB array
 * 
 * @param color
 * 
 * @returns {number[]}
 */
export function colorHEXToRGB(color='#FFFFFF') {
  const r = parseInt(color.substr(1,2), 16);
  const g = parseInt(color.substr(3,2), 16);
  const b = parseInt(color.substr(5,2), 16);
  return [r,g,b]
}