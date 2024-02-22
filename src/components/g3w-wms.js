/**
 * @file
 * @since 3.10.0
 */

import { LOCALSTORAGE_EXTERNALWMS_ITEM } from 'app/constant';
import Panel                             from 'core/g3w-panel';
import Component                         from 'core/g3w-component';
import ProjectsRegistry                  from 'store/projects';
import DataRouterService                 from 'services/data';
import ApplicationService                from 'services/application';
import GUI                               from 'services/gui';
import { getUniqueDomId }                from 'utils/getUniqueDomId';

import * as vueComp                      from 'components/WMS.vue';
import * as vuePanelComp                 from 'components/WMSLayersPanel.vue';

/**
 * ORIGINAL SOURCE:
 * - src/app/gui/wms/vue/wms.js@v3.9.3
 * - src/app/gui/wms/service.js@3.8.15
 */
export default function(opts = {}) {

  /**
   * Current project id used to store data or get data to current project
   */
  let PID = ProjectsRegistry.getCurrentProject().getId();

  const state = {
    adminwmsurls: opts.wmsurls || [],
    localwmsurls: [] // array of object {id, url}
  };

  let panel;

  const service = {

    /**
     * Change config of storage layer options as position, opacity
     */
    changeLayerData(name, attr = {}) {
      const data = this.getLocalWMSData();
      Object.keys(data.wms).find(url => {
        const i = data.wms[url].findIndex(l => l.name == name);
        if (-1 !== i) {
          data.wms[url][i][attr.key] = attr.value;
          return true;
        }
      });
      this.updateLocalWMSData(data);
    },

    /**
     * Add new WMS url
     * 
     * @param { Object } wms
     * @param { string } wms.id
     * @param { string } wms.url
     * 
     * @returns {*}
     */
    async addNewUrl(wms) {
      const found  = state.localwmsurls.find(l => l.url == wms.url || l.id == wms.id);
      const status = { error: false, added: !!found };
      // when url is not already added
      if (!found) {
        try {
          const response = await this.getWMSLayers(wms.url);
          // skip on invalid response
          if (!response.result) {
            throw 'invalid response';
          }
          const data = this.getLocalWMSData();
          state.localwmsurls.push(wms);
          data.urls = state.localwmsurls;
          this.updateLocalWMSData(data);
          response.wmsurl = wms.url;
          this.showWmsLayersPanel(response);
        } catch(e) {
          console.warn(e);
          status.error = true;
        }
      }
      return status;
    },

    /**
     * Delete WMS by name
     * 
     * @param name
     */
    deleteWms(name) {
      const data = this.getLocalWMSData();
      Object.keys(data.wms).find(url => {
        const index = data.wms[url].findIndex(w => w.name == name);
        /** @TODO add description */
        if (-1 !== index) {
          data.wms[url].splice(index, 1);
        }
        /** @TODO add description */
        if (-1 !== index && 0 == data.wms[url].length) {
          delete data.wms[url];
        }
        return true;
      });
      this.updateLocalWMSData(data);
    },

    /**
     * Delete url from local storage
     * @param id
     */
    deleteWmsUrl(id) {
      state.localwmsurls = state.localwmsurls.filter(l => id !== l.id);
      const data = this.getLocalWMSData();
      data.urls  = state.localwmsurls;
      this.updateLocalWMSData(data);
    },

    /**
     * ORIGINAL SOURCE: src/app/gui/wms/vue/panel/wmslayerspanel.js@3.8.15
     * 
     * show add wms layers to wms panel
     * 
     * @param config
     * 
     * @returns { WmsLayersPanel }
     */
    showWmsLayersPanel(config={}) {
      panel = new Panel({
        service:       this,
        id:            getUniqueDomId(),
        title:         'sidebar.wms.panel.title',
        internalPanel: new (Vue.extend(vuePanelComp))({ service: this, config }),
        show:          true,
      });
      return panel;
    },

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
    async getWMSLayers(url) {
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
      } catch(e) {
        console.warn(e);
      }
      return response;
    },

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
    async addWMSlayer({
      url,
      name    = `wms_${getUniqueDomId()}`,
      layers  = [],
      epsg,
      position,
      visible = true,
      opacity = 1,
    } = {}) {
      const data   = this.getLocalWMSData();
      const config = { url, name, layers, epsg, position, visible, opacity };

      if (undefined === data.wms[url]) {
        data.wms[url] = [config];
      } else {
        data.wms[url].push(config);
      }

      this.updateLocalWMSData(data);

      try {
        await GUI.getService('map').addExternalWMSLayer(config);
      } catch(err) {
        console.warn(err);
        GUI.getService('map').removeExternalLayer(name);
        this.deleteWms(name);
        setTimeout(() => { GUI.showUserMessage({ type: 'warning', message: 'sidebar.wms.layer_add_error' }) });
      }

      panel.close();
    },

    /**
     * Get local storage wms data based on current projectId
     * 
     * @returns {*}
     */
    getLocalWMSData() {
      const item = ApplicationService.getLocalItem(LOCALSTORAGE_EXTERNALWMS_ITEM);
      return item && item[PID];
    },

    /**
     * Update local storage data based on changes
     * 
     * @param data
     */
    updateLocalWMSData(data) {
      const alldata = ApplicationService.getLocalItem(LOCALSTORAGE_EXTERNALWMS_ITEM) || {};
      alldata[PID] = data;
      ApplicationService.setLocalItem({ id: LOCALSTORAGE_EXTERNALWMS_ITEM, data: alldata });
    },

    clear() {
      panel = null;
    },

  };

  service.state = state;

  // Load WMS urls from local storage
  GUI.isReady().then(async () => {

    const map = GUI.getService('map');

    await map.isReady();

    let data = service.getLocalWMSData();

    if (undefined === data) {
      data = {
        urls: [], // unique url for wms
        wms:  {}, // bject contain url as key and array of layers bind to url
      };
      service.updateLocalWMSData(data);
    }

    setTimeout(() => {
      map.on('remove-external-layer', name => service.deleteWms(name));

      map.on('change-layer-position-map', ({ id: name, position } = {}) => service.changeLayerData(name, { key: 'position', value: position }));
      map.on('change-layer-opacity',      ({ id: name, opacity } = {})  => service.changeLayerData(name, { key: 'opacity',  value: opacity }));
      map.on('change-layer-visibility',   ({ id: name, visible } = {})  => service.changeLayerData(name, { key: 'visible',  value: visible }));

      // load eventually data
      Object.keys(data.wms).forEach(url => { data.wms[url].forEach(d => map.addExternalWMSLayer({ url, ...d })); });
    });

    state.localwmsurls = data.urls;
  });

  ProjectsRegistry.onafter('setCurrentProject', async (project) => {
    service.projectId  = PID = project.getId();
    state.adminwmsurls = project.wmsurls || [];
  });

  const comp = new Component({
    ...opts,
    title: 'WMS',
    service,
    internalComponent: new (Vue.extend(vueComp))({ service }),
  });

  comp._setOpen = (b = false) => {
    comp.internalComponent.state.open = b;
    if (b) {
      GUI.closeContent();
    }
  };

  return comp;
}