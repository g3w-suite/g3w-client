/**
 * @file
 * @since v3.6
 */

import DataRouterService from 'services/data';

const { base, inherit } = require('utils');
const BaseService = require('core/iframe/services/baseservice');

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
  this.init = function(){
    return new Promise((resolve, reject) =>{
      this.mapService.once('ready', ()=>{
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
    capture ? DataRouterService.setOutputPlaces(['iframe']) : DataRouterService.resetDefaultOutput();
    return [];
  };

  this.screenshot = async function({capture=true}){
    const action = 'app:screenshot';
    capture ? this.mapControls.screenshot.control.overwriteOnClickEvent(async() =>{
      try {
        const blob = await this.mapService.createMapImage();
        this.emit('response', {
          action,
          response: {
            result: true,
            data: blob
          }
        })
      } catch(err){
        this.emit('response', {
          action,
          response: {
            result: false,
            data: err
          }
        })
      }
    }) : this.mapControls.screenshot.control.resetOriginalOnClickEvent();
  };


  /**
   * Eventually send as param the projection in which we would like get center of map
   * @param params
   * @returns {Promise<void>}
   */
  this.getcenter = async function(params={}){
    return this.mapService.getCenter();
  };

  /**
   * Zoom to coordinates
   * @param params
   * @returns {Promise<[]>}
   */
  this.zoomtocoordinates = async function(params={}){
    const {coordinates=[], highlight=false} = params;
    if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
      this.mapService.zoomTo(coordinates);
      return coordinates
    } else return Promise.reject(coordinates)
  };

  /**
   * Eventually send as param the projection in which we would like get center of map
   * @param params
   * @returns {Promise<void>}
   */
  this.getextent = async function(params={}){
    return this.mapService.getMapExtent();
  };

  /**
   *
   * @param params
   * @returns {Promise<[]>}
   */
  this.zoomtoextent = async function(params={}){
    const {extent=[]} = params;
    if (extent && Array.isArray(extent) && extent.length === 4){
      this.mapService.goToBBox(extent);
      return extent;
    } else return Promise.reject(extent);
  };


  //method to zoom to features
  this.zoomtofeature = async function(params={}){
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