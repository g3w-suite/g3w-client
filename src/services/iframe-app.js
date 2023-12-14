/**
 * @file
 * @since v3.6
 */

import DataRouterService from 'services/data';

const { base, inherit }  = require('utils');
const { normalizeEpsg }  = require('utils/geo');
const BaseService        = require('core/iframe/services/baseservice');
const Projections        = require('g3w-ol/projection/projections');


function AppService(){
  base(this);
  this.mapControls = {
    screenshot: {
      control: null
    },
    changeMap: {
      control: null
    }
  };

  /**
   * Init service
   * @returns {Promise<unknown>}
   */
  this.init = function() {
    return new Promise((resolve, reject) => {
      this.mapService.once('ready', () => {
        this._map = this.mapService.getMap();
        this._mapCrs = this.mapService.getCrs();
        this.mapControls.screenshot.control = this.mapService.getMapControlByType({
          type: 'screenshot'
        });
        this.setReady(true);
        resolve();
      });
    })

  };
  /**
   *
   * @returns {Promise<void>}
   */
  this.results = async function({capture=true}){
    capture ?
      DataRouterService.setOutputPlaces(['iframe']) :
      DataRouterService.resetDefaultOutput();
    return [];
  };

  /**
   *
   * @param capture
   * @returns {Promise<void>}
   */
  this.screenshot = async function({capture=true}) {
    const action = 'app:screenshot';
    capture ?
      this.mapControls.screenshot.control.overwriteOnClickEvent(async() => {
        try {
          const blob = await this.mapService.createMapImage();
          this.emit('response', {
            action,
            response: {
              result: true,
              data: blob
            }
          })
        } catch(err) {
          this.emit('response', {
            action,
            response: {
              result: false,
              data: err
            }
          })
        }
      }) :
      this.mapControls.screenshot.control.resetOriginalOnClickEvent();
  };

  /**
   * @since v3.7.1
   * @param epsg: Number Code of epsg Ex.4326
   * @returns String Normalize epsg: From number ex: 4326 to 'EPSG:4326'
   * @private
   */
  this._getEpsgFromParam = async function(epsg) {
    epsg = normalizeEpsg(epsg)
    await Projections.registerProjection(epsg);
    return epsg;
  }

  /**
   * Eventually send as param the projection in which we would like get center of map
   * @param params
   * @returns {Promise<void>}
   */
  this.getcenter = async function(params={}) {
    const center = this.mapService.getCenter();
    if (undefined === params.epsg) {
      return center;
    } else {
      const epsg = await this._getEpsgFromParam(params.epsg);
      return ol.proj.transform(center, this.mapService.getEpsg(), epsg);
    }
  };

  /**
   * Zoom to coordinates
   * @param params
   * @returns {Promise<[]>}
   */
  this.zoomtocoordinates = async function(params={}) {
    let {coordinates=[], highlight=false, epsg} = params;
    if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
      if (undefined === epsg) {
        this.mapService.zoomTo(coordinates);
      } else {
        //normalizated psg code
        epsg = await this._getEpsgFromParam(epsg);
        coordinates = ol.proj.transform(coordinates, epsg, this.mapService.getEpsg());
        this.mapService.zoomTo(coordinates);
      }
      return coordinates;
    } else {
      return Promise.reject(coordinates);
    }
  };

  /**
   * Eventually send as param the projection in which we would like get center of map
   * @param params
   * @returns {Promise<void>}
   */
  this.getextent = async function(params={}) {
    const extent = this.mapService.getMapExtent();
    if (undefined === params.epsg) {
      return extent;
    } else {
      const epsg = await this._getEpsgFromParam(params.epsg);
      return ol.proj.transformExtent(extent, this.mapService.getEpsg(), epsg);
    }
  };

  /**
   *
   * @param params
   * @returns {Promise<[]>}
   */
  this.zoomtoextent = async function(params={}) {
    let {extent=[], epsg} = params;
    if (extent && Array.isArray(extent) && extent.length === 4) {
      if (undefined === epsg) {
        this.mapService.goToBBox(extent);
      } else {
        epsg = this._getEpsgFromParam(epsg);
        extent = ol.proj.transformExtent(extent, epsg, this.mapService.getEpsg());
      }
      return extent;
    } else {
      return Promise.reject(extent);
    }
  };


  //method to zoom to features
  this.zoomtofeature = async function(params={}) {
    return new Promise(async (resolve, reject) => {
      let {qgs_layer_id, feature, highlight=false} = params;
      qgs_layer_id = this.getQgsLayerId({
        qgs_layer_id
      });

      const response = await this.findFeaturesWithGeometry({
        qgs_layer_id,
        feature,
        zoom:true,
        highlight
      });

      resolve(response.qgs_layer_id);
    })
  };
}

inherit(AppService, BaseService);

export default new AppService();