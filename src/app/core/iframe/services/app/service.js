const ProjectsRegistry = require('core/project/projectsregistry');
const { createFilterFormField } = require('core/utils/utils');
const GUI = require('gui/gui');

function AppService(){
  this.mapControls = {
    query: {
      control: null,
      eventType: 'picked'
    },
    queryBBox: {
      control: null,
      eventType: null
    },
    changeMap: {
      control: null
    }
  };

  this.project = ProjectsRegistry.getCurrentProject();
  this.mapService = GUI.getComponent('map').getService();
  this.mapService.once('ready', ()=>{
    this._map = this.mapService.getMap();
    this._mapCrs = this.mapService.getCrs();
    this._iFrameSetCurrentAfterKey;
    // set alias url to project
    this._iFrameSetCurrentAfterKey = ProjectsRegistry.onafter('setCurrentProject', project => {
        this.project = project;
        this.projectsDialog && this.projectsDialog.modal('hide');
      });
    const projects = ProjectsRegistry.getListableProjects().map(project => {
        project.title = this.filterProjectName(project.title);
        return project;
      });
    this.mapControls.query.control = this.mapService.getMapControlByType({
        type: 'query'
      });
    this.setReady(true);
  });

  // function to intercept window parent result responses
  this.redirectresults = function(bool=false){
    this._mapControls.query.control.overwriteEventHandler({
      eventType: this._mapControls.query.eventType,
      handler: (evt) => {
        const {coordinates} = evt;
        const layers = this._setQueryLayers();
        alert('Query')
      }
    });
  };

  // method to show change map mapcontrol
  this.showchangemap = function(bool=false){
    this.mapControls.changeMap.control =  this.mapService.createMapControl('onclick', {
      id: "iframe-change-map",
      options: {
        add: true,
        name: "change-map",
        tipLabel: "Cambio mappa",
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
      const {data} = await layer.getFeatures({
        filter: createFilterFormField({
          layer,
          search_endpoint: this.project.getSearchEndPoint(),
          field,
          value
        })
      });
      const {features} = data[0];
      this.mapService.zoomToFeatures(features, {
        highlight
      });
      resolve({
        result: true
      })
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
    this._mapControls.query.control.resetOriginalHandlerEvent(this._mapControls.query.eventType);
    this._mapService.removeControlById('iframe-change-map');
  }
}

module.exports = new AppService;