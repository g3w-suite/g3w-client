import WMSLayersPanel from './vue/panel/wmslayerspanel';
import {LOCALSTORAGE_EXTERNALWMS_ITEM} from '../../constant';
const ApplicationService = require('core/applicationservice');
const ProjectsRegistry = require('core/project/projectsregistry');
const {uniqueId} = require('core/utils/utils');
const DataRouteService = require('core/data/routerservice');
const GUI = require('gui/gui');

function Service(options={}){
  const {wmsurls=[]} = options;
  this.projectId = ProjectsRegistry.getCurrentProject().getId(); // get current project id used to store data or get data to current project
  this.panel;
  this.state = {
    adminwmsurls: wmsurls, // coming from admin wmsurls
    localwmsurls: this.loadClientWmsUrls(),
    added: {
      layer: false, // setted true id layer is already added (name or layer)
      url: false // true if url is already added
    }
  };
  ProjectsRegistry.onafter('setCurrentProject', project => {
    this.projectId = project.getId();
    this.state.localwmsurls = this.loadClientWmsUrls();
  })
}

const proto = Service.prototype;

/**
 * Getting Wms Urls from local browser storage
 */
proto.loadClientWmsUrls = function(){
  let data = this.getLocalWMSData();
  if (data === undefined){
    data = {
      urls: [], // unique url fro wms
      wms: {} // object contain url as key and array of layers bind to url
    };
    this.updateLocalWMSData(data);
  }
  GUI.once('ready', ()=>{
    setTimeout(()=>{
      const mapService = GUI.getService('map');
      mapService.on('remove-external-layer', name => this.deleteWms(name));
      mapService.on('change-layer-position-map', ({id:name, position}={}) => this.changeLayerPosition({name, position}));
      // load eventually data
      Object.keys(data.wms).forEach(url =>{
        data.wms[url].forEach(config => {
          this.loadWMSLayerToMap({
            url,
            ...config
          })
        })
      });
    })
  });
  return data.urls;
};

proto.changeLayerPosition = function({name, position}={}){
  const data = this.getLocalWMSData();
  Object.keys(data.wms).find(wmsurl =>{
    const wmsConfigLayers = data.wms[wmsurl];
    const index = wmsConfigLayers.findIndex(config => config.name == name);
    if (index !== -1) {
      wmsConfigLayers[index].position = position;
      return true
    }
  });
  this.updateLocalWMSData(data);
};

/**
 * Add new
 * @param wmsurl
 * @returns {*}
 */
proto.addNewWmsUrl = async function(wmsurl){
  const findwmsurl = this.state.localwmsurls.find(url => url == wmsurl);
  if (!findwmsurl) {
    const data = this.getLocalWMSData();
    this.state.localwmsurls.push(wmsurl);
    data.urls = this.state.localwmsurls;
    this.updateLocalWMSData(data);
    this.showWmsLayersPanel(wmsurl);
  }
  return findwmsurl;
};

/**
 * Delete WMS
 * @param name
 */
proto.deleteWms = function(name){
  const data = this.getLocalWMSData();
  Object.keys(data.wms).find(wmsurl =>{
    const wmsConfigLayers = data.wms[wmsurl];
    const index = wmsConfigLayers.findIndex(config => config.name == name);
    if (index !== -1) {
      wmsConfigLayers.splice(index, 1);
      if (wmsConfigLayers.length == 0) delete data.wms[wmsurl];
      return true
    }
  });
  this.updateLocalWMSData(data);
};
/**
 * Method to find if name or layer of a specific url is already added
 * @param name
 * @param layers
 */
proto.checkIfWMSAlreadyAdded = function({url, layers=[]}={}){
  let added = false;
  const data = this.getLocalWMSData();
  if (data.wms[url]){
    added = !!data.wms[url].find(({layers:addedLayers}) => {
      const layersLength = layers.length;
      if (addedLayers.length === layersLength){
        return layers.reduce((accumulator, layerName) =>{
          return accumulator + addedLayers.indexOf(layerName) !== -1 ? 1 : 0;
        },0) === layersLength;
      }
    })
  }
  return added;
};

proto.deleteWmsUrl = function(wmsurl){
  this.state.localwmsurls = this.state.localwmsurls.filter(url => url !== wmsurl);
  const data = this.getLocalWMSData();
  data.urls = this.state.localwmsurls;
  this.updateLocalWMSData(data);
};

proto.showWmsLayersPanel = function(wmsurl){
  this.panel = new WMSLayersPanel({
    wmsurl,
    service: this
  });
  this.panel.show();
  return this.panel;
};

proto.getWMSLayers = async function(url){
  let response = {
    result: false,
    layers: []
  };
  try {
    response = await DataRouteService.getData('ows:wmsCapabilities', {
      inputs: {
        url
      },
      outputs: false
    });
  } catch(err){
    console.log(err)
  }
  if (response.result){
    const {layers=[]} = response;
    return layers;
  }
  return [];
};

proto.loadWMSLayerToMap = async function({url, name, epsg, position, layers=[]}={}){
  const mapService = GUI.getService('map');
  mapService.addExternalWMSLayer({
    url,
    name,
    layers,
    epsg,
    position
  });
};

/**
 * Method to check if a layer is already added to map
 * @param url
 * @param name
 * @param epsg
 * @param position
 * @param layers
 * @returns {Promise<void>}
 */
proto.addWMSlayer = async function({url, name=`wms_${uniqueId()}`, epsg, position, layers=[]}={}){
  const data = this.getLocalWMSData();
  if (data.wms[url] == undefined) {
    data.wms[url] = [{
      name,
      layers,
      epsg,
      position
    }];
  } else {
    data.wms[url].push({
      name,
      layers,
      epsg,
      position
    });
  }
  this.updateLocalWMSData(data);
  await this.loadWMSLayerToMap({
    url,
    name,
    epsg,
    position,
    layers
  });
  this.panel.close();
};

proto.getLocalWMSData = function(){
  return ApplicationService.getLocalItem(LOCALSTORAGE_EXTERNALWMS_ITEM) && ApplicationService.getLocalItem(LOCALSTORAGE_EXTERNALWMS_ITEM)[this.projectId];
};

proto.updateLocalWMSData = function(data){
  // in case for the firs time is non present set empty object
  const alldata = ApplicationService.getLocalItem(LOCALSTORAGE_EXTERNALWMS_ITEM) || {};
  alldata[this.projectId] = data;
  ApplicationService.setLocalItem({
    id: LOCALSTORAGE_EXTERNALWMS_ITEM,
    data: alldata
  })
};

proto.clear = function(){
  this.panel = null;
};


export default Service