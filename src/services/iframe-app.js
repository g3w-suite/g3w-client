/**
 * @file
 * @since v3.6
 */

import DataRouterService from 'services/data';
import { BaseService }   from 'core/iframe/services/baseservice';

class AppService extends BaseService {

  constructor() {
    super();

    this.mapControls = {
      screenshot: { control: null },
      changeMap:  { control: null },
    };

  }

  /**
   * Init service
   * 
   * @returns {Promise<unknown>}
   */
  init() {
    return new Promise((resolve, reject) => {
      this.mapService.once('ready', () => {
        this._map    = this.mapService.getMap();
        this._mapCrs = this.mapService.getCrs();
        this.mapControls.screenshot.control = this.mapService.getMapControlByType({ type: 'screenshot' });
        this.setReady(true);
        resolve();
      });
    })

  }

  /**
   * @returns {Promise<void>}
   */
  async results({ capture = true }) {
    if (capture) {
      DataRouterService.setOutputPlaces(['iframe'])
    } else {
      DataRouterService.resetDefaultOutput();
    }
    return [];
  };

  async screenshot({ capture = true }) {
    if (capture) {
      this.mapControls.screenshot.control.overwriteOnClickEvent(
        async() => {
          try {
            this.emit('response', {
              action: 'app:screenshot',
              response: {
                result: true,
                data:   await this.mapService.createMapImage(),
              },
            });
          } catch(err) {
            this.emit('response', {
              action: 'app:screenshot',
              response: {
                result: false,
                data:   err,
              },
            });
          }
        }
      );
    } else {
      this.mapControls.screenshot.control.resetOriginalOnClickEvent();
    }
  }


  /**
   * Eventually send as param the projection in which we would like get center of map
   * 
   * @param params
   * 
   * @returns {Promise<void>}
   */
  async getcenter(params = {}) {
    return this.mapService.getCenter();
  }

  /**
   * Zoom to coordinates
   * 
   * @param params
   * 
   * @returns {Promise<[]>}
   */
  async zoomtocoordinates(params = {}) {
    const {
      coordinates = [],
      highlight = false
    } = params;
    if (coordinates && Array.isArray(coordinates) && 2 === coordinates.length) {
      this.mapService.zoomTo(coordinates);
      return coordinates;
    }
    return Promise.reject(coordinates);
  }

  /**
   * Eventually send as param the projection in which we would like get center of map
   * 
   * @param params
   * 
   * @returns {Promise<void>}
   */
  async getextent(params = {}) {
    return this.mapService.getMapExtent();
  }

  /**
   * @param params
   * 
   * @returns {Promise<[]>}
   */
  async zoomtoextent(params = {}) {
    const { extent = [] } = params;
    if (extent && Array.isArray(extent) && 4 === extent.length) {
      this.mapService.goToBBox(extent);
      return extent;
    }
    return Promise.reject(extent);
  };


  //method to zoom to features
  async zoomtofeature(params = {}) {
    return new Promise(async (resolve, reject) => {
      let {
        qgs_layer_id,
        feature,
        highlight = false
      } = params;

      qgs_layer_id = this.getQgsLayerId({ qgs_layer_id });

      const response = await this.findFeaturesWithGeometry({
        qgs_layer_id,
        feature,
        zoom: true,
        highlight,
      });

      resolve(response.qgs_layer_id);
    });
  }

}

export default new AppService();