const ProjectsRegistry = require('core/project/projectsregistry');
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
  this.init = function(){
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
      this.mapControls.query.control = this.mapService.getMapControlByType({
        type: 'query'
      });
    });
  };

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

  this.showchangemap = function(bool=false){

  };

  this.zoomtofeature = async function(params={}){
    const {qgis_layer_id, field} = params;
    const layer = this.project.getLayerById(qgis_layer_id);
    layer.getFeatures({
      field: 'id|eq|17'
    }).then(({data}) =>{
      this.mapService.zoomToFeatures(data.features);
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

export default new AppService;