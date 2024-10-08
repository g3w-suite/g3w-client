/**
 * @file Production entry point (app.min.js)
 * @since v3.8
 */

// include backward compatibilies
import './deprecated';

// expose global variables
import './g3w-globals';

// constants
import {
  FONT_AWESOME_ICONS,
  LOCAL_ITEM_IDS,
  TIMEOUT,
}                                  from 'g3w-constants';

// core
import translations                from 'locales';
import ApplicationState            from 'store/application';
import G3WObject                   from 'g3w-object';
import Panel                       from 'g3w-panel';
import Component                   from 'g3w-component';

// services
import ApplicationService          from 'services/application';
import GUI                         from 'services/gui';

// components
import App                         from 'components/App.vue';
import ImageComponent              from 'components/GlobalImage.vue';
import GalleryImagesComponent      from 'components/GlobalGallery.vue';
import BarLoader                   from 'components/GlobalBarLoader.vue';
import Progressbar                 from 'components/GlobalProgressBar.vue';
import HelpDiv                     from 'components/GlobalHelpDiv.vue';
import DateTime                    from 'components/GlobalDateTime.vue';
import Range                       from 'components/GlobalRange.vue';
import Tabs                        from 'components/GlobalTabs.vue';
import Divider                     from 'components/GlobalDivider.vue';

// directives
import vDisabled                   from 'directives/v-disabled';
import vChecked                    from 'directives/v-checked';
import vSelect2                    from 'directives/v-select2';
import vTToltip                    from 'directives/v-t-tooltip';
import vTHtml                      from 'directives/v-t-html';
import vTTitle                     from 'directives/v-t-title';
import vT                          from "directives/v-t";
import vTPlugin                    from 'directives/v-t-plugin';
import vDownload                   from 'directives/v-download';

// utils
import { noop }                    from 'utils/noop';
import { XHR }                     from 'utils/XHR';
import { $promisify }              from 'utils/promisify';
import { getProject }              from 'utils/getProject';


const { addI18n, t, tPlugin } = require('g3w-i18n');

/**
 * Install global components
 *
 * ORIGINAL SOURCE: src/app/gui/vue/vue.globalcomponents.js@3.6
 */
Vue.component(ImageComponent.name, ImageComponent);
Vue.component(GalleryImagesComponent.name, GalleryImagesComponent);
Vue.component(BarLoader.name, BarLoader);
Vue.component(Progressbar.name, Progressbar);
Vue.component(HelpDiv.name, HelpDiv);
Vue.component(DateTime.name, DateTime);
Vue.component(Range.name, Range);
Vue.component(Tabs.name, Tabs);
Vue.component(Divider.name, Divider);

/**
 * Install application filters
 *
 * ORIGINAL SOURCE: src/app/gui/vue/vue.filter.js@3.6
 */
Vue.filter('t', value => t(value));
Vue.filter('tPlugin', value => value !== null ? tPlugin(value) : '');

/**
 * Install global directives
 *
 * ORIGINAL SOURCE: src/app/gui/vue/vue.directives.js@v3.6
 */
Vue.directive("disabled", vDisabled);
Vue.directive("checked", vChecked);
Vue.directive('select2', vSelect2);
Vue.directive('t-tooltip', vTToltip);
Vue.directive('t-html', vTHtml);
Vue.directive('t-title', vTTitle);
Vue.directive("t", vT);
Vue.directive("t-plugin", vTPlugin);
Vue.directive("download", vDownload);

/**
 * Install global plugins
 */
Vue.use(window.VueCookie);

/**
 * Vue 2 Plugin used to add global-level functionality to Vue
 *
 * @link https://v2.vuejs.org/v2/guide/plugins.html
 *
 * ORIGINAL SOURCE: src/app/gui/vue/vueappplugin.js@3.6
 */
Vue.use({
  install(Vue) {
    /** @since 3.11.0 */
    Vue.prototype.$t = t;
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

// loading spinner at beginning
$('body').append(`<div id="startingspinner"><div class="double-bounce1"></div><div class="double-bounce2"></div></div>`)

/** @TODO check if deprecated */
const ACTIONS = {};

const CONFIG = {};

// dataTable Translations and custom extentions
function _setDataTableLanguage() {
  //set form control class to filter
  $.extend($.fn.dataTableExt.oStdClasses, {
    "sFilterInput": "form-control search"
  });
  $.extend(true, $.fn.dataTable.defaults, {
    "language": {
      "sSearch": '',
      "searchPlaceholder": t("dosearch"),
      "sLengthMenu": t("dataTable.lengthMenu"),
      "paginate": {
        "previous": '«',
        "next": '»',
      },
      "info": t("dataTable.info"),
      "zeroRecords": t("dataTable.nodatafilterd"),
      "infoFiltered": ''
    }
  });
}

/**
 * Retrieve from local storage
 */
function _getSavedSearches() {
  const ITEMS = ApplicationState.querybuilder.searches;
  const id = ApplicationState.project.getId();
  ITEMS[id] = ITEMS[id] || [];
  return ITEMS[id];
}

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

ApplicationService.emit('initconfig', initConfig);

const vendorkeys = initConfig.vendorkeys || {};
initConfig.baselayers.forEach(l => {
  if (l.apikey) {
    vendorkeys[l.servertype ? l.servertype.toLowerCase() : null] = l.apikey
  }
});
Object.keys(vendorkeys).forEach(k => ApplicationState.keys.vendorkeys[k] = vendorkeys[k])

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
  layout:  initConfig.layout || {},
  plugins: initConfig.plugins || {},
  tools:   initConfig.tools || { tools:  [] },
  views:   initConfig.views || {},
  user:    initConfig.user || null,
});

initConfig.layout.iframe   = window.top !== window.self;

/** * @deprecated Since v3.8. Will be deleted in v4.x. Use ApplicationState.language instead */
ApplicationState.lng      = initConfig.user.i18n || 'en';
ApplicationState.language = initConfig.user.i18n || 'en';


// setup i18n
(initConfig.i18n || []).map(l => l[0]).forEach(l => ApplicationState.i18n.plugins[l] = { plugins: {} });

i18next
  .use(i18nextXHRBackend)
  .init({
      lng:         initConfig.user.i18n,
      ns:          'app',
      fallbackLng: 'en',
      resources:    translations
  });

jqueryI18next.init(i18next, $, {
  tName:                        't', // --> appends $.t = i18next.t
  i18nName:                     'i18n', // --> appends $.i18n = i18next
  handleName:                   'localize', // --> appends $(selector).localize(opts);
  selectorAttr:                 'data-i18n', // selector for translating elements
  targetAttr:                   'data-i18n-target', // element attribute to grab target element to translate (if diffrent then itself)
  optionsAttr:                  'data-i18n-options', // element attribute that contains options, will load/set if useOptionsAttr = true
  useOptionsAttr:               false, // see optionsAttr
  parseDefaultValueFromContent: true // parses default values from content ele.val or ele.text
});

addI18n(ApplicationState.i18n.plugins);

// set Accept-Language request header based on config language
$.ajaxSetup({
  beforeSend: xhr => { xhr.setRequestHeader('Accept-Language', initConfig.user.i18n || 'en'); }
});

/**
 * Application starting point
 *
 * create the ApplicationTemplate instance passing template interface configuration
 * and the applicationService instance that is useful to work with project API
 */
(new Promise(async (resolve, reject) => {

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

  // Updates panels sizes when showing content (eg. bottom "Attribute Table" panel, right "Query Results" table)
  initConfig.layout.rightpanel = Object.assign(
    (initConfig.layout.rightpanel || {}),
    {
      width:          initConfig.layout.rightpanel.width  || 50, // ie. width == 50%
      height:         initConfig.layout.rightpanel.height || 50, // ie. height == 50%
      width_default:  initConfig.layout.rightpanel.width  || 50,
      height_default: initConfig.layout.rightpanel.height || 50,
      width_100:      false,
      height_100:     false,
    }
  );

  ApplicationState.gui.layout.app      = initConfig.layout;

  // setup projects
  initConfig.projects.forEach(project => Object.assign(project, {
    baselayers:         initConfig.baselayers,
    minscale:           initConfig.minscale,
    maxscale:           initConfig.maxscale,
    crs:                initConfig.crs,
    vectorurl:          initConfig.vectorurl,
    rasterurl:          initConfig.rasterurl,
  }));

  const timeout = setTimeout(() => { reject('Timeout') }, TIMEOUT);

  // get current project configuration
  getProject(initConfig.initproject, { map_theme: (new URLSearchParams(location.search)).get('map_theme') } )
    .then((project) => {
      clearTimeout(timeout);

      const { MapLayersStoresRegistry } = require('services/map').default;

      Object.assign(ApplicationState.project, project);

      // set in first position (map and catalog)
      const store = project.getLayersStore();
      ApplicationState.catalog[store.getId()] = store;

      MapLayersStoresRegistry.addLayersStore(store);

      // BACKOMP v3.x
      g3wsdk.core.project.ProjectsRegistry.setCurrentProject(project);

      window.addEventListener('online', () => {
        ApplicationState.online = true;
        ApplicationService.online();
      });

      window.addEventListener('offline', () => {
        ApplicationState.online = false;
        ApplicationService.offline();
      });

      ApplicationService.emit('ready');

      ApplicationState.map.epsg = project.state.crs.epsg;

      if (ApplicationState.iframe) {
        require('services/iframe').default.init({ project });
      }

      // init local items
      Object.keys(LOCAL_ITEM_IDS).forEach(id => {
        try {
          const item = window.localStorage.getItem(id) ? JSON.parse(window.localStorage.getItem(id)) : undefined;
          if (undefined === item) {
            window.localStorage.setItem(id, JSON.stringify(LOCAL_ITEM_IDS[id].value));
          }
        } catch(e) {
          console.warn(e);
        }
      });
      resolve(true);
    }).catch(e => {
      console.warn(e);
      reject(e);
    });
})).then(() => {
    // create Vue App
    _setDataTableLanguage();

    if (isMobile.any || (window.initConfig.layout || {}).iframe) {
      $('body').addClass('sidebar-collapse');
    }

    new Vue({
      el: '#app',
      created() {

        Vue.component('app', App);

        // update CONFIG
        Object.assign(CONFIG, {
          sidebar: [
            /**
             * ORIGINAL SOURCE: src/components/g3w-metadata.js@v3.10.2
             */
            new (function() {
              const comp = new Component({
                id:          'metadata',
                collapsible: false,
                icon:        GUI.getFontClass('file'),
                iconColor:   '#fff',
                title: 'sdk.metadata.title',
                service: Object.assign(new G3WObject, {
                  state: {
                    name:   ApplicationState.project.getState().title,
                    groups: Object.entries({
                      general: [ 'title', 'name', 'description', 'abstract', 'keywords', 'fees', 'accessconstraints', 'contactinformation', 'wms_url' ],
                      spatial: [ 'crs', 'extent' ],
                      layers:  [ 'layers' ],
                    }).reduce((g, [name, fields]) => {
                      g[name] = fields.reduce((f, field) => {
                        const project = ApplicationState.project.getState();
                        const value = project.metadata && project.metadata[field] ? project.metadata[field] : project[field];
                        if (value) {
                          f[field] = { value, label: `sdk.metadata.groups.${name}.fields.${field}` };
                        }
                        return f;
                      }, {});
                      return g;
                    }, {}),
                  },
                  content: null,
                  show: false,
                }),
                vueComponentObject: { template: '<div></div>' },
              });

              // show metadata
              comp._setOpen = b => {
                const service = comp.getService();
                service.show = b;
                if (b) {
                  service.content        = new Component({
                    service,
                    internalComponent: new (Vue.extend(require('components/MetadataProject.vue')))({ state: service.state })
                  });
                  service.content.layout = noop;
                  GUI.setContent({ content: service.content, title: 'sdk.metadata.title', perc: 100 });
                  service.show = true;
                } else {
                  GUI.closeContent()
                }
              };

              GUI.on('closecontent', () => comp.getService().state.open = false);

              return comp;
            }),

            /**
             * ORIGINAL SOURCE: src/components/g3w-spatialbookmarks.js@v3.10.2
             */
            new (function() {
              const comp = new Component({
                id:                 'spatialbookmarks',
                icon:               GUI.getFontClass('bookmark'),
                iconColor:          '#00bcd4',
                title:              'sdk.spatialbookmarks.title',
                vueComponentObject: require('components/SpatialBookMarks.vue'),
              });

              GUI.on('closecontent', () => { comp.state.open = false; });

              return comp;
            }),

            /**
             * ORIGINAL SOURCE: src/components/g3w-print.js@v3.10.2 
             */
            Object.assign(new Component({
              id:                'print',
              visible:           window.initConfig.user.is_staff || (ApplicationState.project.getPrint() || []).length > 0, /** @since 3.10.0 Check if the project has print layout*/
              icon:              GUI.getFontClass('print'),
              iconColor:         '#FF9B21',
              title:             'print',
              service:           {},
              internalComponent: new (Vue.extend(require('components/Print.vue'))),
            }), {
              //@since 3.11.0 use internal methods called by component setters if declared
              _setOpen(bool) { this.getInternalComponent().showPrintArea(bool) },
            }),

            /**
             * ORIGINAL SOURCE: src/components/g3w-search.js@v3.10.2 
             */
            new Component({
              id:         'search',
              visible:     true,
              icon:        GUI.getFontClass('search'),
              iconColor:   '#8dc3e3',
              title:       ApplicationState.project.state.search_title || 'search',
              service: Object.assign(new G3WObject, {
                state: {
                  searches: (ApplicationState.project.state.search || []).sort((a, b) => `${a.name}`.localeCompare(b.name)),
                  tools: [],
                  querybuildersearches: _getSavedSearches()
                },
                title:                    ApplicationState.project.state.search_title || "search",
                addTool(t)                { this.state.tools.push(t); },
                addTools(tt)              { for (const t of tt) this.addTool(t); },
                showPanel(o)              { return new (require('components/g3w-search')).SearchPanel(o, true) },
                getTitle()                { return this.title },
                removeTools()             { this.state.tools.splice(0) },
                stop(d)                   { return $promisify(Promise.resolve(d)) },
                removeTool()              {},
              }),
              actions:     [
                {
                  id:      "querybuilder",
                  class:   `${GUI.getFontClass('calculator')} sidebar-button sidebar-button-icon`,
                  tooltip: t('sdk.querybuilder.title'),
                  fnc:     () => {
                    GUI.closeContent();
                    GUI.closeSideBar();
                    return new Panel({
                      title: t('sdk.querybuilder.title'),
                      show: true,
                      vueComponentObject: require('components/QueryBuilder.vue')
                    });
                  },
                  style: {
                    color:        '#8DC3E3',
                    padding:      '6px',
                    fontSize:     '1.2em',
                    borderRadius: '3px',
                    marginRight:  '5px'
                  }
              }],
              vueComponentObject: require('components/Search.vue'),
            }),

            /**
             * ORIGINAL SOURCE: src/components/g3w-tools.js@v3.10.2 
             */
            new (function() {

              const state   = {
                id:          'tools',
                icon:        GUI.getFontClass('tools'),
                iconColor:   '#FFE721',
                toolsGroups: [],
                visible: false,
                loading: false
              };
            
              const service = new G3WObject({ setters: {
                addTool(tool, { title, position }) {
                  let group = state.toolsGroups.find(g => g.name === title);
                  if (!group) { group = { name: title, tools: [] }; state.toolsGroups.splice(position, 0, group); }
                  return group.tools.push(Object.assign(tool, {
                    state:  tool.state || ({ type: null, message: null }),
                    action: tool.action || (ACTIONS[tool.type] || noop).bind(null, tool.options)
                  }));
                },
                addToolGroup(position, name) {
                  let group = state.toolsGroups.find(g => g.name === name);
                  if (!group) { group = { name, tools: [] }; state.toolsGroups.splice(position, 0, group); }
                  return group;  
                },
                addTools(tools, groupName)   { tools.forEach(t => this.addTool(t, groupName)); },
                removeToolGroup(name)        { state.toolsGroups = state.toolsGroups.filter(g => g.name !== name); },
                removeTools()                { state.toolsGroups.splice(0); },
              }});
            
              service.state            = state;
              service.config           = null;
              service.getState         = () => state;
              service.reload           = () => { service.removeTools(); };
              service.setLoading       = (bool = false) => { state.loading = bool; }
            
              // static class field
              service.ACTIONS = ACTIONS;
            
              const tools = ApplicationState.project.getState().tools || {};
            
              for (let t in tools) {
                service.addToolGroup(0, t.toUpperCase());
                service.addTools(
                  tools[t].map(tool => ({ name: tool.name, action: ACTIONS[t].bind(null, tool) })),
                  { position: 0, title: t.toUpperCase() }
                );
              }
            
              const comp = new Component({
                id:          'tools',
                icon:        GUI.getFontClass('tools'),
                iconColor:   '#FFE721',
                title: "tools",
                service,
                internalComponent: new (Vue.extend({
                  template: /* html */ `
                    <ul class="g3w-tools treeview-menu">
                      <bar-loader :loading="state.loading"/>
                      <li v-for="g in state.toolsGroups" :key="g.name">
                        <div class="tool-header"><i :class="g3wtemplate.getFontClass('tool')"></i><span>{{ g.name }}</span></div>
                        <div :id="g.name + '-tools'" class="tool-box"><g3w-tool v-for="t in g.tools" :key="t.name" :tool="t" /></div>
                      </li>
                    </ul>`,
                  components: { G3wTool: require('components/Tool.vue') },
                  data: () => ({ state: null }),
                  watch: {
                    async 'state.toolsGroups'(g) {
                      comp.setVisible(g.length > 0);
                      this.$emit('visible', g.length > 0);
                      await GUI.isReady();
                      document.querySelector('#g3w-sidebarcomponents #tools').classList.toggle('single', 1 === g.length && 'EDITING' === g[0].name);
                    }
                  },
                }))(),
              });
            
              comp._setOpen = (b = false) => {
                comp.internalComponent.state.open = b;
                if (b) {
                  GUI.closeContent();
                }
              };
            
              return comp;
            }),

            /**
             * ORIGINAL SOURCE: src/components/g3w-wms.js@v3.10.2 
             */
            Object.assign(new Component({
              id:                'wms',
              icon:              GUI.getFontClass('layers'),
              title:             'sidebar.wms.add_wms_layer',
              service:           {},
              internalComponent: new (Vue.extend(require('components/WMS.vue')))(),
            }), {
              _setOpen(b = false) {
                this.getInternalComponent().state.open = b;
                if (b) {
                  GUI.closeContent();
                }
              }
            }),

            /**
             * ORIGINAL SOURCE: src/components/g3w-catalog.js@v3.10.2 
             */
            new (function() {

              const state = {
                external: {   // external layers
                  wms:    [], // added by wms sidebar component
                  vector: []  // added to map controls for the moment
                },
                layerstrees:  Object.values(ApplicationState.catalog).map(s => ({ tree: s.getLayersTree(), storeid: s.getId() })),
                layersgroups: [],
              };
            
              const service = new G3WObject({
                setters: {
                  /**
                   * @param {{ layer: unknown, type: 'vector' }}
                   *
                   * @fires CatalogService~addExternalLayer
                   *
                   * @since 3.8.0
                   */
                  addExternalLayer({ layer, type='vector' } = {}) {
                    layer.removable = true;
                    state.external[type].push(layer);
                  },
                  /**
                   * @param {{ name: string, type: 'vector' }}
                   *
                   * @fires CatalogService~removeExternalLayer
                   *
                   * @since 3.8.0
                   */
                  removeExternalLayer({ name, type='vector' } = {}) {
                    state.external[type].filter((l, i) => {
                      if (name === l.name) {
                        state.external[type].splice(i, 1);
                        return true;
                      }
                    });
                  },
                }
              });
            
              service.state             = state;
            
              /** used by the following plugins: "stress" */
              service.createLayersGroup = ({ title = 'Layers Group', layers = [] } = {}) => ({ title, nodes: layers.map(l => l) });
              /** used by the following plugins: "stress" */
              service.addLayersGroup    = g => { state.layersgroups.push(g); };
              /** used by the following plugins: "processing" */
              service.getExternalLayers = ({ type = 'vector' })     => state.external[type];

              const comp = new Component({
                id:                 'catalog',
                icon:               GUI.getFontClass('map'),
                iconColor:          '#019A4C',
                title:              'catalog',
                resizable:          true,
                vueComponentObject: require('components/Catalog.vue'),
                service,
              });
            
              return comp;
            }),
          ],

          /**
           * ORIGINAL SOURCE: src/components/g3w-queryresults.js@v3.10.2 
           */
          queryresults: new Component({
            id:                 'queryresults',
            title:              'Query Results',
            service:            require('services/queryresults').default,
            vueComponentObject: require('components/QueryResults.vue'),
          }),

          /**
           * ORIGINAL SOURCE: src/components/g3w-map.js@v3.10.2 
           */
          map: new Component({
            id:                 'map',
            title:              'Map Component',
            service:            new (require('services/map').default).MapService(),
            vueComponentObject: require('components/Map.vue'),
          }),

          /**
           * ORIGINAL SOURCE: src/components/g3w-contentsviewer.js@v3.10.2 
           */
          content: Object.assign(new Component({
            id:                 'contents',
            title:              'contents',
            vueComponentObject: { template: `<div id="contents" class="contents"></div>` },
          }), {
            /** DOM element where insert the component/panel  */
            parent: null,
            contentsdata:           ApplicationState.contentsdata,
            getComponentById: id => (ApplicationState.contentsdata.find(d => id == d.content.id) || {}).content,
          }),

        });

        // listen lng change and reset datatable language
        this.$watch(() => ApplicationState.language, () => _setDataTableLanguage());
      },

      async mounted() {
        await this.$nextTick();

        // add component to the sidebar and set position inside the sidebar
        CONFIG.sidebar.forEach(comp => {
          if (!isMobile.any || false !== comp.mobile) {
            ApplicationState.sidebar.components.push(comp);
            (new (Vue.extend(require('components/SidebarItem.vue')))({ component: comp })).$mount();
          }
        });

        CONFIG.sidebar.forEach(comp => GUI.addComponent(comp));

        // register other components
        GUI.addComponent(CONFIG.queryresults);

        // setup Font, Css class methods
        $(document).localize();

        CONFIG.map    .mount('#g3w-view-map', true);
        CONFIG.content.mount('#g3w-view-content', true);

        GUI.addComponent(CONFIG.map);
        GUI.addComponent(CONFIG.content);

        await this.$nextTick();

        ApplicationState.sizes.sidebar.width = $('.main-sidebar').width();

        GUI.ready();

        // init plugins
        try {
          const gidProject = ApplicationState.project.getGid(); // current project

          // set plugin config filtered by gid
          const enabledPlugins = {};
          Object.entries(window.initConfig.plugins).filter(([,p]) => p.gid === gidProject).forEach(([name, config]) => enabledPlugins[name] = config);
          Object.assign(ApplicationState.pluginsConfigs, enabledPlugins);

          Object.keys(ApplicationState.pluginsConfigs).forEach(p => ApplicationState.configurationPlugins.push(p)); // filter
          Object.keys(ApplicationState.pluginsConfigs).forEach(p => ApplicationState.plugins.push(p));

          // set plugins that aren't within server configuration  but in project (law for example)
          const otherPluginsConfig = ApplicationState.project.getState() || {};
          if (otherPluginsConfig && otherPluginsConfig.law && otherPluginsConfig.law.length) {
            // law plugin
            ApplicationState.pluginsConfigs.law     = otherPluginsConfig.law;
            ApplicationState.pluginsConfigs.law.gid = otherPluginsConfig.gid;
          } else {
            delete ApplicationState.pluginsConfigs.law;
          }

          /** @TODO check if deprecated */
          for (const p in ApplicationState.pluginsConfigs) {
            Object
              .entries(ApplicationState.pluginsConfigs[p].plugins || {})
              .forEach(([name, config]) => ApplicationState.pluginsConfigs[name] = {
                ...ApplicationState.pluginsConfigs[name],
                ...config
              });
          }

          // load plugins
          await Promise
            .allSettled(Object.entries(ApplicationState.pluginsConfigs)
            .map(async ([name, config]) => {
              if (!config) {
                return;
              }
              config.baseUrl = window.initConfig.urls.staticurl;
              try {
                // wait plugin dependencies before loading plugin
                await Promise.all((config.jsscripts || []).map(s => _loadScript(s, false)));
                await _loadScript(`${window.initConfig.urls.staticurl}${name}/js/plugin.js?${Date.now()}`, false);
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

        // trigger 'complete' event
        ApplicationService.complete = true;
        ApplicationService.emit('complete');

      },
    });
  })
  .catch(error => {
    console.warn(error);
    if (error) {
      if (error.responseJSON && error.responseJSON.error.data) { error = error.responseJSON.error.data }
      else if (error.statusText) { error = error.statusText }
    }
    $('#startingspinner').remove();
    new Vue({
      el: '#app',
      ...Vue.compile(
        `<div class="error-initial-page skin-background-color">
          <template v-if="isMobile()">
            <h3 class="oops">Oops!</h3>
            <h5 class="cause">${ error || t('error_page.error') }</h5>
            <h6 class="at-moment">${ t('error_page.at_moment') }</h6>
            <h4 class="f5">${ t('error_page.f5') }</h4>
          </template>
          <template v-else>
            <h1 class="oops">Oops!</h1>
            <h1 class="cause">${ error || t('error_page.error') }</h1>
            <h3 class="at-moment">${ t('error_page.at_moment') }</h3>
            <h2 class="f5">${ t('error_page.error') }</h2>
          </template>
        </div>`
      )
    });
  });
