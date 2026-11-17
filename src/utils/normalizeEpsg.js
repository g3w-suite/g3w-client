/** @param {number|string|object|null|undefined} crs @returns {string|null} */
export function normalizeEpsg(crs) {
  if (null == crs) {
    return null;
  }

  // Keep the full identifier for custom authorities, not just EPSG codes.
  if (crs?.authid) {
    return crs.authid;
  }

  const epsg = crs?.epsg ?? crs;
  const code = Number(epsg);

  // Leave already-formatted or custom string identifiers unchanged.
  if (Number.isInteger(code) && code !== 0) {
    return `EPSG:${code}`;
  }

  if (typeof crs === 'string') {
    return crs;
  }

  return null;
}