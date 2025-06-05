/**
 * Covert string rgb to hex
 * @since 4.0.0
 * @param {String} rgb 
 * @returns 
 */
export function rgbToHex(rgb) {
  return `#${rgb.slice(4,-1).split(',').map(x => (+x).toString(16).padStart(2,0)).join('')}`    
}