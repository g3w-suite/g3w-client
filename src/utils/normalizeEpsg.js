/**
 * @param { number | string | null | undefined} crs or crs object
 * @param {boolean} [toString] whether to return EPSG data as string or CRS object
 * 
 * @returns { string | undefined | { { epsg: string, proj4: string, axisinverted: boolean, geographic: boolean } | null | undefined } }
 */
export function normalizeEpsg(crs) {
  if (undefined === crs) {
    return null;
  }

  // Preserve the authority identifier when the CRS object already provides one.
  if (!Number.isInteger(crs) && crs.authid) {
    return crs.authid;
  }
  
  if (Number.isInteger(Number(crs))) {
    return `EPSG:${crs}`;
  }

  if ('string' === typeof crs) {
    return crs;
  }

  // invalid conversion: EPSG (eg. 0) → CRS object 
  if ((!(crs?.epsg || crs?.authid))) {
    return null;
  }
}