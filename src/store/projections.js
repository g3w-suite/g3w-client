/**
 * @file
 *
 * @since 3.11.0
 */
import { normalizeEpsg } from 'utils/normalizeEpsg';
import proj4             from 'proj4';

/**
 * ORIGINAL SOURCE: src/app/g3w-ol/projection/projection.js@v3.10.1
 * ORIGINAL SOURCE: src/app/g3w-ol/projection/projections.js@v3.10.1
 */
export default {

  get(crs = {}) {
    let p = ol.proj.get(normalizeEpsg(crs.epsg));
    if (!p) {
      
      const proj = {
        code:            crs.epsg,
        extent:          crs.extent,
        axisOrientation: crs.axisinverted ? 'neu' : 'enu',
        units:           crs.geographic ? 'degrees' : 'm'
      };
      p = new ol.proj.Projection(proj);
      p.getAxisOrientation = () => proj.axisOrientation;
      ol.proj.addProjection(p);
      //Only in case of proj4.defs change need to register
      if (crs.proj4) {
        proj4.defs(crs.epsg, crs.proj4);
        ol.proj.proj4.register(proj4);
      }
    }
    //in case of missing extent
    if (crs.extent && !p.getExtent()){
      p.setExtent(crs.extent);
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
      const { result, data } = await (await fetch(`/crs/${epsg.split(':')[1]}/`)).json();
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