<!--
  @file
  @since v3.7
-->

<template>
  <ul class="treeview-menu g3w-tools menu-items">

    <!-- LOADING INDICATOR -->
    <li v-if="loading">
      <bar-loader :loading="loading"/>
    </li>

    <li class="new_wms_item">

      <!-- WMS NAME -->
      <div class="wms_url_input_content">
        <label
          for = "add_custom_name_url_wms_input"
          v-t = "'sidebar.wms.panel.label.name'">
        </label>
        <input
          id      = "add_custom_name_url_wms_input"
          v-model = "id"
          class   = "form-control"
          style   = "width: 100%; color:#000000;">
      </div>

      <!-- WMS URL -->
      <div class="wms_url_input_content">
        <label for="add_custom_url_wms_input">URL</label>
        <input
          id      = "add_custom_url_wms_input"
          v-model = "url"
          class   = "form-control"
          style   = "width: 100%; color:#000000;">
      </div>

      <!-- SUBMIT BUTTON -->
      <div>
        <button
          v-disabled          = "!inputswmsurlvalid"
          style               = "width: 100%;"
          @click.prevent.stop = "addwmsurl"
          class               = "btn btn-block skin-background-color"
        >
          <i :class="g3wtemplate.getFontClass('plus-square')"></i>
        </button>
      </div>

    </li>

    <!-- ERROR NOTICE -->
    <li v-if="status.error">
      <div
        class = "g3w-add-wms-url-message g3w-wmsurl-error"
        v-t   = "'server_error'">
      </div>
    </li>

    <!-- ERROR NOTICE: "WMS LAYER ALREADY ADDED" -->
    <li v-else-if="status.added">
      &#x26A0;&#xFE0F;
      <div
        class = "g3w-add-wms-url-message g3w-wmsurl-already-added"
        v-t   = "'sidebar.wms.url_already_added'">
      </div>
    </li>

    <li class="skin-border-color" style="background: transparent !important; border-top: 2px solid">
      <div style="max-height: 200px; overflow-y: auto;">

        <!-- LIST OF WMS LAYERS (STORED ON SERVER) -->
        <div
          v-for = "({ id }) in state.adminwmsurls"
          :key  = "wmsurl"
          style = "
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #ccc;
            padding-bottom: 3px;
          ">
          <span
            style = "flex-grow: 1; margin-right: 15px;"
            class = "g3w-long-text">{{ id }}
          </span>
          <span
            class       = "skin-color"
            style       = "padding: 5px;"
            @click.stop = "showWmsLayersPanel(id)"
          >
            <i
              style  = "font-weight: bold; font-size: 1.3em;"
              :class = "g3wtemplate.getFontClass('plus-square')">
            </i>
          </span>

        </div>

        <!-- LIST OF WMS LAYERS (STORED ON LOCAL STORAGE) -->
        <div
          v-for = "({id, url}) in state.localwmsurls"
          :key  = "id"
          style = "border-bottom: 1px solid #cccccc; padding-bottom: 3px;"
        >
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 3px">
            <!-- WMS NAME -->
            <span
              class = "g3w-long-text"
              style = "flex-grow: 1; margin-right: 15px; font-weight: bold"
            >{{ id }}</span>
            <!-- EDIT WMS -->
            <span
              class                  = "skin-color"
              style                  = "padding: 3px; margin: 2px;"
              @click.stop            = "showWmsLayersPanel(url)"
              v-t-tooltip:top.create = "'sidebar.wms.add_wms_layer'"
            >
              <i
                class  = "wms-icon-action"
                :class = "g3wtemplate.getFontClass('plus-square')">
              </i>
            </span>
            <!-- DELETE WMS -->
            <span
              style                  = "color: red; padding: 3px; margin: 2px;"
              @click.stop            = "deleteWmsUrl(id)"
              v-t-tooltip:top.create = "'sidebar.wms.delete_wms_url'"
            >
              <i
                style  = "color: red"
                class  = "wms-icon-action"
                :class = "g3wtemplate.getFontClass('trash')">
              </i>
            </span>
          </div>

          <!-- WMS URL -->
          <div
            style = "font-size: 0.7em; "
            class = "g3w-long-text" :title="url"
          >{{url}}</div>

        </div>

      </div>
    </li>

  </ul>
</template>

<script>
  import { LOCALSTORAGE_EXTERNALWMS_ITEM } from 'app/constant';
  import Panel                             from 'core/g3w-panel';
  import ProjectsRegistry                  from 'store/projects';
  import ApplicationService                from 'services/application';
  import DataRouterService                 from 'services/data';
  import GUI                               from 'services/gui';
  import { getUniqueDomId }                from 'utils/getUniqueDomId';
  import { isURL }                         from 'utils/isURL';

  import * as vuePanelComp  from 'components/WMSLayersPanel.vue';

  /**
   * Current project id used to store data or get data to current project
   */
  let PID = ProjectsRegistry.getCurrentProject().getId();

  let panel;

  export default {

    /** @since 3.8.6 */
    name: "wms",

    data() {
      return {
        state: {
          adminwmsurls: this.$options.wmsurls || [],
          localwmsurls: [], // array of object {id, url}
        },
        url: null,
        id: null,
        loading: false,
        status: {
          error: false,
          added: false,
        }
      }
    },

    computed: {

      /**
       * @returns {false|*|boolean}
       */
      inputswmsurlvalid() {
        return (
          (
            this.url !== null &&
            this.url.trim() &&
            isURL(this.url)
          ) &&
          (
            this.id !== null &&
            this.id.trim()
          )
        )
      },

    },

    methods: {

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
        const found  = this.state.localwmsurls.find(l => l.url == wms.url || l.id == wms.id);
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
            this.state.localwmsurls.push(wms);
            data.urls = this.state.localwmsurls;
            this.updateLocalWMSData(data);
            response.wmsurl = wms.url;
            this._showWmsLayersPanel(response);
          } catch(e) {
            console.warn(e);
            status.error = true;
          }
        }
        return status;
      },

      /**
       * @returns { Promise<void> }
       */
      async addwmsurl() {
        this.loading           = true;
        const { error, added } = await this.addNewUrl({ url: this.url, id: this.id });
        this.status.error      = error;
        this.status.added      = added;
        this.loading           = false;
      },

      /**
       * Delete url from local storage
       * 
       * @param id
       */
      deleteWmsUrl(id) {
        this.state.localwmsurls = this.state.localwmsurls.filter(l => id !== l.id);
        const data = this.getLocalWMSData();
        data.urls  = this.state.localwmsurls;
        this.updateLocalWMSData(data);
      },

      /**
       * Check if a layer is already added to map
       * 
       * @param { Object } wms
       * @param { string } wms.url
       * @param { string } wms.name
       * @param { string } wms.epsg
       * @param { string} wms.position
       * @param wms.opacity
       * @param wms.layers
       * @param {Boolean } wms.visible
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

        try {
          // check if WMS already added (by name)
          const data = this.getLocalWMSData();

          if (panel) {
            const wms = data.wms[panel.internalPanel.url];
            panel.internalPanel.added = wms && wms.some(w => w.layers.length === panel.internalPanel.selectedlayers.length
              ? panel.internalPanel.selectedlayers.every(l => w.layers.includes(l))
              : undefined
            );
            if (panel.internalPanel.added) {
              console.warn('WMS Layer already added');
              return;
            }
            panel.internalPanel.loading = true;
          }

          const config = { url, name, layers, epsg, position, visible, opacity };

          if (undefined === data.wms[url]) {
            data.wms[url] = [config];
          } else {
            data.wms[url].push(config);
          }

          this.updateLocalWMSData(data);

          try {
            await GUI.getService('map').addExternalWMSLayer(config);
          } catch(e) {
            console.warn(e);
            GUI.getService('map').removeExternalLayer(name);
            this.deleteWms(name);
            setTimeout(() => { GUI.showUserMessage({ type: 'warning', message: 'sidebar.wms.layer_add_error' }) });
          }
        } catch(e) {
          console.warn(e);
        }
        if (panel) {
          panel.internalPanel.clear();
          panel.close();
        }
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
       * ORIGINAL SOURCE: src/app/gui/wms/vue/panel/wmslayerspanel.js@3.8.15
       * 
       * show add wms layers to wms panel
       * 
       * @param config
       * 
       * @returns { WmsLayersPanel }
       */
      _showWmsLayersPanel(config={}) {
        panel = new Panel({
          service:       this,
          id:            getUniqueDomId(),
          title:         'sidebar.wms.panel.title',
          internalPanel: new (Vue.extend(vuePanelComp))({ service: this, config }),
          show:          true,
        });
        panel.internalPanel.$on('add-wms-layer', this.addWMSlayer.bind(this));
        return panel;
      },

      /**
       * Load WMS Data from server and show WMS Layers Panel
       * 
       * @param url
       * 
       * @returns { Promise<void> }
       */
      async showWmsLayersPanel(url) {
        let error = false;
        let added = false;
        try {
          this.loading = true;
          const d = await this.getWMSLayers(url);
          error = !d.result;
          if (!error) {
            d.wmsurl = url;
            this._showWmsLayersPanel(d);
          }
        } catch(e) {
          console.warn(e);
        } finally {
          this.status.error = error;
          this.status.added = added;
          this.loading      = false;
        }
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

      clear() {
        panel = null;
      },

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

    },

    // Load WMS urls from local storage
    async mounted() {
      /**@deprecated Will be removed on v4.x **/
      ProjectsRegistry.onafter('setCurrentProject', async (project) => {
        this.projectId  = PID = project.getId();
        this.state.adminwmsurls = project.wmsurls || [];
      });

      await GUI.isReady();

      const map = GUI.getService('map');

      await map.isReady();

      this.deleteWms = this.deleteWms.bind(this);

      map.on('remove-external-layer', this.deleteWms);

      let data = this.getLocalWMSData();

      if (undefined === data) {
        data = {
          urls: [], // unique url for wms
          wms:  {}, // object contains url as a key and array of layers bind to url
        };
        this.updateLocalWMSData(data);
      }

      setTimeout(() => {
        map.on('change-layer-position-map', ({ id: name, position } = {}) => this.changeLayerData(name, { key: 'position', value: position }));
        map.on('change-layer-opacity',      ({ id: name, opacity } = {})  => this.changeLayerData(name, { key: 'opacity',  value: opacity }));
        map.on('change-layer-visibility',   ({ id: name, visible } = {})  => this.changeLayerData(name, { key: 'visible',  value: visible }));

        // load eventually data
        Object.keys(data.wms).forEach(url => { data.wms[url].forEach(d => map.addExternalWMSLayer({ url, ...d })); });
      });

      this.state.localwmsurls = data.urls;

    },

    beforeDestroy() {
      GUI.getService('map').off('remove-external-layer', this.deleteWms);
    },

  }
</script>

<style scoped>
  .g3w-add-wms-url-message{
    font-weight: bold;
    color: #000000;
  }
  .g3w-wmsurl-error {
    background-color: red;
  }
  .g3w-wmsurl-already-added {
    color: inherit;
    font-weight: normal;
    display: inline-block;
  }
  .wms_url_input_content{
    margin-bottom: 5px;
  }
  .wms-icon-action {
    font-weight: bold;
    font-size: 1.3em;
    box-shadow: 0 5px 10px #1e282c;
  }
  .wms-icon-action:hover {
    box-shadow: none;
  }
  .new_wms_item {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: transparent !important;
    margin-bottom: 10px;
  }
</style>