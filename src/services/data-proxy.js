/**
 * ORIGINAL SOURCE: src/app/core/data/proxy/service.js@v3.4
 */

const {base, inherit} = require('core/utils/utils');
const BaseService = require('core/data/service');
const {XHR} = require('core/utils/utils');

function ProxyService(){
  base(this);
  this._getProxyUrl = function(){
    const ApplicationService = require('core/applicationservice');
    return `${ApplicationService.getProxyUrl()}`;
  };
  /**
   *
   * @param data: Object conitans data to pass to proxy
   * @returns {Promise<{data: string, response: *}>}
   */
  this.wms = async function({url, method='GET', params={}, headers={}}={}){
    const proxyUrl = this._getProxyUrl();
    if (method === 'GET') {
      url = new URL(url);
      Object.keys(params).forEach(param => url.searchParams.set(param, params[param]));
      url = url.toString();
    }
    try {
      const data = JSON.stringify({
        url,
        params,
        headers,
        method
      });
      const response = await XHR.post({
        url: proxyUrl,
        contentType: 'application/json',
        data
      });
      return {
        response,
        data
      };
    } catch(err){
      return;
    }
  };

  this.wmsgetfeatureinfo = function({url, method='GET', params={}}){
    const proxyUrl = this._getProxyUrl();
    // {
    //   SERVICE:
    //     WMS
    //   VERSION:
    //     1.3.0
    //   REQUEST:
    //     GetFeatureInfo
    //   CRS:
    //     EPSG:3857
    //   LAYERS:
    //     buildings_2f43dc1d_6725_42d2_a09b_dd446220104a,roads_ea006d6f_bd87_4635_aae0_4e9e7842b3f4,work_areas_f0ecbe28_cbd1_4a38_8a57_ab6da91473fe
    //   QUERY_LAYERS:
    //     buildings_2f43dc1d_6725_42d2_a09b_dd446220104a,roads_ea006d6f_bd87_4635_aae0_4e9e7842b3f4,work_areas_f0ecbe28_cbd1_4a38_8a57_ab6da91473fe
    //   INFO_FORMAT:
    //     application/vnd.ogc.gml
    //   FEATURE_COUNT:
    //     5
    //   WITH_GEOMETRY:
    //     true
    //   DPI:
    //     96
    //   FI_POINT_TOLERANCE:
    //     10
    //   FI_LINE_TOLERANCE:
    //     10
    //   FI_POLYGON_TOLERANCE:
    //     10
    //   G3W_TOLERANCE:
    //     11.940845527294917
    //   I:
    //     235
    //   J:
    //     448
    //   WIDTH:
    //     470
    //   HEIGHT:
    //     898
    //   STYLES:
    //     BBOX:
    //       1251860.333813308,5433042.921959843,1252421.5535530911,5434115.209888193
    // }
    return XHR.post({
      url: proxyUrl,
      contentType: 'application/json',
      data: JSON.stringify({
        url,
        params,
        method
      })
    })
  };

  /**
   * Generic proxy data function
   * @param params
   */
  this.data = function(params={}){}
}

inherit(ProxyService, BaseService);

export default new ProxyService();