import WMSLayersPanel from 'gui/wms/vue/panel/wmslayerspanel';
import { LOCALSTORAGE_EXTERNALWMS_ITEM } from 'app/constant';
import DataRouterService from 'services/data';
import ProjectsRegistry from 'store/projects';
import ApplicationService from 'services/application';
import GUI from 'services/gui';

const { uniqueId } = require('core/utils/utils');

function Service(options={}){
  const {wmsurls=[]} = options;
  this.projectId = ProjectsRegistry.getCurrentProject().getId(); // get current project id used to store data or get data to current project
  this.panel;
  this.state = {
    adminwmsurls: wmsurls, // coming from admin wmsurls
    localwmsurls: [] // contain array of object {id, url}
  };

  GUI.isReady().then(()=> {
    GUI.getService('map').isReady().then(async ()=>{
      this.state.localwmsurls = await this.loadClientWmsUrls();
    })
  })

  ProjectsRegistry.onafter('setCurrentProject', async project => {
    this.projectId = project.getId();
    this.state.adminwmsurls = project.wmsurls || [];
  })
}

const proto = Service.prototype;

/**
 * Getting Wms Urls from local browser storage
 */
proto.loadClientWmsUrls = async function(){
  let data = this.getLocalWMSData();
  if (data === undefined){
    data = {
      urls: [], // unique url fro wms
      wms: {} // object contain url as key and array of layers bind to url
    };
    this.updateLocalWMSData(data);
  }
  await GUI.isReady();
  setTimeout(()=>{
    const mapService = GUI.getService('map');
    mapService.on('remove-external-layer', name => this.deleteWms(name));
    mapService.on('change-layer-position-map', ({id:name, position}={}) => this.changeLayerData(name, {
      key: 'position',
      value: position
    }));
    mapService.on('change-layer-opacity', ({id:name, opacity}={}) => this.changeLayerData(name, {
      key: 'opacity',
      value: opacity
    }));
    mapService.on('change-layer-visibility', ({id:name, visible}={}) => this.changeLayerData(name, {
      key: 'visible',
      value: visible
    }));

    // load eventually data
    Object.keys(data.wms).forEach(url =>{
      data.wms[url].forEach(config => {
        this.loadWMSLayerToMap({
          url,
          ...config
        })
      })
    });
  });
  return data.urls;
};

/**
 * General Method to change config of storage layer options as position, opacity
 * @param name
 * @param config
 */
proto.changeLayerData = function(name, attribute={}){
  const data = this.getLocalWMSData();
  Object.keys(data.wms).find(wmsurl =>{
    const wmsConfigLayers = data.wms[wmsurl];
    const index = wmsConfigLayers.findIndex(config => config.name == name);
    if (index !== -1) {
      wmsConfigLayers[index][attribute.key] = attribute.value;
      return true
    }
  });
  this.updateLocalWMSData(data);
};

/**
 * Create a common status object
 * @param error
 * @param added
 * @returns {{error, status: string}}
 */
proto.getRequestStatusObject = function({error=false, added=false}={}){
  return {
    error,
    added
  }
};

/**
 * Add new
 * @param wmsurl
 * @returns {*}
 */
proto.addNewUrl = async function({id, url} = {}){
  const find = this.state.localwmsurls.find(({id:localid, url:localurl}) => localurl == url || localid == id);
  const status = this.getRequestStatusObject({
    added: !!find
  });
  if (!find) {
    try {
      const response = await this.getWMSLayers(url);
      // if result (meaning response in done right)
      if (response.result) {
        const data = this.getLocalWMSData();
        this.state.localwmsurls.push({
          id,
          url
        });
        data.urls = this.state.localwmsurls;
        this.updateLocalWMSData(data);
        response.wmsurl = url;
        this.showWmsLayersPanel(response);
      } else status.error = true;
    }
    catch(err){
      status.error = true;
    }
  }
  return status;
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

/**
 * Delete url from local storage
 * @param wmsurl
 */
proto.deleteWmsUrl = function(id){
  this.state.localwmsurls = this.state.localwmsurls.filter(({id:localid}) => id !== localid );
  const data = this.getLocalWMSData();
  data.urls = this.state.localwmsurls;
  this.updateLocalWMSData(data);
};

/**
 * Method to lad data from server and show wms layer panel
 * @param wmsurl
 * @returns {Promise<{added: boolean, error: boolean}>}
 */
proto.loadWMSDataAndShowWmsLayersPanel = async function(url){
  const status = this.getRequestStatusObject();
  try {
    const response = await this.getWMSLayers(url);
    status.error = !response.result;
    if (response.result){
      response.wmsurl = url;
      this.showWmsLayersPanel(response);
    }
  } catch(err){
    status.error = true;
  }
  return status;
};

/**
 * show addding wma layers wms panel
 * @param wmsurl
 * @returns {WmsLayersPanel}
 */
proto.showWmsLayersPanel = function(config={}){
  this.panel = new WMSLayersPanel({
    service: this,
    config
  });
  this.panel.show();
  return this.panel;
};

/**
 * gettind data of wms url from server
 * @param url
 * @returns {Promise<{result: boolean, info_formats: [], layers: [], map_formats: [], abstract: null, title: null}>}
 */
proto.getWMSLayers = async function(url){
  let response = {
    result: false,
    layers: [],
    info_formats:[],
    abstract: null,
    map_formats: [],
    title: null,
    getMap, //@since v3.9.0 https://github.com/g3w-suite/g3w-admin/issues/600
  };
  try {
    response = await DataRouterService.getData('ows:wmsCapabilities', {
      inputs: {
        url
      },
      outputs: false
    });
  } catch(err){
    console.log(err)
  }
  if (response.result) return response;
  return response;
};

proto.loadWMSLayerToMap = function({url, name, epsg, position, opacity, visible=true, layers=[]}={}){
  const mapService = GUI.getService('map');
  return mapService.addExternalWMSLayer({
    url,
    name,
    layers,
    epsg,
    position,
    visible,
    opacity
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
proto.addWMSlayer = async function({url, name=`wms_${uniqueId()}`, epsg, position, layers=[], opacity=1, visible=true}={}){
  const data = this.getLocalWMSData();
  const wmsLayerConfig = {
    url,
    name,
    layers,
    epsg,
    position,
    visible,
    opacity
  };
  if (data.wms[url] === undefined) data.wms[url] = [wmsLayerConfig];
  else data.wms[url].push(wmsLayerConfig);
  this.updateLocalWMSData(data);
  try {
    await this.loadWMSLayerToMap(wmsLayerConfig);
  } catch(err){
    const mapService = GUI.getService('map');
    mapService.removeExternalLayer(name);
    this.deleteWms(name);
    setTimeout(()=>{
      GUI.showUserMessage({
        type: 'warning',
        message: 'sidebar.wms.layer_add_error'
      })
    })
  }
  this.panel.close();
};

/**
 * Method to get local storage wms  data based on current projectId
 * @returns {*}
 */
proto.getLocalWMSData = function(){
  return ApplicationService.getLocalItem(LOCALSTORAGE_EXTERNALWMS_ITEM) && ApplicationService.getLocalItem(LOCALSTORAGE_EXTERNALWMS_ITEM)[this.projectId];
};

/**
 * Method to update local storage data based on changes
 * @param data
 */
proto.updateLocalWMSData = function(data){
  // in case for the firs time is no present set empty object
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