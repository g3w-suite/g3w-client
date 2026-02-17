/**
 * @file Production entry point (app.min.js)
 * @since v3.8
 */

import 'assets/app.css';

// expose global variables
import './g3w-globals';

// constants
import {
  FONT_AWESOME_ICONS,
  TIMEOUT,
}                                  from 'g3w-constants';

// core
import ApplicationState            from 'store/application';
import G3WObject                   from 'g3w-object';
import Panel                       from 'g3w-panel';
import Component                   from 'g3w-component';

// services
import ApplicationService          from 'services/application';
import GUI                         from 'services/gui';
import { MapLayersStoresRegistry } from 'services/map';
import IframePluginService         from 'services/iframe';

// components
import App                         from 'components/App.vue';
import BarLoader                   from 'components/GlobalBarLoader.vue';
import Progressbar                 from 'components/GlobalProgressBar.vue';
import HelpDiv                     from 'components/GlobalHelpDiv.vue';
import DateTime                    from 'components/GlobalDateTime.vue';
import Range                       from 'components/GlobalRange.vue';
import Tabs                        from 'components/GlobalTabs.vue';
import Divider                     from 'components/GlobalDivider.vue';

// directives
import vDisabled                   from 'directives/v-disabled';
import vSelect2                    from 'directives/v-select2';
import vTToltip                    from 'directives/v-t-tooltip';
import vT                          from "directives/v-t";

// utils
import { noop }                    from 'utils/noop';
import { XHR }                     from 'utils/XHR';
import { $promisify }              from 'utils/promisify';
import { getProject }              from 'utils/getProject';


// Internationalization
import { gettext as _ } from 'g3w-i18n';

import 'components/g3w-alerts';

Object
  .entries({
    ApplicationState,
    G3WObject,
    Panel,
    Component,
    ApplicationService,
    GUI,
    MapLayersStoresRegistry,
    IframePluginService,
    App,
    BarLoader,
    Progressbar,
    HelpDiv,
    DateTime,
    Range,
    Tabs,
    Divider,
    getProject
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

/**
 * Install global components
 *
 * ORIGINAL SOURCE: src/app/gui/vue/vue.globalcomponents.js@3.6
 */
Vue.component(BarLoader.name, BarLoader);
Vue.component(Progressbar.name, Progressbar);
Vue.component(HelpDiv.name, HelpDiv);
Vue.component(DateTime.name, DateTime);
Vue.component(Range.name, Range);
Vue.component(Tabs.name, Tabs);
Vue.component(Divider.name, Divider);

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
 * Install global plugins
 */
Vue.use(require('vue-cookie'));

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

/** @TODO check if deprecated */
const ACTIONS = {};

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
 *
 * create the ApplicationTemplate instance passing template interface configuration
 * and the applicationService instance that is useful to work with project API
 */
(async () => { try {

  ApplicationState.language = initConfig.user.i18n;

  // lazy load i18n translations
  _.register('en',                   (await import(`${initConfig.urls.clienturl}locales/en.js`)).default);
  _.register([initConfig.user.i18n], (await import(`${initConfig.urls.clienturl}locales/${initConfig.user.i18n}.js`)).default);

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

  ApplicationState.gui.layout.app = initConfig.layout;

  // setup projects
  initConfig.projects.forEach(project => Object.assign(project, {
    baselayers:         initConfig.baselayers,
    minscale:           initConfig.minscale,
    maxscale:           initConfig.maxscale,
    crs:                initConfig.crs,
    vectorurl:          initConfig.vectorurl,
    rasterurl:          initConfig.rasterurl,
  }));

  // get current project configuration
  const project = await Promise.race([
    new Promise(res => setTimeout(() => res("Timeout"), TIMEOUT)),
    getProject(initConfig.initproject, { map_theme: (new URLSearchParams(location.search)).get('map_theme') } )
  ]);

  Object.assign(ApplicationState.project, project);

  /**@since 4.0.7 set map_theme of application */
  ApplicationState.map_theme.theme = Object.values(project.state.map_themes).flat().find(mt => mt.default)?.theme || null;
  
  // set in first position (map and catalog)
  const store = project.getLayersStore();
  ApplicationState.catalog[store.getId()] = store;

  MapLayersStoresRegistry.addLayersStore(store);

  // BACKCOMP v3.x
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

  if (ApplicationState.iframe) {
    IframePluginService.init({ project })
  }

  if (isMobile.any || (window.initConfig.layout || {}).iframe) {
    $('body').addClass('sidebar-collapse');
  }

  Vue.component('app', App);

  await new Promise(resolve => new Vue({ el: '#app', mounted: resolve }));

  // add component to the sidebar
  [

      /**
       * ORIGINAL SOURCE: src/components/g3w-spatialbookmarks.js@v3.10.2
       */
      new Component({
        id:                 'spatialbookmarks',
        icon:               'far fa-bookmark',
        iconColor:          '#00bcd4',
        title:              'Bookmarks',
        vueComponentObject: require('components/SpatialBookMarks.vue').default,
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
        internalComponent: new (Vue.extend(require('components/Print.vue').default)),
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
            tooltip: _('Advanced search'),
            fnc:     () => {
              GUI.closeContent();
              GUI.closeSideBar();
              return new Panel({
                title: _('Advanced search'),
                show: true,
                vueComponentObject: require('components/QueryBuilder.vue').default
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
        vueComponentObject: require('components/Search.vue').default,
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
            components: { G3wTool: require('components/Tool.vue').default },
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
          vueComponentObject: require('components/Catalog.vue').default,
          service,
        });
      
        return comp;
      }),

    ].forEach(comp => GUI.addComponent(comp, 'sidebar'));

  // register other components
  GUI.setComponent(new Component({
    id:                 'queryresults',
    service:            require('services/queryresults').default,
    vueComponentObject: require('components/QueryResults.vue').default,
  }));

  GUI.setComponent(new Component({
    id:                 'map',
    service:            new (require('services/map').default).MapService(),
    vueComponentObject: require('components/Map.vue').default,
  }));

  GUI.setComponent(Object.assign(new Component({
    id:                 'contents',
    vueComponentObject: { template: `<div id="contents" class="contents"></div>` },
  }), {
    /** DOM element where insert the component/panel  */
    parent:                 null,
    contentsdata:           ApplicationState.contentsdata,
    getComponentById: id => (ApplicationState.contentsdata.find(d => id == d.content.id) || {}).content,
  }));

  GUI.getComponent('map').mount('#g3w-view-map', true);
  GUI.getComponent('contents').mount('#g3w-view-content', true);

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
          const modified = g3wsdk.core.project.ProjectsRegistry.getCurrentProject().getState().modified + '+' + new Date().toISOString().slice(0, 13);
          await _loadScript(`${window.initConfig.urls.staticurl}${name}/js/plugin.js?${modified}`, false);
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

} catch(error) {
  console.error(error);
  error = error.responseJSON?.error?.data ?? error?.statusText ?? error
  $('#startingspinner').remove();
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