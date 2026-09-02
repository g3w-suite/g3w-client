/**
 * @param { Array } coordinates1
 * @param { Array } coordinates2
 * 
 * @returns { boolean }
 */
export function areCoordinatesEqual(coordinates1 = [], coordinates2 = []) {
  return (coordinates1.length === coordinates2.length) && coordinates1.every((c, i) => coordinates2[i] === c);
}