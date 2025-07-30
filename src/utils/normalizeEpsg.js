/**
 * @param { number | string | null | undefined} epsg or crs object
 * @param {boolean} [toString] whether to return EPSG data as string or CRS object
 * 
 * @returns { string | undefined | { { epsg: string, proj4: string, axisinverted: boolean, geographic: boolean } | null | undefined } }
 */
export function normalizeEpsg(epsg, toString = true) {
  if (toString && 'number' === typeof epsg) {
    return `EPSG:${epsg}`;
  }

  if (toString) {
    epsg = epsg.replace(/[^\d\.\-]/g, "");
  }

  if (toString && '' !== epsg) {
    return `EPSG:${parseInt(epsg)}`;
  }

  const crs = epsg

  // invalid conversion: EPSG (eg. 0) → CRS object 
  if (!toString && ([undefined, null].includes(crs) || (crs && !crs.epsg))) {
    return null;
  }

  if (!toString && crs.epsg) {
    crs.epsg = normalizeEpsg(crs.epsg, true);
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