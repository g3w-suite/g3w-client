import {API_BASE_URLS} from 'constant';
const Projection = require('./projection');
const {XHR} = require('core/utils/utils');
const {normalizeEpsg} = require('core/utils/geo');

const Projections = {

  isRegistered(epsg) {
    return ol.proj.get(epsg);
  },

  get(crs={}) {
    const cachedProjection = this.isRegistered(crs.epsg);
    if (cachedProjection) return cachedProjection;
    const projection = new Projection({
      crs
    });
    ol.proj.addProjection(projection);
    ol.proj.proj4.register(proj4);
    return projection;
  },

  /**
   * Check and register epsg
   * 
   * @param epsg : "EPSG:<CODE>" Ex. "EPSG:4326"
   * @returns {Promise<unknown>}
   * @since v3.8
   */
  registerProjection(epsg) {
    return new Promise((resolve, reject) => {
      let projection = this.isRegistered(epsg);
      // check if already register
      if (projection) resolve(projection);
      else {
        XHR.get({url: `${API_BASE_URLS.CRS}${epsg.split(':')[1]}`})
          .then(({result, data}) => {
            if (result)  {
              data.epsg = normalizeEpsg(data.epsg);
              projection = this.get(data);
              ol.proj.proj4.register(proj4);
              resolve(projection);
            }
          })
          .catch(err => reject(err))
      }
    })
  }

};

module.exports = Projections;
