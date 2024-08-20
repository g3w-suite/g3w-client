/**
 * Check if is a url
 * 
 * @param url
 * @returns {boolean}
 */
export function isURL(url) {
  return url && url.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g)
}
