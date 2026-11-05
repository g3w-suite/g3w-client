/**
 * @param { number | string | null | undefined} crs or crs object
 * @param {boolean} [toString] whether to return EPSG data as string or CRS object
 * 
 * @returns { string | undefined | { { epsg: string, proj4: string, axisinverted: boolean, geographic: boolean } | null | undefined } }
 */
export function normalizeEpsg(crs, toString = true) {

  // Preserve the authority identifier when the CRS object already provides one.
  if (!Number.isInteger(crs) && crs.authid) {
    return crs.authid;
  }
  
  if (toString && Number.isInteger(crs)) {
    return `EPSG:${crs}`;
  }

  if (toString) {
    crs = crs.replace(/[^\d\.\-]/g, "");
  }

  if (toString && '' !== crs) {
    return `EPSG:${parseInt(crs)}`;
  }

  // invalid conversion: EPSG (eg. 0) → CRS object 
  if (!toString && ([undefined, null].includes(crs) || (crs && !(crs.epsg ?? crs.authid)))) {
    return null;
  }

  if (!toString && (crs.epsg ?? crs.authid)) {
    crs.epsg = normalizeEpsg(crs.epsg ?? crs.authid, true);
    return crs;
  }

  if (!toString && !crs.epsg) {
    return {
      epsg:         normalizeEpsg(crs, true),
      proj4:        "",
      axisinverted: false,
      geographic:   false
    };
  }
}