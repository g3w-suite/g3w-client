const GUI = require('gui/gui');
const ProjectsRegistry = require('core/project/projectsregistry');

function Service(config={}){
  this.interval;
  this.project = ProjectsRegistry.getCurrentProject();
  GUI.once('ready', ()=>{
    this.mapService = GUI.getComponent('map').getService();
  });
  this.config = config;
  const {layers=[]} = config;
  this.state = {
    loading: false,
    layers: layers.map(({id, timeseries:{range, format, startdate, enddate}}) =>{
      const projectLayer = this.project.getLayerById(id);
      return {
        id,
        name: projectLayer.getName(),
        range,
        format,
        startdate,
        enddate
      }
    })
  }
}

const proto = Service.prototype;

proto.getTimeLayer = function({layerId, date}={}){
  return new Promise((resolve, reject) =>{
    const projectLayer = this.project.getLayerById(layerId);
    projectLayer.setChecked(true);
    const mapLayerToUpdate = this.mapService.getMapLayerByLayerId(layerId);
    let FILTER = `${projectLayer.getWMSLayerName()}:"${this.config.layers[0].timeseries.field}"  = '${date}'`;
    mapLayerToUpdate.once('loadend', resolve);
    this.mapService.updateMapLayer(mapLayerToUpdate, {
      force: false,
      FILTER
    });
  })
};

/**
 * Clear time series
 */
proto.clear = function(){
  this.state.layers.forEach(layer => {
    const mapLayerToUpdate = this.mapService.getMapLayerByLayerId(layer.id);
    this.mapService.updateMapLayer(mapLayerToUpdate, {
      force: false,
      FILTER: undefined
    })
  });
  this.interval = null;
};

export default Service;