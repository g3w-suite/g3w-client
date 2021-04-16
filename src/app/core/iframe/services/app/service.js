const {base, inherit,  createFilterFormField } = require('core/utils/utils');
const ProjectsRegistry = require('core/project/projectsregistry');
const BaseService = require('../baseservice');
const DataRouterService = require('core/data/routerservice');
const GUI = require('gui/gui');

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

  this.project = ProjectsRegistry.getCurrentProject();
  this.mapService = GUI.getComponent('map').getService();
  this.init = function(){
    return new Promise((resolve, reject) =>{
      this.mapService.once('ready', ()=>{
        this._map = this.mapService.getMap();
        this._mapCrs = this.mapService.getCrs();

        // set alias url to project
        this._iFrameSetCurrentAfterKey = ProjectsRegistry.onafter('setCurrentProject', project => {
          this.project = project;
          this.projectsDialog && this.projectsDialog.modal('hide');
        });

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
    capture ? this.mapControls.screenshot.control.overwriteOnClickEvent(async() =>{
      try {
        const blob = await this.mapService.createMapImage();
        this.emit('response', {
          action:'app:screenshot',
          response: {
            result: true,
            data: blob
          }
        })
      } catch(err){


      }

    }) : this.mapControls.screenshot.control.resetOriginalOnClickEvent();
  };

  /**
   *
   * @param bool
   */
  this.showchangemap = function(bool=false){
    this.mapControls.changeMap.control =  this.mapService.createMapControl('onclick', {
      id: "iframe-change-map",
      options: {
        add: true,
        name: "change-map",
        tipLabel: "Change Map",
        customClass: GUI.getFontClass('change-map'),
        onclick: async () => {
          this._changeProjectModalWindow({
            projects
          });
          return true;
        }
      }
    });
  };

  //method to zoom to features
  this.zoomtofeature = async function(params={}){
    return new Promise(async (resolve, reject) => {
      const {qgis_layer_id, feature:{field, value}, highlight=false} = params;
      const layer = this.project.getLayerById(qgis_layer_id);
      const search_endpoint = this.project.getSearchEndPoint();
      const { data=[] } = await DataRouterService.getData('search:features', {
        inputs: {
          layer,
          search_endpoint,
          filter: createFilterFormField({
            layer,
            search_endpoint,
            field,
            value
          })
        },
        outputs: false
      });
      data.length && this.mapService.zoomToFeatures(data[0].features, {
        highlight
      });
      resolve();
    })

  };

  this.changeMap = function({gid}) {
    return ApplicationService.changeProject({
      host: this._host,
      gid
    })
  };

  this.clear = function(){
    ProjectsRegistry.un('setCurrentProject', this._iFrameSetCurrentAfterKey);
    this._mapService.removeControlById('iframe-change-map');
  }
}

inherit(AppService, BaseService);

module.exports = new AppService;