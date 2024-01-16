/**
 * @param { number | string } epsg
 * 
 * @returns { string | undefined }
 */
export function normalizeEpsg(epsg) {
  if ('number' === typeof epsg) {
    return `EPSG:${epsg}`;
  }
  epsg = epsg.replace(/[^\d\.\-]/g, "");
  if ('' !== epsg) {
    return `EPSG:${parseInt(epsg)}`;
  }
}