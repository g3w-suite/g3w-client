/**
 * @file Production entry point (app.min.js)
 * @since v3.8
 */

import 'static/app.css';

// expose global variables
import './g3w-globals';

// constants
import {
  FONT_AWESOME_ICONS,
  TIMEOUT,
  QUERY_POINT_TOLERANCE,
}                         from 'g3w-constants';

// core
import ApplicationState   from 'g3w-state';
import Emitter            from 'g3w-emitter';
import Panel              from 'g3w-panel';
import Component          from 'g3w-component';
import GUI                from 'g3w-app';

// components
import App                from 'components/App.vue';
import Tabs               from 'components/GlobalTabs.vue';

// directives
import vDisabled          from 'directives/v-disabled';
import vSelect2           from 'directives/v-select2';
import vTToltip           from 'directives/v-t-tooltip';
import vT                 from 'directives/v-t';

// utils
import { XHR }            from 'utils/XHR';
import { normalizeEpsg }  from 'utils/normalizeEpsg';
import { getUniqueDomId } from 'utils/getUniqueDomId';
import { debounce }       from 'utils/debounce';

import { Layer }          from 'g3w-layer';

// Internationalization
import { gettext as _ }   from 'g3w-i18n';

import 'components/g3w-alerts';

Object
  .entries({
    ApplicationState,
    Emitter,
    Panel,
    Component,
    GUI,
    App,
    Tabs,
    Layer
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

/**
 * @deprecated global `<divider>` component
 */
Vue.component('divider', { template: /* html */`<span class = "divider"></span>` });

/**
 * @deprecated global `<bar-loader>` component
 */
Vue.component('bar-loader', {
  template: /* html */`
    <div
      v-if   = "loading"
      class  = "bar-loader"
      style  = "border: 0"
      :class = "{ color: color ? 'skin-background-color' : null }"
      :style = "{ backgroundColor: color }">
    </div>
  `,
  props: {
    loading: { type: Boolean | String, default: false },
    color:   { type: String, default: null }
  },
});

/**
 * @deprecated global `<progressbar>` component
 */
Vue.component('progressbar', {
  template: /* html */`
    <div
      v-if  = "(null !== progress && undefined !== progress)"
      style = "margin: 5px 0 5px 0; width: 100%; background-color: #FFF; border: 0; border-radius: 3px;"
    >
      <div
        class  = "skin-background-color"
        style  = "display: flex; justify-content: center; font-weight: bold;"
        :style = "{ width: (progress < 10 ? 10 : progress) }"
      >
        <span>{{ progress }}</span>
      </div>
    </div>
  `,
  props: ['progress'],
});

/**
 * @deprecated global `<datetime>` component
 */
Vue.component('datetime', {
  template: /* html */`
    <div ref = "datimecontainer">
      <label :for = "id" style = "display: block" v-t = "label"></label>
      <div class = "form-group">
        <div class = 'input-group date' ref = "iddatetimepicker">
          <input :id = "id" ref = "idinputdatetimepiker" type = 'text' @change = "changeInput" class = "form-control" />
          <span class = "input-group-addon caret">
            <span class  = "datetimeinput" :class = "g3wtemplate.getFontClass('time' === type ? 'time': 'calendar')"></span>
          </span>
        </div>
      </div>
    </div>`,
  props: {
    type:         { type: String, default: 'date' }, // time
    format:       { type: String, default: 'YYYY-MM-DD' },
    minDate:      { default: false },
    maxDate:      { default: false },
    enabledDates: { default: false },
    value:        {},
    label:        { default:'Date' }
  },
  data() {
    return { datetimevalue: this.value }
  },
  methods: {
    changeInput(e) {},
    change(value) { this.$emit('change', moment(value).format(this.format)) }
  },
  async mounted() {
    await this.$nextTick();
    this.datetimeinputelement = $(this.$refs.iddatetimepicker);
    this.datetimeinputelement.datetimepicker({
      minDate:           this.minDate,
      maxDate:           this.maxDate,
      defaultDate:       this.datetimevalue,
      useCurrent:        false,
      allowInputToggle:  true,
      enabledDates:      this.enabledDates,
      showClose:         true,
      format:            this.format,
      locale:            ApplicationState.language,
      toolbarPlacement:  'top',
      widgetPositioning: { horizontal: 'right' },
    });
    this.datetimeinputelement.on("dp.change", ({date}) => { this.change(date); });
    if (ApplicationState.ismobile) { setTimeout(() => datetimeinputelement.blur()) }
  },
  watch: {
    value(datetime)            { this.datetimevalue = datetime; this.datetimeinputelement.data("DateTimePicker").date(datetime) },
    async minDate(mindatetime) { this.datetimeinputelement.data("DateTimePicker").minDate(mindatetime); },
    async maxDate(maxdatetime) { this.datetimeinputelement.data("DateTimePicker").maxDate(maxdatetime); },
    enabledDates(dates)        { this.datetimeinputelement.data("DateTimePicker").enabledDates(dates); }
  },
  created() { this.id = getUniqueDomId(); }
});

/**
 * @deprecated global `<range>` component
 */
Vue.component('range', {
  template: /* html */`
    <div>
      <section style = "display: flex; justify-content: space-between; font-weight: bold;">
        <section style = "align-self: flex-end">
          <span class = "min-max-label">{{min}}</span>
          <span style = "font-weight: bold;">{{unit}}</span>
        </section>
        <div style = "display: flex; flex-direction: column; margin: 0 3px">
          <label :for = "id" style = "display: block" class = "skin-color" v-t = "label"></label>
          <input type = "range" ref = "range-input" @change = "change" v-model = "state.value" :id = "id" :min = "min" :max = "max" :step = "step" >
        </div>
        <section style = "align-self: flex-end">
          <span style = " align-self: end; font-weight: bold;">{{max}}</span>
          <span style = "font-weight: bold;">{{unit}}</span>
        </section>
      </section>
      <template v-if="showValue">
        <span>{{state.value}}</span>
        <span style = "font-weight: bold;">{{unit}}</span>
      </template>
    </div>`,
  props: {
    id:        { default: undefined },            // ID value for label.
    label:     { type: String, default: '' },     // @TODO find out what changes from the `unit` props
    min:       { type: Number, default: 0 },      // Min range slider value.
    max:       { type: Number, default: 10 },     // Max range slider value.
    step:      { type: Number, default: 1 },      // Range slider step.
    value:     { default: 0 },                    // Current range value.
    sync:      { type: Boolean, default: false }, // Whether to emit the `changed` event.
    showValue: { type: Boolean, default: false }, // Whether display current range value.
    unit:      { type: String, default: '' }      // Range unit.
  },
  data() {
    return { state: { value: this.value } };
  },
  methods: {
    changeBackGround(value) { this.$refs['range-input'].style.backgroundSize = `${value ? (value - this.min) * 100 / (this.max - this.min): 0}% 100%`; },
    setValue(value)         { this.changedValue(value); },
    change(e)               { this.changedValue(1*e.target.value); },
    emitChangeValue(value)  { this.state.value = value; this.$emit('change-range', { id: this.id, value }); }
  },
  watch: {
    /**@since 3.8.0 need to watch changes of prop value and reflect it to state.value*/
    'value'(value)       { this.state.value = value; },
    'state.value'(value) { this.changeBackGround(value); if (this.sync) { this.emitChangeValue(value) } }
  },
  created() {
    this.changedValue = this.sync ? () => this.$emit('changed') : debounce(value => { this.emitChangeValue(value) });
  },
  async mounted() {
    await this.$nextTick();
    this.changeBackGround(this.value);
  },
});

/**
 * @deprecated global `<tabs>` component
 */
Vue.component(Tabs.name, Tabs);

/**
 * Install global directives
 *
 * ORIGINAL SOURCE: src/app/gui/vue/vue.directives.js@v3.6
 */
Vue.directive("disabled", vDisabled);
Vue.directive('select2', vSelect2);
Vue.directive('t-tooltip', vTToltip);
Vue.directive("t", vT);
Vue.directive("t-plugin", vT);

/**
 * Vue 2 Plugin used to add global-level functionality to Vue
 *
 * @link https://v2.vuejs.org/v2/guide/plugins.html
 *
 * ORIGINAL SOURCE: src/app/gui/vue/vueappplugin.js@3.6
 */
Vue.use({
  install(Vue) {
    // based on vue-cookie v1.1.4
    Vue.prototype.$cookie = { get: GUI.getCookie };

    /** @since 3.11.0 */
    Vue.prototype.$t = _;
    // hold a list of registered fontawsome classes for current project
    Vue.prototype.g3wtemplate = {
      font: FONT_AWESOME_ICONS,
      addFontClass({ name, className } = {}) {
        const added = undefined === this.font[name];
        if (added) {
          this.font[name] = className;
        }
        return added;
      },
      getFontClass(type) {
        return this.font[type] || '';
      }
    };
    /** @since 3.11.0 */
    Vue.prototype.$fa = Vue.prototype.g3wtemplate.getFontClass.bind(Vue.prototype.g3wtemplate);
    // include isMobile() method within all Vue instances
    Vue.mixin({
      methods: {
        isMobile () {
          return isMobile.any
        }
      }
    })

  }
}, {});

Vue.mixin({ inheritAttrs: false });  // set mixins inheriAttrs to avoid tha unused props are setted as attrs

/**
 * Load an external script
 */
function _loadScript(url) {
  return new Promise(function(resolve, reject) {
    const s   = document.createElement('script');
    s.onload  = resolve;
    s.onerror = e => { console.warn(e); reject(new Error('Failed to load script: ' + url)) };
    s.src     = url;
    document.head.appendChild(s);
  });
}

/**
 * Bootstrap application
 *
 * 1 - load translations (i18n languages)
 * 2 - initialize ProjectsRegistry
 * 3 - attach DOM events ('online' and 'offline')
 * 4 - trigger 'ready' event
 * 5 - set current project `gid` (group id)
 * 6 - set current project EPSG (coordinate system)
 * 7 - check if application is loaded within an <IFRAME>
 */

const initConfig = window.initConfig;

// set application user
ApplicationState.user = initConfig.user;

GUI.emit('initconfig', initConfig);

ApplicationState.vendorkeys = initConfig.vendorkeys || {};

initConfig.baselayers.filter(l => l.apikey).forEach(l => ApplicationState.vendorkeys[l.servertype ? l.servertype.toLowerCase() : null] = l.apikey);

/**
 * create application configuration
 */
Object.assign(initConfig, {
  urls: Object.assign(initConfig.urls || {}, {
    ows:             'ows',
    api:             'api',
    initconfig:      'api/initconfig',
    config:          'api/config',
    baseurl:         initConfig.baseurl,
    frontendurl:     initConfig.frontendurl,
    staticurl:       initConfig.staticurl,
    clienturl:       `${initConfig.staticurl}${initConfig.client}`,
    mediaurl:        initConfig.mediaurl,
    vectorurl:       initConfig.vectorurl,
    proxyurl:        initConfig.proxyurl,
    rasterurl:       initConfig.rasterurl,
    interfaceowsurl: initConfig.interfaceowsurl,
  }),
  layout:              initConfig.layout              || {},
  plugins:             initConfig.plugins             || {},
  tools:               initConfig.tools               || { tools:  [] },
  views:               initConfig.views               || {},
  user:                initConfig.user                || null,
  header_custom_links: initConfig.header_custom_links || [],
});

// navbar help (credits)
initConfig.header_custom_links.unshift({
  id:     'credits',
  type:   'metadata',
  target: '#metadata_credits',
  icon:   'far fa-question-circle',
  title:  'Credits',
  i18n:    true,
});

initConfig.layout.iframe  = window.top !== window.self;
ApplicationState.language = initConfig.user.i18n || 'en';

// set Accept-Language request header based on config language
$.ajaxSetup({
  beforeSend: xhr => { xhr.setRequestHeader('Accept-Language', initConfig.user.i18n || 'en'); }
});

/**
 * Application starting point
 */
(async () => { try {

  ApplicationState.language = initConfig.user.i18n;

  _.register('en', (await import(`${initConfig.urls.clienturl}locales/en.js`)).default);
  _.register(initConfig.user.i18n, (await import(`${initConfig.urls.clienturl}locales/${initConfig.user.i18n}.js`)).default);

  /** @since 3.8.0 */
  try {
    initConfig.macrogroups = await XHR.get({ url: `/${ApplicationState.user.i18n}/about/api/macrogroup/` })
  } catch(e) {
    console.warn(e);
  }
  
  /** @since 3.8.0 */
  try {
    initConfig.groups = await XHR.get({ url: `/${ApplicationState.user.i18n}/about/api/group/nomacrogroup/` })
  } catch(e) {
    console.warn(e);
  }

  const panel = JSON.parse(window.localStorage.getItem('SIDEBAR') || null) || initConfig.layout.rightpanel || {};
  initConfig.layout.rightpanel = Object.assign({},
    panel,
    {
      width:      panel.width  || 50, // ie. width == 50%
      height:     panel.height || 50, // ie. height == 50%
      width_100:  false,
      height_100: false,
    }
  );

  ApplicationState.layout.app = initConfig.layout;

  // setup projects
  initConfig.projects.forEach(p => Object.assign(p, {
    baselayers:         initConfig.baselayers,
    minscale:           initConfig.minscale,
    maxscale:           initConfig.maxscale,
    crs:                initConfig.crs,
    vectorurl:          initConfig.vectorurl,
    rasterurl:          initConfig.rasterurl,
  }));


  const gid    = initConfig.initproject;
  
  const CONFIG = window.initConfig.projects.find(p => gid === p.gid);
  //get initial project configuration from server that are not set on project settings
  /**
   * Example initial project configuration:
    {
      "id": 140,
      "title": "name-3857_multi_geom_addpartqgs.qgs",
      "description": "",
      "thumbnail": "/media/macrogroup/logo_img/Screenshot_from_2022-11-24_14-41-28.png",
      "type": "qdjango",
      "gid": "qdjango:140",
      "modified": 1707488467.319423,
      "url": "it/map/name-3857/qdjango/140/",
      "baselayers": [...],
      "crs": {...},
      "vectorurl": "/vector/api/",
      "rasterurl": "/raster/api/"
    }
  */

  if (!CONFIG) {
    throw `Project doesn't exist ${gid}`;
  }

  // fetch project configuration from remote server

  // { Array } config.layers - The order of layers follows layer rendering order set on QGIS project.Can be different to TOC layer order
  const config = await Promise.race([
    new Promise(res => setTimeout(() => res("Timeout"), TIMEOUT)),
    await XHR.get({ 
      url: `${window.initConfig.urls.baseurl}${window.initConfig.urls.config}/${window.initConfig.id}/${CONFIG.type}/${CONFIG.id}?_t=${CONFIG.modified}`
    })
  ]);

  //check if map_theme is set on url param, if so need to get map theme configuration from server
  const THEME     = (new URLSearchParams(location.search)).get('map_theme');
  const map_theme = Object.values(config?.map_themes ?? {}).flat().find(({ theme }) => THEME === theme);

  /** In the case of url param set map_theme, need to get map theme configuration from server */
  if (map_theme) {
    const { result, data } = await Promise.race([
      new Promise(res => setTimeout(() => res("Timeout"), TIMEOUT)),
      await XHR.get({url: `/${CONFIG.type}/api/prjtheme/${CONFIG.id}/${THEME}` })
    ]);
    if (result) {
      config.layerstree    = data; //replace layerstree project config based on map theme configuration
      map_theme.layerstree = data;
      map_theme.default    = true;
    }
  }

  //Change config.layerstree to have a root group node, so that the TOC can be rendered properly
  config.layerstree = [{
    name:        config.name || config.gid,
    root:        true, //root group of TOC, referred to project
    toc:         true, //@since 4.1.0 set true as default. Attribute used to show/hide group or layer on toce based on visibility
    parentGroup: null, //no parent group for root group
    expanded:    'not_collapsed' === config.toc_layers_init_status,
    disabled:    false,
    checked:     true,
    bbox:        {
      minx: config.initextent.at(0),
      miny: config.initextent.at(1),
      maxx: config.initextent.at(2),
      maxy: config.initextent.at(3),
    },
    nodes:       config.layerstree ?? [],
  }];

  //  Process layerstree of the project (useful info for catalog)
  //  it useful to traverse here because some proprietries,
  //  for example visibile, is an attribute of layersstree node and not of layer object
  (function traverse(nodes = []) {
    for (let i = 0; i < nodes.length; i++) {
      let node = nodes[i];
      // check if layer (node) of folder
      if (null !== node.id && undefined !== node.id) {
        const l   = config.layers.find(l => node.id === l.id)
        node.name = l?.name;
        node      = Object.assign(l ?? {}, node); // replace node with layer configuration (from server config)
      }
      // in case of group
      if (Array.isArray(node.nodes)) {
        // add title to tree
        node.title = node.name;
        traverse(node.nodes);
      }
    }
  })(config.layerstree);
  
  //set project to aplication state
  const project = ApplicationState.project = Object.assign(new Emitter, {
    layers:       [], //store instance of Layer class
    config: {
      id:         CONFIG.gid,
      projection: ApplicationState.projections.get(normalizeEpsg(CONFIG.crs, false)),
      extent:     CONFIG.extent,
      initextent: CONFIG.initextent,
      wmsUrl:     CONFIG.WMSUrl,
    },
    // store project configuration from server
    // need to assign to an empty object to has reactive property 
    // https://v2.vuejs.org/v2/guide/reactivity.html#For-Objects
    state: Object.assign({}, CONFIG, config, { 
      WMSUrl: `${window.initConfig.urls.baseurl}${window.initConfig.urls.ows}/${window.initConfig.id}/${CONFIG.type}/${CONFIG.id}/`,
      /** @since 3.8.0 */
      relations: (config.relations || []).map(r => {
        if ("ONE" === r.type) {
          config.layers.find(l => {
            if (l.id === r.referencingLayer) {
              r.name     = l.name;
              r.origname = l.origname;
              return true;
            }
          });
        }
        return r;
      }),
      /** actived catalog tab */
      catalog_tab:            CONFIG.toc_tab_default        || CONFIG._catalog_tab || 'layers',
      ows_method:             CONFIG.ows_method             || 'GET',
      toc_layers_init_status: CONFIG.toc_layers_init_status || 'not_collapsed',
      toc_themes_init_status: CONFIG.toc_themes_init_status || 'collapsed',
      query_point_tolerance:  CONFIG.query_point_tolerance  || QUERY_POINT_TOLERANCE,
      crs:                    normalizeEpsg(CONFIG.crs, false),
      baselayers:             CONFIG.baselayers
        // Remove bing base layer when no vendor API Key is provided
        .filter(l => ('Bing' === l.servertype ? ApplicationState.vendorkeys.bing : true))
        .map(l => Object.assign(l, {
          visible:   l.id === config.initbaselayer || !!l.fixed,
          baselayer: true,
        })),
    }),
    //set api urls for project
    urls: {
      map_themes:          `/${CONFIG.type}/api/prjtheme/${CONFIG.id}/`, //get map themes configuration from server
      vector_data:         `${CONFIG.vectorurl}data/${CONFIG.type}/${CONFIG.id}/`,
      featurecount:        `${CONFIG.vectorurl}featurecount/${CONFIG.type}/${CONFIG.id}/`, //get features count for a specific layer
      editorformstructure: `${CONFIG.vectorurl}editorformstructure/${CONFIG.type}/${CONFIG.id}/`, //@since 4.0.0 get configuration from a specific style for a layer (Ex. featurecount, editor_form_structure, ..)
    },
    setters: {
      /**
       * 
       * @param {string} id The ID of the base layer to set
       */
      setBaseLayer(id) {
        project.state.baselayers.forEach(l => l.visible = project.getLayerById(l.id)?.setVisible(id === l.id));
      },
      setLayerSelected:       (id, selected) => { project.getLayers().forEach(l => l.state.selected = (id === l.getId()) ? selected : false); },
      addLayers:               (layers = []) => { layers.forEach(l => project.addLayer(l)) },
      addLayer:                        layer => project.layers.push(layer) ,
      removeLayer:                     layer => project.layers = project.layers.filter(l => layer.getId() !== l.getId()),
    },
    setOptions:               (config = {}) => project.config = config,
    removeLayers:                        () => project.layers.forEach(l => project.removeLayer(l)),
    getLayers:  (filter = {}, options = {}) => Object.values(project.getLayersDict(filter, options)),
    getBaseLayers:                       () => project.getLayersDict({ BASELAYER: true }),
    getLayerById:                        id => project.layers.find(l => `${id}` === `${l.getId()}`),
    getLayerByName:                    name => project.layers.find(l => name === l.getName()),
    getLayerAttributes:                  id => project.getLayerById(id).getAttributes(),
    getLayerAttributeLabel:      (id, name) => project.getLayerById(id).getAttributeLabel(name),
    getGeoLayers:                        () => project.getLayers({ GEOLAYER: true }),
    selectLayer:             (id, selected) => project.setLayerSelected(id, selected),
    getProjection:                       () => project.config.projection,
    getExtent:                           () => project.config.extent,
    getInitExtent:                       () => project.config.initextent,
    getWmsUrl:                           () => project.config.wmsUrl,
    removeLayersTree:                    () => project.state.layerstree.splice(0, project.state.layerstree.length),
    getLayersTree:                       () => project.state.layerstree,
    getLayersDict: (filter = {}, options = {}) => {
  
      // skip when no filter is provided (eg. `filter = null`)
      if (
        !filter ||
        [
          filter.PRINTABLE,
          filter.QUERYABLE,
          filter.FILTERABLE,
          filter.EDITABLE,
          filter.VISIBLE,
          filter.SELECTED,
          filter.CACHED,
          filter.SELECTED_OR_ALL,
          filter.SERVERTYPE,
          filter.BASELAYER,
          filter.GEOLAYER,
          filter.VECTORLAYER,
          filter.HIDDEN,
          filter.DISABLED,
          filter.IDS,
        ].every(f => undefined === f)
      ) {
        return project.layers;
      }
  
      let layers = project.layers;
  
      if (filter.IDS) {
        layers = layers.filter(l => [].concat(filter.IDS).includes(l.getId()));
      }
  
      // check if there are `selected` layers otherwise get all `layers`
      if (filter.SELECTED_OR_ALL) {
        const selected = layers.filter(l => l.isSelected());
        layers         = selected.length > 0 ? selected : layers;
      }
  
      // checks if a boolean filter is set
      const has = f => 'boolean' === typeof f;
  
      if (has(filter.SELECTED) && !filter.SELECTED_OR_ALL)                    layers = layers.filter(l => filter.SELECTED    === l.isSelected());
      if (has(filter.QUERYABLE))                                              layers = layers.filter(l => filter.QUERYABLE   === l.isQueryable());
      if (has(filter.FILTERABLE))                                             layers = layers.filter(l => filter.FILTERABLE  === l.isFilterable(options.filtrable || null));
      if (has(filter.EDITABLE))                                               layers = layers.filter(l => filter.EDITABLE    === l.isEditable());
      if (has(filter.VISIBLE))                                                layers = layers.filter(l => filter.VISIBLE     === l.isVisible());
      if (has(filter.CACHED))                                                 layers = layers.filter(l => filter.CACHED      === l.isCached());
      if (has(filter.BASELAYER))                                              layers = layers.filter(l => filter.BASELAYER   === l.isBaseLayer());
      if (has(filter.GEOLAYER))                                               layers = layers.filter(l => filter.GEOLAYER    === l.isGeoLayer());
      if (has(filter.VECTORLAYER))                                            layers = layers.filter(l => filter.VECTORLAYER === l.isType('vector'));
      if (has(filter.HIDDEN))                                                 layers = layers.filter(l => filter.HIDDEN      === l.isHidden());
      if (has(filter.DISABLED))                                               layers = layers.filter(l => filter.DISABLED    === l.isDisabled());
      if ('string' === typeof filter.SERVERTYPE && filter.SERVERTYPE.length) layers = layers.filter(l => filter.SERVERTYPE  === l.getServerType());
      if (filter.PRINTABLE)                                                   layers = layers.filter(l => l.isGeoLayer() && l.isPrintable({ scale: filter.PRINTABLE.scale }));
  
      /**@since v3.10.3 order TOC */
      if (options.TOC_ORDER) {
        // get all siblings children layers id
        let nodes = [];
        let traverse = tree => {
          (tree?.nodes || []).forEach(n => {
            if (n.id) { 
              nodes.push(n.id) 
            }
            else { 
              traverse(n) 
            }
          });
        };
        traverse(project.state.layerstree?.[0]);
        return nodes.map(id => layers.find(l => id === l.getId())).filter(id => id);
      }
  
      return layers;
    },
    getQueryPointTolerance: () => project.state.query_point_tolerance,
    getRelations:           () => project.state.relations,
    getRelationById:        id => project.state.relations.find(r => id === r.id),
    getState:               () => project.state,
    getPrint:               () => project.state.print || [],
    getId:                  () => project.state.id,
    getType:                () => project.state.type,
    getGid:                 () => project.state.gid,
    getName:                () => project.state.name,
    getCrs:                 () => project.config.projection.getCode(),
    getUrl:                 type => project.urls[type],
    /**
     * @param filter property layer config to filter
     * 
     * @returns { Array } configuration layers (from server config)
     */
    getConfigLayers:        ({ key } = {}) => key ? project.state.layers.filter(l => undefined !== l[key] ) : project.state.layers,
  });

  /** ORIGINAL SOURCE: src/app/core/layers/layerfactory.js@v3.10.2 */

  // Layer factory: instance each layer and add to project.layers array
  project.addLayers(project.state.layers.concat(project.state.baselayers).map(l => {
    const config = Object.assign({}, l, {
      crs:               normalizeEpsg(l.crs || project.state.crs, false), // @v4.0 Fix In case of missing layer crs, set project crs
      projection:        l.crs ? ApplicationState.projections.get(l.crs) : project.config.projection,
      ows_method:        project.state.ows_method,
      wms_use_layer_ids: project.state.wms_use_layer_ids,
      //@since v4.0.0 - original config to maintain
      styles:            l?.styles?.map?.(s => ({...s})), // v4.0.0 pass a copy of styles
    });
    try {
      return new Layer(config, { project });
    } catch(e) {
      console.warn(e);
      return [];
    }
  }));


  /**
   * 
   * @param {*} nodes 
   * @param {*} parentGroup 
   * @returns 
   */
  (function traverse(nodes, parentGroup) {
    return parentGroup.toc = nodes.reduce((toc, node, index) => {
      //Check if is a layer node, 
      if (null !== node.id && undefined !== node.id) {
        nodes[index] = project.getLayerById(node.id).getState(); // substitute node layer with layer state
        // pass bbox and epsg of layer
        if (nodes[index].bbox) {
          //need to create a new object maintain original bbox of node
          // in case for example of different epdg code between project and layer
          const bbox = Object.assign({}, nodes[index].bbox);
          // Set bounding box info for each group based on its children layers and groups
          // translate bbox epsg to project epsg code (when they differ)
          if ((nodes[index].epsg !== project.config.projection.getCode())) {
            [ bbox.minx, bbox.miny, bbox.maxx, bbox.maxy ] = ol.proj.transformExtent([ nodes[index].bbox.minx, nodes[index].bbox.miny, nodes[index].bbox.maxx, nodes[index].bbox.maxy ], nodes[index].epsg, project.config.projection.getCode());
          }
          // get current bbox or compute bbox from an ol extent
          if (undefined === parentGroup.bbox) {
            parentGroup.bbox = bbox;
          } else {
            parentGroup.bbox = ol.extent
              .extend(
                [ parentGroup.bbox.minx, parentGroup.bbox.miny, parentGroup.bbox.maxx, parentGroup.bbox.maxy ],
                [ bbox.minx, bbox.miny, bbox.maxx, bbox.maxy ]
              )
              .reduce(
                (bbox, extentCoordinate, index) => {
                  switch(index){
                    case 0: bbox.minx = extentCoordinate; break;
                    case 1: bbox.miny = extentCoordinate; break;
                    case 2: bbox.maxx = extentCoordinate; break;
                    case 3: bbox.maxy = extentCoordinate; break;
                  }
                  return bbox;
                },
                { minx: null, miny: null, maxx: null, maxy: null }
              );
          }
        }
      }

      //Check if is a group
      if (Array.isArray(node.nodes)) {
        node.nodes.forEach(n => n.parentGroup = parentGroup);
        node.toc   = traverse(node.nodes, node);
        node.root  = false;
      }

      toc = toc || node.toc;
      //SET PARENT GROUP
      nodes[index].parentGroup = parentGroup;
      return toc;
    }, false);
  })(project.state.layerstree[0].nodes, project.state.layerstree[0]);
  
  /**@since 4.0.7 set map_theme of application */
  ApplicationState.map_theme.theme = Object.values(project.state.map_themes).flat().find(mt => mt.default)?.theme || null;

  window.addEventListener('online',  () => { GUI.online(); } );
  window.addEventListener('offline', () => { GUI.offline(); });

  /** @since 4.1.0 */
  GUI.emit('app-ready');

  if (isMobile.any || window.initConfig?.layout?.iframe || window.innerWidth <= 767) {
    document.body.classList.add('sidebar-collapse');
  }

  Vue.component('app', App);

  await new Promise(resolve => new Vue({ el: '#app', mounted: resolve }));

  GUI.ready();

  // init plugins
  try {
    Object.keys(window.initConfig.plugins).forEach(p => ApplicationState.plugins.push(p));

    /** @TODO move this stuff within the "law" plugin */
    if (ApplicationState.project?.getState()?.law?.length) {
      window.initConfig.plugins.law     = ApplicationState.project.getState().law;
      window.initConfig.plugins.law.gid = ApplicationState.project.getState().gid;
    } else {
      delete window.initConfig.plugins.law;
    }

    /** @TODO check if deprecated */
    for (const p in window.initConfig.plugins) {
      Object
        .entries(window.initConfig.plugins[p].plugins || {})
        .forEach(([name, config]) => window.initConfig.plugins[name] = {
          ...window.initConfig.plugins[name],
          ...config
        });
    }

    // load plugins
    await Promise
      .allSettled(Object.entries(window.initConfig.plugins)
      .map(async ([name, config]) => {
        if (!config) {
          return;
        }
        config.baseUrl = window.initConfig.staticurl;
        try {
          const modified = `${ApplicationState.project.state.modified}+${new Date().toISOString().slice(0, 13)}`;
          // wait plugin dependencies before loading plugin
          await Promise.all((config.jsscripts || []).map(s => _loadScript(s)));
          await _loadScript(`${window.initConfig.staticurl}${name}/js/plugin.js?${modified}`);
        } catch(e) {
          console.warn('[G3W-PLUGIN]', e);
          // remove loading plugin in case of error of dependencies
          ApplicationState.plugins = ApplicationState.plugins.filter(p => name !== p);
          return Promise.reject();
        }
      }));
  } catch(e) {
    console.warn(e);
  }

  /** @since 4.1.0 */
  GUI.emit('app-complete');
} catch(e) {
  console.error(e);
  const error = e.responseJSON?.error?.data ?? e?.statusText ?? e;
  document.getElementById('startingspinner')?.remove();
  const wrapper = document.querySelector('.error-page');
  if (!wrapper) {
    document.body.insertAdjacentHTML('beforeend', /* html */`
      <div class="error-page" style="height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #FFF; background-color: var(--skin-color);">
        <h1 style="font-weight: bold;">${ _('Connection error') }</h1>
        <h2 style="order: -1; font-size: 5em; font-weight: bold;">Oops!</h2>
        <h3>${ _('At the moment is not possible show map') }</h3>
        <p class="trace" style="background: #333;padding: 1rem;border-radius: 3px;margin-top: 2rem;font-family: Monospace;">${ error || _('Connection error') }</p>
      </div>`);  
  } else {
    wrapper.querySelector('.trace').insertAdjacentHTML('beforeend', /* html */`
      <br>${ error || _('Connection error') }
    `);
  }
}
})()