import WMSLayersPanel                    from 'gui/wms/vue/panel/wmslayerspanel';
import { LOCALSTORAGE_EXTERNALWMS_ITEM } from 'app/constant';
import DataRouterService                 from 'services/data';
import ProjectsRegistry                  from 'store/projects';
import ApplicationService                from 'services/application';
import GUI                               from 'services/gui';

const { uniqueId } = require('utils');

function Service(options={}){
  const {wmsurls=[]} = options;

  /**
   * @FIXME add description
   */
  this.projectId = ProjectsRegistry.getCurrentProject().getId(); // get current project id used to store data or get data to current project

  /**
   * @FIXME add description
   */
  this.panel;

  /**
   * @FIXME add description
   */
  this.state = {
    adminwmsurls: wmsurls, // coming from admin wmsurls
    localwmsurls: []       // array of object {id, url}
  };

  GUI.isReady()
    .then(() => {
      GUI.getService('map')
        .isReady()
        .then(async () => { this.state.localwmsurls = await this.loadClientWmsUrls(); });
    })

  ProjectsRegistry.onafter('setCurrentProject', async project => {
    this.projectId          = project.getId();
    this.state.adminwmsurls = project.wmsurls || [];
  });

}

const proto = Service.prototype;

/**
 * Getting Wms Urls from local browser storage
 */
proto.loadClientWmsUrls = async function() {
  let data = this.getLocalWMSData();

  if (undefined === data) {
    data = {
      urls: [], // unique url for wms
      wms:  {}, // bject contain url as key and array of layers bind to url
    };
    this.updateLocalWMSData(data);
  }

  await GUI.isReady();

  setTimeout(() => {
    const map = GUI.getService('map');

    map.on('remove-external-layer', name => this.deleteWms(name));

    map.on('change-layer-position-map', ({ id: name, position } = {}) => this.changeLayerData(name, { key: 'position', value: position }));
    map.on('change-layer-opacity',      ({ id: name, opacity } = {})  => this.changeLayerData(name, { key: 'opacity',  value: opacity }));
    map.on('change-layer-visibility',   ({ id: name, visible } = {})  => this.changeLayerData(name, { key: 'visible',  value: visible }));

    // load eventually data
    Object.keys(data.wms).forEach(url => { data.wms[url].forEach(config => { this.loadWMSLayerToMap({ url, ...config }) }); });
  });

  return data.urls;
};

/**
 * Change config of storage layer options as position, opacity
 * 
 * @param name
 * @param config
 */
proto.changeLayerData = function(name, attribute={}) {
  const data = this.getLocalWMSData();
  Object
    .keys(data.wms)
    .find((wmsurl) => {
      const index = data.wms[wmsurl].findIndex(config => config.name == name);
      if (-1 !== index) {
        data.wms[wmsurl][index][attribute.key] = attribute.value;
        return true;
      }
    });

  this.updateLocalWMSData(data);
};

/**
 * Create a common status object
 * 
 * @param { Object } request
 * @param request.error
 * @param request.added
 * 
 * @returns {{ error, status: string }}
 */
proto.getRequestStatusObject = function({
  error = false,
  added = false,
} = {}) {
  return { error, added };
};

/**
 * Add new WMS url
 * 
 * @param { Object } wms
 * @param { string } wms.id
 * @param { string } wms.url
 * 
 * @returns {*}
 */
proto.addNewUrl = async function({
  id,
  url,
} = {}) {
  const found  = this.state.localwmsurls.find(({ id: localid, url: localurl }) => localurl == url || localid == id);
  const status = this.getRequestStatusObject({ added: !!found });

  // skip when url already added
  if (found) {
    return;
  }

  try {
    const response = await this.getWMSLayers(url);
    // skip on invalid response
    if (!response.result) {
      throw 'invalid response';
    }
    const data = this.getLocalWMSData();
    this.state.localwmsurls.push({ id, url });
    data.urls = this.state.localwmsurls;
    this.updateLocalWMSData(data);
    response.wmsurl = url;
    this.showWmsLayersPanel(response);
  } catch(err) {
    status.error = true;
  }

  return status;
};

/**
 * Delete WMS by name
 * 
 * @param name
 */
proto.deleteWms = function(name) {
  const data = this.getLocalWMSData();
  Object
    .keys(data.wms)
    .find(wmsurl => {
      const index = data.wms[wmsurl].findIndex(config => config.name == name);

      // skip when ..
      if (-1 === index) {
        return;
      }

      /** @TODO add description */
      data.wms[wmsurl].splice(index, 1);

      /** @TODO add description */
      if (0 == data.wms[wmsurl].length) {
        delete data.wms[wmsurl];
      }

      return true;
    });
  this.updateLocalWMSData(data);
};

/**
 * @param { Object } opts
 * @param opts.name
 * @param opts.layers
 * 
 * @returns { boolean } WMS is already added (by `name` or `layer` with a specific url) 
 */
proto.checkIfWMSAlreadyAdded = function({
  url,
  layers=[],
} = {}) {
  const data = this.getLocalWMSData();

  // wms url is not already added
  if (!data.wms[url]) {
    return false;
  }

  // check if wms layer is already added (by name)
  return undefined !== data.wms[url].find(({ layers: addedLayers }) => {
    if (addedLayers.length === layers.length) {
      return layers.reduce((totLen, name) => totLen + (-1 !== addedLayers.indexOf(name) ? 1 : 0), 0) === layers.length;
    }
  });
};

/**
 * Delete url from local storage
 * @param id
 */
proto.deleteWmsUrl = function(id) {
  this.state.localwmsurls = this.state.localwmsurls
    .filter(({id:localid}) => id !== localid);

  const data = this.getLocalWMSData();

  data.urls = this.state.localwmsurls;
  this.updateLocalWMSData(data);
};

/**
 * Load data from server and show wms layer panel
 * 
 * @param url
 * 
 * @returns { Promise<{ added: boolean, error: boolean }> }
 */
proto.loadWMSDataAndShowWmsLayersPanel = async function(url) {
  const status = this.getRequestStatusObject();
  try {
    const response = await this.getWMSLayers(url);
    status.error = !response.result;
    if (response.result) {
      response.wmsurl = url;
      this.showWmsLayersPanel(response);
    }
  } catch(err) {
    status.error = true;
  }
  return status;
};

/**
 * show add wms layers to wms panel
 * @param config
 * @returns {WmsLayersPanel}
 */
proto.showWmsLayersPanel = function(config={}) {
  this.panel = new WMSLayersPanel({ service: this, config });
  this.panel.show();
  return this.panel;
};

/**
 * Get data of wms url from server
 * 
 * @param { string } url
 * 
 * @returns { Promise<{
*    result:       boolean,
*    info_formats: [],
*    layers:       [],
*    map_formats:  [],
*    methods:      [],
*    abstract:     null,
*    title:        null,
*    }> }
 */
proto.getWMSLayers = async function(url) {
  // base schema of response
  let response = {
    result:       false,
    layers:       [],
    info_formats: [], // @deprecated since 3.9.0 (inside methods)
    abstract:     null,
    methods:      [], // @since 3.9.0
    map_formats:  [], // @deprecated since 3.9.0 (inside methods)
    title:        null
  };
  try {
    response = await DataRouterService.getData('ows:wmsCapabilities', { inputs: { url }, outputs: false });
  } catch(err) {
    console.warn(err);
  }
  return response;
};

/**
 * Load wms to map
 * 
 * @param { Object } wms
 * @param { string } wms.url
 * @param { string } wms.name
 * @param wms.epsg
 * @param wms.position
 * @param wms.opacity
 * @param wms.visible
 * @param wms.layers
 * 
 * @returns {*}
 */
proto.loadWMSLayerToMap = function({
  url,
  name,
  epsg,
  position,
  opacity,
  visible = true,
  layers  = [],
} = {}) {
  return GUI.getService('map').addExternalWMSLayer({ url, name, layers, epsg, position, visible, opacity });
};

/**
 * Check if a layer is already added to map
 * 
 * @param { Object } wms
 * @param { string } wms.url
 * @param { string } wms.name
 * @param wms.epsg
 * @param wms.position
 * @param wms.methods
 * @param wms.layers
 * 
 * @returns { Promise<void> }
 */
proto.addWMSlayer = async function({
  url,
  epsg,
  position,
  name    = `wms_${uniqueId()}`,
  layers  = [],
  opacity = 1,
  visible = true,
} = {}) {
  const data   = this.getLocalWMSData();
  const config = {
    url,
    name,
    layers,
    epsg,
    position,
    visible,
    opacity
  };

  if (undefined === data.wms[url]) {
    data.wms[url] = [config];
  } else {
    data.wms[url].push(config);
  }

  this.updateLocalWMSData(data);

  try {
    await this.loadWMSLayerToMap(config);
  } catch(err) {
    GUI.getService('map').removeExternalLayer(name);
    this.deleteWms(name);
    setTimeout(() => { GUI.showUserMessage({ type: 'warning', message: 'sidebar.wms.layer_add_error' }) });
  }

  this.panel.close();
};

/**
 * Get local storage wms data based on current projectId
 * 
 * @returns {*}
 */
proto.getLocalWMSData = function() {
  return (
    ApplicationService.getLocalItem(LOCALSTORAGE_EXTERNALWMS_ITEM) &&
    ApplicationService.getLocalItem(LOCALSTORAGE_EXTERNALWMS_ITEM)[this.projectId]
  );
};

/**
 * Update local storage data based on changes
 * 
 * @param data
 */
proto.updateLocalWMSData = function(data) {
  const alldata = ApplicationService.getLocalItem(LOCALSTORAGE_EXTERNALWMS_ITEM) || {};
  alldata[this.projectId] = data;
  ApplicationService.setLocalItem({ id: LOCALSTORAGE_EXTERNALWMS_ITEM, data: alldata });
};

proto.clear = function(){
  this.panel = null;
};


export default Service