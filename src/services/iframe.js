/**
 * @file
 * @since v3.6
 */

import G3WObject                      from 'g3w-object';
import GUI                            from 'services/gui';
import DataRouterService              from 'services/data';
import ApplicationState               from 'store/application'
import PluginsRegistry                from 'store/plugins';
import Projections                    from 'store/projections';
import { normalizeEpsg }              from 'utils/normalizeEpsg';
import { getUniqueDomId }             from 'utils/getUniqueDomId';
import { waitFor }                    from 'utils/waitFor';

/**
 * @param epsg: Number Code of epsg Ex.4326
 * 
 * @returns String Normalize epsg: From number ex: 4326 to 'EPSG:4326'
 * 
 * @since 3.9.1
 */
async function _getEpsgFromParam(epsg) {
  epsg = normalizeEpsg(epsg)
  await Projections.registerProjection(epsg);
  return epsg;
}

/**
 * @example template.html
 * 
 * ```html
 * <!DOCTYPE html>
 * <html lang="en" style="width: 100%; height: 100%">
 * <head>
 *   <meta charset="UTF-8">
 *   <title>Test Iframe</title>
 * </head>
 * <body style="width:100%; height: 100%; margin: 0;">
 * <iframe style="width: 100%; height: 100%; border: 0;" src="http://192.168.1.4:3000/?project=test-iframe/qdjango/62"></iframe>
 * </body>
 * <script>
 *   // send message to iframe when app is ready
 *   const iframe = document.querySelector('iframe');
 *   window.addEventListener('message', evt => {
 *     const { action, response } = evt.data;
 *     if (action === "app:ready") {
 *       setTimeout(() => iframe.contentWindow.postMessage({
 *         id: null,                     // id of action,
 *         action: "<context>:<action>", // eg: "app:zoomtofeature"
 *         data: {}                      // data contain all mandatory attribute information
 *       }, '*'), 2000)
 *     }
 *   }, false);
 * </script>
 * </html>
 * ```
 */
class IframePluginService {

  constructor() {
    this.pendingactions              = {};
    this.getMessage                  = this.getMessage.bind(this);
    this.eventResponseServiceHandler = this.eventResponseServiceHandler.bind(this);
  }

  /**
   * @param { Object } opts
   * @param opts.project current project sends by application service
   */
  async init({
    project,
  } = {}) {

    await GUI.isReady();

    this.services = {
      app:     new AppService(),
      editing: new EditingService(),
    };

    // get layer attributes from project layers state
    const layers = project.state.layers.map(l => ({ id: l.id, name: l.name }));

    // initialize all services
    const serviceNames = Object.keys(this.services);

    for (let i = 0; i < serviceNames.length; i++) {
      const service = this.services[serviceNames[i]];
      // set common layer attribute service just one time
      if (undefined === service.getLayers()) {
        service.setLayers(layers);
      } 
      await service.init();
      service.on('response', this.eventResponseServiceHandler);
    }

    // Send post-message is ready
    this.postMessage({
      id:        null,
      action:   'app:ready',
      response: { result: true, data: { layers } },
    });

    window.addEventListener('message', this.getMessage, false);
  }

  // set eventResponse handler to alla services
  eventResponseServiceHandler({ action, response }) {
    this.postMessage({ id: null, action, response })
  }

  /**
   * Outputplace iframe get by DataRouteService
   * 
   * @param dataPromise
   * @param options
   * 
   * @returns { Promise<void> }
   */
  async outputDataPlace(dataPromise, options = {}) {
    let outputData;
    const { action = 'app:results' } = options;
    let { result, data = [] }        = await dataPromise;
    const parser                     = new ol.format.GeoJSON();
    try {
      outputData = data.map(({ layer, features }) => ({ [layer.getId()]: { features: parser.writeFeatures(features) } }));
    } catch(e) {
      console.warn(e);
      result     = false;
      outputData = e;
    }

    this.postMessage({
      id: null,
      action,
      response: { result, data: outputData }
    })
  }

  /**
   * post a message to parent
   */
  postMessage(message = {}) {
    if (window.parent) { window.parent.postMessage(message, '*') }
  }

  async stopPendingActions() {
    const promises = [];
    Object
      .keys(this.pendingactions)
      .forEach(id => {
        promises.push(this.services[this.pendingactions[id].context].stop());
        delete this.pendingactions[id];
      });
    return Promise.allSettled(promises)
  };

  /**
   * handle all messages from the window
   */
  async getMessage(evt) {
    if (evt && evt.data) {
      const {
        id =     getUniqueDomId(),
        single = true,
        action,
        data: params
      }                         = evt.data;
      const [ context, method ] = (action || '').split(':');
      let result                = false;
      let data;
      if (this.services[context]) {
        try {
          const is_ready = this.services[context].getReady();
          if (is_ready && single) {
            await this.stopPendingActions();
          }
          if (is_ready) {
            this.pendingactions[id] = { context };
            data = await this.services[context][method](params);
            result = true;
          }
        } catch(e) {
          console.warn(e);
          result = false;
          data   = e;
        }
        this.postMessage({
          id,
          action,
          response: { result, data },
        });
        delete this.pendingactions[id];
      }
    }
  }

  /**
   * Called when change map or clear
   */
  async clear() {
    const serviceNames = Object.keys(this.services);
    for (let i = 0; i < serviceNames.length; i++) {
      this.services[serviceNames[i]].off('response', this.eventResponseServiceHandler)
    }
    await this.stopPendingActions();
    window.removeEventListener('message', this.getMessage, false);
  }

}

/**
 * ORIGINAL SOURCE: src/app/core/iframe/services/baseservice.js@3.9.0
 */
class BaseIframeService extends G3WObject {

  constructor() {

    super();

    /**
     * @type { boolean }
     */
    this.ready      = false;

    /**
     * Map service
     */
    this.mapService = GUI.getService('map');

    /**
     * Current project
     */
    this.project    = ApplicationState.project;

    /**
     * @type { Array | undefined }
     */
    this.layers     = undefined;

    // common attributes between plugin service

    /**
     * ORIGINAL SOURCE: src/app/core/iframe/services/plugins/service.js@3.9.0
     * 
     * @since 3.9.1
     */
    this.pluginName;

    /**
     * ORIGINAL SOURCE: src/app/core/iframe/services/plugins/service.js@3.9.0
     * 
     * @since 3.9.1
     */
    this.dependencyApi = {};

  }

  /**
   * ORIGINAL SOURCE: src/app/core/iframe/services/plugins/service.js@3.9.0
   * 
   * @virtual method need to be implemented by subclasses
   * 
   * @since 3.9.1
   */
  async init({
    layers = {}
  } = {}) {
    this.layers = layers;

    // skip when plugin is not in configuration (ie. added to the application)
    if ('editing' !== this.pluginName || !ApplicationState.configurationPlugins.includes('editing')) {
      return;
    }

    // wait until "editing" plugin is loaded
    await waitFor(() => PluginsRegistry.getPlugin('editing'));

    // BACKOMP v3.x
    this.dependencyApi                     = PluginsRegistry.getPlugin('editing');
    this.dependencyApi.getEditableLayersId = this.dependencyApi.getEditableLayersId || (() => Object.keys(this.dependencyApi.getEditableLayers()));
    this.dependencyApi.hidePanel           = this.dependencyApi.hidePanel           || this.dependencyApi.hideEditingPanel;
    this.dependencyApi.resetDefault        = this.dependencyApi.resetDefault        || this.dependencyApi.resetAPIDefault;

    this.setReady(true);
  }
  /**
   * ORIGINAL SOURCE: src/app/core/iframe/services/plugins/service.js@3.9.0
   * 
   * @virtual method need to be implemented by subclasses 
   * 
   * @since 3.9.1
   */
  getDependecyApi() {
    return this.dependencyApi;
  }

  /**
   * Return a qgs_layer_id array based on passed qgis_layer_id
   * 
   * @param { Object } opts
   * @param { string | string[] | null | undefined } opts.qgs_layer_id
   * @param { Array } noValue
   * 
   * @returns { string[] } qgs_layer_id
   * 
   * @private
   */
  getQgsLayerId({
    qgs_layer_id,
    noValue = this.layers.map(l => l.id),
  }) {
    return qgs_layer_id ? [].concat(qgs_layer_id) : noValue;
  };

  /**
   * getFeature from DataProvider
   * 
   * @private
   */
  async searchFeature({
    layer,
    feature,
  }) {
    const { data = [] } = await DataRouterService.getData('search:features', {
      inputs: {
        layer,
        filter: [].concat(feature.value).map(v => `${feature.field}|eq|${encodeURIComponent(v)}`).join('|OR,')
      },
      outputs: false
    });
    return data;
  };

  /**
   * Search feature(s) by field and value
   * 
   * @param { Object } opts
   * @param opts.qgs_layer_id
   * @param opts.feature
   * @param opts.zoom
   * @param opts.highlight
   * 
   * @returns { Promise<{ qgs_layer_id: null, features: [], found: boolean }>}
   */
  async findFeaturesWithGeometry({
    feature,
    qgs_layer_id = [],
    zoom         = false,
    highlight    = false,
  } = {}) {
    const response = {
      found:        false,
      features:     [],
      qgs_layer_id: null
    };
    let layersCount = qgs_layer_id.length;
    let i = 0;
    while (!response.found && i < layersCount) {
      const layer = this.project.getLayerById(qgs_layer_id[i]);
      try {
        const data     = layer && await this.searchFeature({ layer, feature });
        const features = data.length && data[0].features;
        response.found = features && features.length > 0 && !!features.find(f => f.getGeometry());
        if (!features || !response.found) {
          throw 'invalid response';
        }
        response.features     = features;
        response.qgs_layer_id = qgs_layer_id[i];
        if (zoom) {
          await this.mapService.zoomToFeatures(features, { highlight });
        }
      } catch(e) { i++; console.warn(e);}
    }
    // in case of no response zoom to an initial extent
    if (!response.found) {
      this.mapService.zoomToExtent(this.mapService.project.state.initextent)
    }
    return response;
  }

  /**
   * Set layer function
   * 
   * @param layers
   */
  setLayers(layers = []) {
    this.layers = layers;
  }

  getLayers() {
    return this.layers;
  }

  /**
   * Set ready service
   * 
   * @param bool
   */
  setReady(bool = false) {
    this.ready = bool;
  }

  getReady() {
    return this.ready;
  }

  /**
   * Overwrite single service: Usefult to stop eventually running action
   * 
   * @virtual method need to be implemented by subclasses
   * 
   * @returns { Promise<void> }
   */
  async stop() {}

  /**
   * Overwrite each single service
   * 
   * @virtual method need to be implemented by subclasses
   */
  clear() {}

}

/**
 * ORIGINAL SOURCE: src/services/iframe-app.js@3.9.0
 */
class AppService extends BaseIframeService {

  constructor() {
    super();
    this.mapControls = {
      screenshot: { control: null },
      changeMap:  { control: null },
    };
  }

  /**
   * Init service
   * 
   * @returns { Promise<unknown> }
   */
  init() {
    return new Promise(resolve => {
      this.mapService.once('ready', () => {
        this._map                           = this.mapService.getMap();
        this._mapCrs                        = this.mapService.getCrs();
        this.mapControls.screenshot.control = this.mapService.getMapControlByType('screenshot');
        this.setReady(true);
        resolve();
      });
    })
  }

  /**
   * @returns { Promise<Array> }
   */
  async results({
    capture = true,
  }) {
    GUI.currentoutputplace = capture ? 'iframe' : 'gui';
    return [];
  }

  /**
   * @returns { Promise<void> }
   */
  async screenshot({
    capture = true,
  }) {
    // skip when ..
    if (!capture) {
      this.mapControls.screenshot.control.resetOriginalOnClickEvent();
      return;
    }

    this.mapControls.screenshot.control.overwriteOnClickEvent((blob) => {
      let response;
      try {
        response = { result: true, data: blob };
      } catch(e) {
        console.warn(e);
        response = { result: false, data: e };
      } finally {
        this.emit('response', { response, action: 'app:screenshot' });
      }
    });
  }

  /**
   * Eventually send as param the projection in which we would like get center of map
   * 
   * @param { Object } params
   * @param params.epsg since 3.9.1
   * 
   * @returns { Promise<void> }
   */
  async getcenter(params = {}) {
    const center = this.mapService.getCenter();
    if (undefined !== params.epsg) {
      return ol.proj.transform(
        center,
        this.mapService.getEpsg(),
        await _getEpsgFromParam(params.epsg)
      );
    }
    return center;
  }

  /**
   * Zoom to coordinates
   * 
   * @param { Object } params
   * @param { Array } params.coordinates
   * @param params.epsg since 3.9.1
   * 
   * @returns { Promise<Array> }
   */
  async zoomtocoordinates(params = {}) {
    let {
      coordinates = [],
      epsg,
    } = params;
    // skip when coordinates in params are null or are an array with more than item 2
    if (!(coordinates && Array.isArray(coordinates) && 2 === coordinates.length)) {
      return Promise.reject(coordinates);
    }
    if (undefined !== epsg) {
      // normalized psg code
      epsg        = await _getEpsgFromParam(epsg);
      coordinates = ol.proj.transform(coordinates, epsg, this.mapService.getEpsg());
    }
    this.mapService.zoomTo(coordinates);
    return coordinates;
  }

  /**
   * Eventually send as param the projection in which we would like get center of map
   * 
   * @param { Object } params
   * @param params.epsg since 3.9.1
   * 
   * @returns { Promise<void> }
   */
  async getextent(params = {}) {
    const extent = this.mapService.getMapExtent();
    /** @FIXME add description */
    if (undefined !== params.epsg) {
      return ol.proj.transformExtent(
        extent,
        this.mapService.getEpsg(),
        await _getEpsgFromParam(params.epsg)
      );
    }
    return extent;
  }

  /**
   * @param { Object } params
   * @param { Array } params.extent
   * @param params.epsg since 3.9.1
   * 
   * @returns { Promise<Array> }
   */
  async zoomtoextent(params = {}) {
    let { extent = [], epsg } = params;
    // skip when an extent is null ora an array with number of ites not equal to 4
    if (!(extent && Array.isArray(extent) && 4 === extent.length)) {
      return Promise.reject(extent);
    }
    /** If epsg is provide, get epsg definition */
    if (undefined !== epsg) {
      epsg   = _getEpsgFromParam(epsg);
      extent = ol.proj.transformExtent(extent, epsg, this.mapService.getEpsg());
    } else {
      this.mapService.goToBBox(extent);
    }
    return extent;
  };

  /**
   * Zoom to features
   * 
   * @param { Object } params
   * @param params.qgs_layer_id
   * @param params.feature
   * @param { boolean } params.highlight 
   * 
   * @returns { Promise } qgs_layer_id
   */
  async zoomtofeature(params = {}) {
    let {
      qgs_layer_id,
      feature,
      highlight = false,
    } = params;

    qgs_layer_id = this.getQgsLayerId({ qgs_layer_id });

    const response = await this.findFeaturesWithGeometry({
      qgs_layer_id,
      feature,
      zoom: true,
      highlight,
    });

    return response.qgs_layer_id;
  }

}

/**
 * ORIGINAL SOURCE: src/services/iframe-editing.js@3.9.0
 */
class EditingService extends BaseIframeService {

  constructor() {
    super();

    this.pluginName = 'editing';

    this.subscribevents = [];
  
    this.isRunning = false;
  
    this.responseObject = {
      cb:           null, // resolve or reject promise method
      qgs_layer_id: null,
      error:        null,
    };
  
    this.config =  {
      tools: {
        add: {
          disabled:[
            { id: 'deletefeature' },
            { id: 'copyfeatures' },
            { id: 'editmultiattributes' },
            { id: 'deletePart' },
            { id: 'splitfeature' },
            { id: 'mergefeatures' },
          ]
        },
        update: {
          disabled: [
            { id: 'addfeature' },
            { id: 'copyfeatures' },
            { id: 'deletefeature' },
            { id: 'editmultiattributes' },
            { id: 'deletePart' },
            { id: 'splitfeature' },
            { id: 'mergefeatures' },
          ]
        },
        delete: {
          enabled: [
            { id:'deletefeature', options: { active: true } },
          ]
        }
      }
    };

    /**
     * subscribers handlers
     */
    this.subscribersHandlers = {

      canUndo:({ activeTool, disableToolboxes = [] }) => bool => {
        //set currenttoolbocx id in editing to null
        if (false === bool) {
          this.responseObject.qgs_layer_id = null;
          this.responseObject.error        = null;
        }
        activeTool.setEnabled(!bool);
        disableToolboxes.forEach(toolbox => toolbox.setEditing(!bool))
      },

      canRedo:() => {},

      //run callback
      cancelform:cb => () => { cb() },

      addfeature: ({ properties, toolboxes } = {}) => feature => {

        Object
          .keys(properties)
          .forEach(p => feature.set(p, properties[p]));

        let activeTool;
        const disableToolboxes = [];

        toolboxes
          .forEach(t => {
            const tool = t.getToolById('addfeature');
            if (tool.isActive()) {
              tool.setEnabled(false);
              activeTool = tool;
            } else {
              t.setEditing(false);
              disableToolboxes.push(t)
            }
          });

        // just one time
        if (this.subscribevents.find(e => 'canUndo' !== e.event)) {
          this.addSubscribeEvents('cancelform', this.addSubscribeEvents('canUndo', { activeTool, disableToolboxes }));
        }
      },

      closeeditingpanel: ({ qgs_layer_id }) => () => {
        // response to router service
        this.responseObject.cb({
          qgs_layer_id: this.responseObject.qgs_layer_id,
          error:        this.responseObject.error,
        });
        // stop action
        this.stopAction({ qgs_layer_id });
      },

    };

  }

  //@since 4.0.3 Store Interactions for draw_json action method
  #interactions = [];

  // METHODS CALLED FROM EACH ACTION METHOD

  /**
   * run before each action
   */
  async startAction({
    toolboxes,
    resolve,
    reject,
  }) {

    this.responseObject.cb = reject;

    // set same mode autosave
    this.dependencyApi.setSaveConfig({
      cb: {
        // called when commit changes are done successuffly
        done: toolbox => {
          //set toolbox id
          this.responseObject.cb           = resolve;
          this.responseObject.qgs_layer_id = toolbox.getId();
          this.responseObject.error        = null;
          // close panel that fire closeediting panel event
          this.dependencyApi.hidePanel();
        },
        // called whe commit change receive an error
        error: (toolbox, error) => {
          this.responseObject.cb           = reject;
          this.responseObject.qgs_layer_id = toolbox.getId();
          this.responseObject.error        = error;
        },
      }
    });

    // set toolboxes visible base on the value of qgs_layer_id
    this.dependencyApi.showPanel({ toolboxes });

    this.isRunning = true;
  }

  /**
   * run after each action
   */
  async stopAction(opts = {}) {
    if (opts.qgs_layer_id) {
      await this.stopEditing(opts.qgs_layer_id);
    }
  }

  /**
   * add subscribe refenrence
   */
  addSubscribeEvents(event, options = {}) {
    const handler = this.subscribersHandlers[event](options);
    this.dependencyApi.subscribe(event, handler);
    this.subscribevents.push({ event, handler });
    return handler;
  };

  /**
   * Reset subscriber editing plugin events
   */
  resetSubscribeEvents() {
    this.subscribevents.forEach(d => { this.dependencyApi.unsubscribe(d.event, d.handler); });
  };

  /**
   * Called whe we want to add a feature
   * 
   * @param { Object } config
   * @param config.qgs_layer_id
   * @param config.properties
   * 
   * @returns { Promise<void> }
   */
  add(config = {}) {
    return new Promise(async (resolve, reject) => {
      // skip when ..
      if (this.isRunning) {
        return reject();
      }

      // extract `qgs_layer_id9` from a configuration message
      const { qgs_layer_id: configQglLayerId, ...data } = config;
      const { properties }                              = data;

      const qgs_layer_id = this.getQgsLayerId({
        qgs_layer_id: configQglLayerId,
        noValue:      this.dependencyApi.getEditableLayersId(),
      });

      // call method common
      await this.startAction({ toolboxes: qgs_layer_id, resolve, reject });
        // return all toolboxes
      const toolboxes = (
          await this.startEditing(qgs_layer_id, {
            tools:            this.config.tools.add,
            startstopediting: false,
            action :          'add',
            selected:         1 === qgs_layer_id.length,
          })
        )
        .filter(p => 'fulfilled' === p.status)
        .map(p => p.value);

           /** @FIXME add description */
      if (!GUI.isSidebarVisible()) {
        GUI.showSidebar();
      }

      /** @FIXME add description */
      if (1 === toolboxes.length && toolboxes[0]) {
        toolboxes[0].setActiveTool(toolboxes[0].getToolById('addfeature'));
      }

      // in case of no feature add avent subscribe
      this.addSubscribeEvents('addfeature', { properties, toolboxes });
      this.addSubscribeEvents('closeeditingpanel', { qgs_layer_id })
    });
  }

  /**
   * Called when we want to update a know feature field
   * 
   * @param config
   * 
   * @returns { Promise<unknown> }
   */
  async update(config = {}) {
    return new Promise(async (resolve, reject) => {
      // skip when ..
      if (this.isRunning) {
        return reject();
      }

      const { qgs_layer_id: configQglLayerId, ...data } = config;
      const { feature } = data;
      const qgs_layer_id = this.getQgsLayerId({
        qgs_layer_id: configQglLayerId,
        noValue: this.dependencyApi.getEditableLayersId()
      });

      const response = await this.findFeaturesWithGeometry({
        qgs_layer_id,
        feature,
        zoom:      true,
        highlight: true,
        selected:  1 === qgs_layer_id.length // set selected toolbox
      });

      // skip when ..
      if (!response.found) {
        return reject();
      }

      await this.startAction({ toolboxes: [response.qgs_layer_id], resolve, reject });

      // return all toolboxes
      await this.startEditing([response.qgs_layer_id], {
        feature,
        tools:            this.config.tools.update,
        startstopediting: false,
        action:           'update',
      });

      if (!GUI.isSidebarVisible()) {
        GUI.showSidebar();
      }

      this.addSubscribeEvents('closeeditingpanel', { qgs_layer_id: [response.qgs_layer_id] });
    });
  }

  /**
   * @virtual method need to be implemented by subclasses 
   */
  delete() {}

  /**
   * Called when we want to start editing
   * 
   * @param { Array } qgs_layer_id
   * @param { Object } options
   * 
   * @returns { Promise< unknown | void > }
   */
  async startEditing(qgs_layer_id = [], options = {}) {
    const { action = 'add', feature } = options;
    const filter                      = {};
    options.filter                    = filter;
    switch (action) {
      case 'add':    filter.nofeatures = true;                                   break;
      case 'update': filter.field      = `${feature.field}|eq|${feature.value}`; break;
    }
    //only in case of one layer id start editing otherwise client need to click on the layer
    return await Promise.allSettled((1 === qgs_layer_id.length ? qgs_layer_id : [])
      .map(id => this.dependencyApi.startEditing(id, options) ));

  }

  /**
   * Stop editing
   * 
   * @param qgs_layer_id
   * 
   * @returns { Promise<unknown> }
   */
  async stopEditing(qgs_layer_id) {
    const promises = [];
    qgs_layer_id.forEach(id => { promises.push(this.dependencyApi.stopEditing(id)); });
    await Promise.allSettled(promises);
    this.clear();
  }

  stop() {
    return new Promise(resolve => {
      this.dependencyApi.hidePanel();
      GUI.hideSidebar();
      this.once('clear', resolve);
    });
  }

  /**
   * Remote layer editing (no UX)
   * 
   * @param { 'add' | 'update' | 'delete' | 'draw' | 'save' } method - action to be performed
   * @param { string } qgs_layer_id                                  - layer id
   * @param {*} geojson                                              - spatial data 
   * @returns
   * 
   * @since 4.0.3
   */
  async json({ qgs_layer_id, geojson, method }) {
    const VECTOR_URL = ApplicationState.project.state.vectorurl;
    const GID        = `${ApplicationState.project.getType()}/${ApplicationState.project.getId()}`;
    const fid        = geojson?.id.toString(); //get id of the feature in string
    const layer      = qgs_layer_id && GUI.getService('map').getMap().getLayers().getArray().find(l => qgs_layer_id === l.get('id')); // get editing layer
    let lock         = {};
    let commit       = { result: true };

    // skip when json is missing 
    if (!fid && ['add', 'update', 'delete'].includes(method)) {
      return;
    }

    // lock feature (by id)
    if (fid && ['update', 'delete', 'draw'].includes(method)) {
      try {
        if (fid.startsWith('_new_')) {
          lock.feature = (new ol.format.GeoJSON()).readFeature(geojson);
        } else { //check if already added 
          lock = await (await fetch(`${VECTOR_URL}editing/${GID}/${qgs_layer_id}/?fids=${fid}`)).json();
          lock = {
            ids:     lock?.featurelocks,
            feature: lock?.vector?.data && (new ol.format.GeoJSON()).readFeatures(lock.vector.data)[0]
          };
        }
        // Take in account possible properties passed by geojson that can be different from actual stored feature on db 
        if (lock.feature) {
          Object.entries(geojson?.properties ?? {}).forEach(([key, v]) => lock.feature.set(key, v));
        }
      } catch(e) {
        console.warn(e);
      }
    }

    // commit feature
    if (['add', 'update', 'delete'].includes(method)) {
      commit = 'update' === method && !lock.ids.length
        ? { result: false }
        : await (
          await fetch(`${VECTOR_URL}commit/${GID}/${qgs_layer_id}/`,
          {
            method:  'POST',
            headers: { "Content-Type": 'application/json' },
            body: JSON.stringify({
              "add":    [],
              "update": [],
              "delete": [],
              "relations": {},
              lockids: lock.ids || [],
              ...{ [method]: [ 'delete' === method ? geojson.id : geojson ] }
            }),
          })
        ).json();
    }

    // unlock layer
    if (['update', 'delete'].includes(method)) {
      await fetch(`${VECTOR_URL}unlock/${GID}/${qgs_layer_id}/`);
    }

    // Draw/modify geometry
    if ('draw' === method) {
      GUI.getService('map').disableClickMapControls(true);

      let geom  = g3wsdk.core.catalog.CatalogLayersStoresRegistry.getLayerById(qgs_layer_id).getGeometryType();
      // get open layers geometry
      if (geom.startsWith('Line'))              { geom = 'LineString'; }
      else if (geom.startsWith('MultiLine'))    { geom = 'MultiLineString'; }
      else if (geom.startsWith('Point'))        { geom = 'Point'; }
      else if (geom.startsWith('MultiPoint'))   { geom = 'MultiPoint'; }
      else if (geom.startsWith('Polygon'))      { geom = 'Polygon'; }
      else if (geom.startsWith('MultiPolygon')) { geom = 'MultiPolygon'; }
      else                                      { console.warn('invalid geometry type: ', geom); }

      // add stored feature (update)
      if (lock.feature) {
        layer.getSource().addFeature(lock.feature); 
      }
      
      // add new feature (draw)
      if (!lock.feature) { 
        const draw = new ol.interaction.Draw({ type: geom, source: layer.getSource() });
        draw.on(['drawstart', 'drawend'], e => {
          // clear layer and interactions
          if ('drawstart' === e.type) {
            layer.getSource().clear();
          }
          if('drawend' === e.type) {
            e.feature.setId(`_new_${Date.now()}`);
            window.parent.postMessage({
              action: 'editing:json',
              response : {
                result: true,
                data: {
                  method,
                  geojson: (new ol.format.GeoJSON()).writeFeatureObject(e.feature)
                },
              } 
            });
          }
        });
        GUI.getService('map').getMap().addInteraction(draw);
        this.#interactions.push(draw);
      }

      // modify
      const modify = new ol.interaction.Modify({ source: layer.getSource() });
      modify.on('modifyend', e => {
        window.parent.postMessage({
          action: 'editing:json',
          response: {
            result: true,
            data: {
              method,
              geojson: (new ol.format.GeoJSON()).writeFeatureObject(e.features.item(0))
            },
          } 
        })
      });

      // snap
      const snap = new ol.interaction.Snap({ source: layer.getSource() });

      GUI.getService('map').getMap().addInteraction(modify);
      this.#interactions.push(modify);

      GUI.getService('map').getMap().addInteraction(snap);
      this.#interactions.push(snap);
    }

    // save features (to layer)
    if ('save' === method) {
      if (layer) {
        geojson = (new ol.format.GeoJSON()).writeFeatureObject(layer.getSource().getFeatures()[0]);
        layer.getSource().clear();
        this.#interactions.forEach(i => GUI.getService('map').getMap().removeInteraction(i));
        this.#interactions = [];
      }
      GUI.getService('map').disableClickMapControls(false);
    }

    GUI.getService('map').refreshMap();

    if (!commit.result) {
      throw commit.errors ?? 'No feature ' + method;
    }

    // iframe response
    return {
      method,
      fid: commit?.response?.new?.at(0)?.id,
      geojson,
    };
  }

  /**
   * Called wen we want to reset default editing plugin behaviour
   */
  clear() {
    this.dependencyApi.resetDefault();
    this.isRunning      = false;
    this.responseObject = {
      cb:           null, // resolve or reject promise method
      qgs_layer_id: null,
      error:        null,
    };
    this.resetSubscribeEvents();
    this.emit('clear');
  }

}

export default new IframePluginService();