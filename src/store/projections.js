/**
 * @file
 *
 * @since 3.11.0
 */
import { API_BASE_URLS } from 'app/constant';
import { normalizeEpsg } from 'utils/normalizeEpsg';
import { XHR }           from 'utils/XHR';

/**
 * ORIGINAL SOURCE: src/app/g3w-ol/projection/projection.js@v3.10.1
 * ORIGINAL SOURCE: src/app/g3w-ol/projection/projections.js@v3.10.1
 */
export default {

  get(crs = {}) {
    let p = ol.proj.get(crs.epsg);
    if (!p) {
      if (crs.proj4) {
        proj4.defs(crs.epsg, crs.proj4);
      }
      const proj = {
        code:            crs.epsg,
        extent:          crs.extent,
        axisOrientation: crs.axisinverted ? 'neu' : 'enu',
        units:           crs.geographic ? 'degrees' : 'm'
      };
      p = new ol.proj.Projection(proj);
      p.getAxisOrientation = () => proj.axisOrientation;
      ol.proj.addProjection(p);
      ol.proj.proj4.register(proj4);
    }
    return p;
  },

  /**
   * Check and register epsg
   * 
   * @param epsg : "EPSG:<CODE>" Ex. "EPSG:4326"
   * 
   * @returns { Promise<ol.proj.Projection> }
   * 
   * @since v3.8
   */
  async registerProjection(epsg) {
    let p = ol.proj.get(epsg) || undefined;

    // check if already registered
    if (!p) {
      const { result, data } = await XHR.get({ url: `${API_BASE_URLS.CRS}${epsg.split(':')[1]}` });
      if (result)  {
        data.epsg  = normalizeEpsg(data.epsg);
        p = this.get(data);
        ol.proj.proj4.register(proj4);
        return p;
      }
    }

    return p;
  }
};