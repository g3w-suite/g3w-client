import WMSLayersPanel from './vue/panel/wmslayerspanel';
import {LOCALSTORAGE_EXTERNALWMS_ITEM} from '../../constant';
import ApplicationService  from 'core/applicationservice';
import ProjectsRegistry  from 'core/project/projectsregistry';
import utils  from 'core/utils/utils';
import DataRouteService  from 'core/data/routerservice';
import GUI  from 'gui/gui';
class Service {
  constructor(options={}) {
    const {wmsurls=[]} = options;
    this.projectId = ProjectsRegistry.getCurrentProject().getId(); // get current project id used to store data or get data to current project
    this.panel;
    this.state = {
      adminwmsurls: wmsurls, // coming from admin wmsurls
      localwmsurls: []
    };
    this.loadClientWmsUrls()
      .then(urls => this.state.localwmsurls = urls);
    ProjectsRegistry.onafter('setCurrentProject', async project => {
      this.projectId = project.getId();
      this.state.adminwmsurls = project.wmsurls || [];
      this.state.localwmsurls = await this.loadClientWmsUrls();
    })
  }
  /**
   * Getting Wms Urls from local browser storage
   */
  async loadClientWmsUrls(){
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
  changeLayerData(name, attribute={}){
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
  getRequestStatusObject({error=false, added=false}={}){
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
  addNewWmsUrl = async function(wmsurl){
    const findwmsurl = this.state.localwmsurls.find(url => url == wmsurl);
    const status = this.getRequestStatusObject({
      added: !!findwmsurl
    });
    if (!findwmsurl) {
      try {
        const response = await this.getWMSLayers(wmsurl);
        // if result (meaning reponse in done right)
        if (response.result) {
          const data = this.getLocalWMSData();
          this.state.localwmsurls.push(wmsurl);
          data.urls = this.state.localwmsurls;
          this.updateLocalWMSData(data);
          response.wmsurl = wmsurl;
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
  deleteWms(name){
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
  checkIfWMSAlreadyAdded({url, layers=[]}={}){
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
  deleteWmsUrl(wmsurl){
    this.state.localwmsurls = this.state.localwmsurls.filter(url => url !== wmsurl);
    const data = this.getLocalWMSData();
    data.urls = this.state.localwmsurls;
    this.updateLocalWMSData(data);
  };

  /**
   * Method to lad data from server and show wms layer panel
   * @param wmsurl
   * @returns {Promise<{added: boolean, error: boolean}>}
   */
  loadWMSDataAndShowWmsLayersPanel = async function(wmsurl){
    const status = this.getRequestStatusObject();
    try {
      const response = await this.getWMSLayers(wmsurl);
      status.error = !response.result;
      if (response.result){
        response.wmsurl = wmsurl;
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
  showWmsLayersPanel(config={}){
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
  getWMSLayers = async function(url){
    let response = {
      result: false,
      layers: [],
      info_formats:[],
      abstract: null,
      map_formats: [],
      title: null
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
    if (response.result) return response;
    return response;
  };

  loadWMSLayerToMap({url, name, epsg, position, opacity, visible=true, layers=[]}={}){
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
  addWMSlayer = async function({url, name=`wms_${utils.uniqueId()}`, epsg, position, layers=[], opacity=1, visible=true}={}){
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
  getLocalWMSData(){
    return ApplicationService.getLocalItem(LOCALSTORAGE_EXTERNALWMS_ITEM) && ApplicationService.getLocalItem(LOCALSTORAGE_EXTERNALWMS_ITEM)[this.projectId];
  };

  /**
   * Method to update local storage data based on changes
   * @param data
   */
  updateLocalWMSData(data){
    // in case for the firs time is non present set empty object
    const alldata = ApplicationService.getLocalItem(LOCALSTORAGE_EXTERNALWMS_ITEM) || {};
    alldata[this.projectId] = data;
    ApplicationService.setLocalItem({
      id: LOCALSTORAGE_EXTERNALWMS_ITEM,
      data: alldata
    })
  };

  clear(){
    this.panel = null;
  };
}



export default Service