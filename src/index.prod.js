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
        return this.font[type] || type || '';
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
ApplicationState.user = initConfig.user

GUI.emit('initconfig', initConfig);

const vendorkeys = initConfig.vendorkeys || {};
initConfig.baselayers.forEach(l => {
  if (l.apikey) {
    vendorkeys[l.servertype ? l.servertype.toLowerCase() : null] = l.apikey
  }
});
Object.keys(vendorkeys).forEach(k => ApplicationState.vendorkeys[k] = vendorkeys[k])

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
    clienturl:       initConfig.staticurl + initConfig.client,
    mediaurl:        initConfig.mediaurl,
    vectorurl:       initConfig.vectorurl,
    proxyurl:        initConfig.proxyurl,
    rasterurl:       initConfig.rasterurl,
    interfaceowsurl: initConfig.interfaceowsurl,
  }),
  layout:              initConfig.layout || {},
  plugins:             initConfig.plugins || {},
  tools:               initConfig.tools || { tools:  [] },
  views:               initConfig.views || {},
  user:                initConfig.user || null,
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
  initConfig.projects.forEach(project => Object.assign(project, {
    baselayers:         initConfig.baselayers,
    minscale:           initConfig.minscale,
    maxscale:           initConfig.maxscale,
    crs:                initConfig.crs,
    vectorurl:          initConfig.vectorurl,
    rasterurl:          initConfig.rasterurl,
  }));

  // holds current project configuration
  let PROJECT;

  const gid    = initConfig.initproject;
  const CONFIG = window.initConfig.projects.find(p => gid === p.gid);

  if (!CONFIG) {
    throw `Project doesn't exist ${gid}`;
  }

  // fetch project configuration from remote server

  // { Array } config.layers - The order of layers follows layer rendering order set on QGIS project.Can be different to TOC layer order
  const config = await Promise.race([
    new Promise(res => setTimeout(() => res("Timeout"), TIMEOUT)),
    await XHR.get({ url:
      `${window.initConfig.urls.baseurl}${window.initConfig.urls.config}/${window.initConfig.id}/${CONFIG.type}/${CONFIG.id}?_t=${CONFIG.modified}`
    })
  ]);

  const THEME     = (new URLSearchParams(location.search)).get('map_theme');
  const map_theme = config && THEME && Object.values(config.map_themes).flat().find(({ theme }) => THEME === theme);

  /** In the case of url param set map_theme, need to get map theme configuration from server */
  if (map_theme) {
    const { result, data } = await Promise.race([
      new Promise(res => setTimeout(() => res("Timeout"), TIMEOUT)),
      await XHR.get({url: `/${CONFIG.type}/api/prjtheme/${CONFIG.id}/${THEME}` })
    ]);
    if (result) {
      config.layerstree    = data;
      map_theme.layetstree = data;
      map_theme.default    = true;
    }
  }

  PROJECT = Object.assign(CONFIG, config);
  PROJECT = Object.assign(PROJECT, {
    WMSUrl: `${window.initConfig.urls.baseurl}${window.initConfig.urls.ows}/${window.initConfig.id}/${PROJECT.type}/${PROJECT.id}/`,
    /** @since 3.8.0 */
    relations: (PROJECT.relations || []).map(r => {
      if ("ONE" === r.type) {
        PROJECT.layers.find(l => {
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
    catalog_tab:            PROJECT.toc_tab_default        || PROJECT._catalog_tab || 'layers',
    ows_method:             PROJECT.ows_method             || 'GET',
    toc_layers_init_status: PROJECT.toc_layers_init_status || 'not_collapsed',
    toc_themes_init_status: PROJECT.toc_themes_init_status || 'collapsed',
    query_point_tolerance:  PROJECT.query_point_tolerance  || QUERY_POINT_TOLERANCE,
    crs:                    normalizeEpsg(PROJECT.crs, false),
    baselayers:             PROJECT.baselayers
      // Remove bing base layer when no vendor API Key is provided
      .filter(l => ('Bing' === l.servertype ? ApplicationState.vendorkeys.bing : true))
      .map(l => Object.assign(l, {
        visible:   l.id && (l.id === (null !== ApplicationState.baseLayerId ? ApplicationState.baseLayerId : PROJECT.initbaselayer)) || !!l.fixed,
        baselayer: true,
      })),
  });

  const _projection = ApplicationState.projections.get(normalizeEpsg(PROJECT.crs, false));

  const project = Object.assign(new Emitter, {
    _layers: {},
    _isQueryable: true,
    state: PROJECT,
    _projection,
    urls: {
      map_themes:          `/${PROJECT.type}/api/prjtheme/${PROJECT.id}/`,
      vector_data:         `${PROJECT.vectorurl}data/${PROJECT.type}/${PROJECT.id}/`,
      featurecount:        `${PROJECT.vectorurl}featurecount/${PROJECT.type}/${PROJECT.id}/`,
      editorformstructure: `${PROJECT.vectorurl}editorformstructure/${PROJECT.type}/${PROJECT.id}/`, //@since 4.0.0 get configuration from a specific style for a layer (Ex. featurecount, editor_form_structure, ..)
    },
    setters: {
      setBaseLayer(id) {
        window.initConfig.baselayers.forEach(l => {
          this.getLayersStore().getLayerById(l.id)?.setVisible(id === l.id);
          l.visible = (id === l.id);
        })
      },
    },
    _layersStore:           Object.assign(new Emitter, {
      config: {
        id:         PROJECT.gid,
        projection: _projection,
        extent:     PROJECT.extent,
        initextent: PROJECT.initextent,
        wmsUrl:     PROJECT.WMSUrl,
        catalog:    true
      },
      state: { layerstree: [], relations:  null },
      setters: {
        setLayerSelected:       (id, selected) => { project.getLayersStore().getLayers().forEach(l => l.state.selected = (id === l.getId()) ? selected : false); },
        addLayers:               (layers = []) => { layers.forEach(l => project.getLayersStore().addLayer(l)) },
        addLayer:                        layer => { project._layers[layer.getId()] = layer; },
        removeLayer:                     layer => { delete project._layers[layer.getId()]; },
      },
      isQueryable:                         () => project._isQueryable,
      setQueryable:                      bool => project._isQueryable = !!bool,
      showOnCatalog:                       () => project.getLayersStore().config.catalog,
      setOptions:               (config = {}) => project.getLayersStore().config = config,
      getId:                               () => project.getLayersStore().config.id,
      removeLayers:                        () => { Object.entries(project._layers).forEach(([_, layer]) => project.getLayersStore().removeLayer(layer)) },
      getLayers:  (filter = {}, options = {}) => Object.values(project.getLayersStore().getLayersDict(filter, options)),
      getBaseLayers:                       () => project.getLayersStore().getLayersDict({ BASELAYER: true }),
      getLayerById:                        id => project.getLayersStore().getLayersDict()[id],
      getLayerByName:                    name => project._layers.find(l => name === l.getName()),
      getLayerAttributes:                  id => project.getLayersStore().getLayerById(id).getAttributes(),
      getLayerAttributeLabel:      (id, name) => project.getLayersStore().getLayerById(id).getAttributeLabel(name),
      getGeoLayers:                        () => project.getLayersStore().getLayers({ GEOLAYER: true }),
      selectLayer:             (id, selected) => project.getLayersStore().setLayerSelected(id, selected),
      getProjection:                       () => project.getLayersStore().config.projection,
      getExtent:                           () => project.getLayersStore().config.extent,
      getInitExtent:                       () => project.getLayersStore().config.initextent,
      getWmsUrl:                           () => project.getLayersStore().config.wmsUrl,
      removeLayersTree:                    () => project.getLayersStore().state.layerstree.splice(0, project.getLayersStore().state.layerstree.length),
      getLayersTree:                       () => project.getLayersStore().state.layerstree,
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
          return project._layers;
        }
    
        let layers = Object.values(project._layers);
    
        if (filter.IDS) {
          const ids = [].concat(filter.IDS);
          layers = layers.filter(l => ids.includes(l.getId()));
        }
    
        // check if there are `selected` layers otherwise get all `layers`
        if (filter.SELECTED_OR_ALL) {
          const selected = layers.filter(l => l.isSelected());
          layers         = selected.length > 0 ? selected : layers;
        }
    
        // checks if a boolean filter is setted
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
        if ('string'  === typeof filter.SERVERTYPE && filter.SERVERTYPE.length) layers = layers.filter(l => filter.SERVERTYPE  === l.getServerType());
        if (filter.PRINTABLE)                                                   layers = layers.filter(l => l.isGeoLayer() && l.isPrintable({ scale: filter.PRINTABLE.scale }));
    
        /**@since v3.10.3 order TOC */
        if (options.TOC_ORDER && project.getLayersStore().state.layerstree) {
          // get all siblings children layers id
          let nodes = [];
          let traverse = tree => {
            tree.nodes.forEach(n => {
              if (n.id) { nodes.push(n.id) }
              else { traverse(n) }
            });
          };
          traverse(project.getLayersStore().state.layerstree[0]);
          return nodes.map(id => layers.find(l => id === l.getId())).filter(id => id);
        }
    
        return layers;
      },
    }
    
    ),
    getQueryPointTolerance: () => project.state.query_point_tolerance,
    getRelations:           () => project.state.relations,
    getRelationById:        id => project.state.relations.find(r => id === r.id),
    getLayerById:           id => project.getLayersStore().getLayerById(id),
    getLayers:              () => [...project.state.layers, ...project.state.baselayers],
    getState:               () => project.state,
    getPrint:               () => project.state.print || [],
    getId:                  () => project.state.id,
    getType:                () => project.state.type,
    getGid:                 () => project.state.gid,
    getName:                () => project.state.name,
    getCrs:                 () => project._projection.getCode(),
    getProjection:          () => project._projection,
    getLayersStore:         () => project._layersStore,
    getUrl:                 type => project.urls[type],
    /**
     * @param filter property layer config to filter
     * 
     * @returns { Array } configuration layers (from server config)
     */
    getConfigLayers:        ({ key } = {}) => key ? project.state.layers.filter(l => undefined !== l[key] ) : project.state.layers,
  });

  // Process layerstree and baselayers of the project (useful info for catalog)
  const traverse = nodes => {
    for (let i = 0; i < nodes.length; i++) {
      let node = nodes[i];
      // check if layer (node) of folder
      if (undefined !== node.id) {
        project.state.layers
          .forEach(l => {
            // in case of layer
            if (node.id === l.id) {
              node.name = l.name;
              l.wmsUrl  = project.state.WMSUrl;
              l.project = project;
              node      = Object.assign(l, node); // replace node with layer configuration (from server config)
              return false
            }
          });
      }
      // in case of group
      if (Array.isArray(node.nodes)) {
        // add title to tree
        node.title = node.name;
        traverse(node.nodes);
      }
    }
  };

  traverse(project.state.layerstree);

  /** ORIGINAL SOURCE: src/app/core/layers/layerfactory.js@v3.10.2 */

  // Layer factory: instance each layer and add to layersstore
  project.getLayersStore().addLayers(project.getLayers().flatMap(l => {
    const config = Object.assign({}, l, {
      crs:               normalizeEpsg(l.crs || project.state.crs, false), // @v4.0 Fix In case of missing layer crs, set project crs
      projection:        l.crs ? ApplicationState.projections.get(l.crs) : project._projection,
      ows_method:        project.state.ows_method,
      wms_use_layer_ids: project.state.wms_use_layer_ids,
      //@since v4.0.0 - original config to maintain
      styles:            l.styles && l.styles.map(s => ({...s})), // v4.0.0 pass a copy of styles
    });
    try {
      return new Layer(config, { project });
    } catch (e) {
      console.warn(e);
      return []
    }
  }));
  
  // create layerstree
  let layerstree = [];
  if (!project.state.layerstree) {
    // retrieve all project layers that have geometry
    layerstree = project.getLayersStore().getLayers({ GEOLAYER: true }).map(l => ({
      id:      l.getId(),
      name:    l.getName(),
      title:   l.getTitle(),
      visible: l.isVisible() || false
    }));
  } else {
    const _traverse = (nodes, layerstree, tocLayersId) => {
      nodes.forEach(n => {
        let lightlayer = null;
        // case TOC has layer ID
        if (null !== n.id && undefined !== n.id && tocLayersId.find(id => n.id === id)) {
          lightlayer = ({ ...lightlayer, ...n });
        }
        // case group
        if (null !== n.nodes && undefined !== n.nodes) {
          lightlayer = ({
            ...lightlayer,
            name:                 n.name, /** @since 3.10.0 **/
            title:                n.name,
            groupId:              getUniqueDomId(),
            root:                 false,
            nodes:                [],
            checked:              n.checked,
            mutually_exclusive:   n["mutually-exclusive"],
            'mutually-exclusive': n["mutually-exclusive"], /** @since 3.10.0 */
          });
          _traverse(n.nodes, lightlayer.nodes, tocLayersId); // recursion step
        }
        // check if lightlayer is not null
        if (null !== lightlayer) {
          lightlayer.expanded = n.expanded; // expand legend item (TOC)
          layerstree.push(lightlayer);
        }
      });
    };
    // compare all layer ids from server config with all layer nodes on layerstree server property
    _traverse(
      project.state.layerstree,
      layerstree,
      project.getLayersStore().getLayers({ BASELAYER: false }).map(l => l.getId())
    );
  }

  // setLayerstree
  if (layerstree.length) {
    const rootGroup = {
      title:       project.state.name || project.state.gid,
      root:        true,
      toc:         true, //@since 4.1.0
      parentGroup: null,
      expanded:    'not_collapsed' === project.state.toc_layers_init_status,
      disabled:    false,
      checked:     true,
      bbox:        {
        minx: project.state.initextent.at(0),
        miny: project.state.initextent.at(1),
        maxx: project.state.initextent.at(2),
        maxy: project.state.initextent.at(3)
      },
      nodes:       layerstree,
    };
    const _traverseBBox =(group, { bbox, epsg } = {}) => {
      const project_epsg = project._projection.getCode();

      // translate bbox epsg to project epsg code (when they differ)
      if ((epsg !== project_epsg)) {
        const [minx, miny, maxx, maxy] = ol.proj.transformExtent([ bbox.minx, bbox.miny, bbox.maxx, bbox.maxy ], epsg, project_epsg);
        bbox = { minx, miny, maxx, maxy }
      }
      // get current bbox or compute bbox from an ol extent
      if (undefined === group.bbox) {
        group.bbox = bbox
      } else {
        group.bbox = ol.extent
          .extend(
            [ group.bbox.minx, group.bbox.miny, group.bbox.maxx, group.bbox.maxy ],
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
            { minxx:null, miny: null, maxx: null, maxy: null }
          );
      }
      // Recursion
      if (group.parentGroup && false === group.parentGroup.root) {
        _traverseBBox(group.parentGroup, { bbox: group.bbox, epsg: project_epsg });
      }
    };
    const _traverse = (nodes, parentGroup) => {
      return nodes.reduce((toc, node, index) => {
        // substitute node layer with layer state
        if (undefined !== node.id) {
          nodes[index] = project.getLayersStore().getLayerById(node.id).getState();
          // pass bbox and epsg of layer
          if (nodes[index].bbox) {
            _traverseBBox(parentGroup, { bbox: nodes[index].bbox, epsg: nodes[index].epsg });
          }
        }

        if (Array.isArray(node.nodes)) {
          node.nodes.forEach(n => n.parentGroup = parentGroup);
          node.toc = _traverse(node.nodes, node);
        }

        toc = toc || node.toc;
        //SET PARENT GROUP
        nodes[index].parentGroup = parentGroup;
        return toc;
      }, false);
    }
    //set root group visibility based on children nodes
    rootGroup.toc = _traverse(layerstree, rootGroup);
    
    project.getLayersStore().state.layerstree.splice(0, 0, rootGroup); // at the end
  }

  Object.assign(ApplicationState.project, project);

  /**@since 4.0.7 set map_theme of application */
  ApplicationState.map_theme.theme = Object.values(project.state.map_themes).flat().find(mt => mt.default)?.theme || null;

  // set in first position
  ApplicationState.layers[project.getGid()] = project.getLayersStore();

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
          const modified = ApplicationState.project.state.modified + '+' + new Date().toISOString().slice(0, 13);
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
  } catch (e) {
    console.warn(e);
  }

  /** @since 4.1.0 */
  GUI.emit('app-complete');
} catch(error) {
  console.error(error);
  error = error.responseJSON?.error?.data ?? error?.statusText ?? error
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