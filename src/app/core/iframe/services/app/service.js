const {base, inherit } = require('core/utils/utils');
const BaseService = require('../baseservice');
const DataRouterService = require('core/data/routerservice');

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

module.exports = new AppService;