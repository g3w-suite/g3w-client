/**
 * @param { Array } coordinates1
 * @param { Array } coordinates2
 * 
 * @returns { boolean }
 */
export function areCoordinatesEqual(coordinates1 = [], coordinates2 = []) {
  return (coordinates1[0] === coordinates2[0] && coordinates1[1] === coordinates2[1]);
}