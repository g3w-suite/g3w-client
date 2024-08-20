/**
 * Sort an array of numbers (natural order)
 * 
 * @since 3.8.0
 */
export function sortNumericArray(arr = [], ascending = true) {
  return arr.sort((a, b) => (ascending ? (a - b) : (b - a)));
}