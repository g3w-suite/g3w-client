/**
 * Sort an array of strings (alphabetical order)
 * 
 * @since 3.8.0
 */
export function sortAlphabeticallyArray(arr = []) {
  return arr.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}