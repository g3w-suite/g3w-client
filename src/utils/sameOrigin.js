/**
 * @param {string} url1
 * @param {string} url2
 *
 * @returns {boolean} whether URLs have same origin.
 *
 * @since 3.8.0
 */
export function sameOrigin(url1, url2) {
  try {
    return new URL(url1).origin === new URL(url2).origin;
  } catch(err) {
    return false
  }
};