/**
 * Convert Hex value color to RGB array
 * 
 * @param color
 * 
 * @returns {number[]}
 */
export function colorHEXToRGB(color='#FFFFFF') {
  return [
    parseInt(color.substr(1,2), 16),
    parseInt(color.substr(3,2), 16),
    parseInt(color.substr(5,2), 16)
  ]
}