import { normalizeEpsg } from 'utils/normalizeEpsg';
import { toRawType }     from 'utils/toRawType';

/**
 * @param { number | string | null | undefined } crs
 * 
 * @returns { { epsg: string, proj4: string, axisinverted: boolean, geographic: boolean } | null | undefined } crs object
 */
export function crsToCrsObject(crs) {

  /** @FIXME add description */
  if (null === crs || undefined === crs) {
    return crs;
  }

  /** @FIXME add description */
  if ('Object' === toRawType(crs) && crs.epsg) {
    crs.epsg = normalizeEpsg(crs.epsg);
    return crs;
  }

  return {
    epsg: normalizeEpsg(crs),
    proj4: "",
    axisinverted: false,
    geographic: false
  };
};