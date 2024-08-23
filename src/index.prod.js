/**
 * @file Production entry point (app.min.js)
 * @since v3.8
 */

// include backward compatibilies
import './deprecated';

// expose global variables
import './globals';

// constants
import { FONT_AWESOME_ICONS }  from 'app/constant';

// core
import ApplicationState            from 'store/application-state';
import ProjectsRegistry            from 'store/projects';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import ComponentsRegistry          from 'store/components';
import G3WObject                   from 'core/g3w-object';
import { BarStack }                from 'core/g3w-barstack';
import Panel                       from 'core/g3w-panel';
import Component                   from 'core/g3w-component';

// services
import ApplicationService          from 'services/application';
import GUI                         from 'services/gui';

// components
import App                         from 'components/App.vue';
import ImageComponent              from 'components/GlobalImage.vue';
import GalleryImagesComponent      from 'components/GlobalGallery.vue';
import GeospatialComponet          from 'components/GlobalGeo.vue';
import Skeleton                    from 'components/GlobalSkeleton.vue';
import BarLoader                   from 'components/GlobalBarLoader.vue';
import Progressbar                 from 'components/GlobalProgressBar.vue';
import HelpDiv                     from 'components/GlobalHelpDiv.vue';
import Resize                      from 'components/GlobalResize.vue'
import LayerPositions              from 'components/GlobalLayerPositions.vue';
import DateTime                    from 'components/GlobalDateTime.vue';
import Range                       from 'components/GlobalRange.vue';
import ResizeIcon                  from 'components/GlobalResizeIcon.vue';
import Tabs                        from 'components/GlobalTabs.vue';
import Divider                     from 'components/GlobalDivider.vue';

// directives
import vDisabled                   from 'directives/v-disabled';
import vChecked                    from 'directives/v-checked';
import vSelectedFirst              from 'directives/v-selected-first';
import vSelect2                    from 'directives/v-select2';
import vTToltip                    from 'directives/v-t-tooltip';
import vTHtml                      from 'directives/v-t-html';
import vTPlaceholder               from 'directives/v-t-placeholder';
import vTTitle                     from 'directives/v-t-title';
import vT                          from "directives/v-t";
import vTPlugin                    from 'directives/v-t-plugin';
import vPlugins                    from 'directives/v-plugins';
import vOnline                     from 'directives/v-online';
import vDownload                   from 'directives/v-download';
import vClickOutside               from 'directives/v-click-outside';

// utils
import { noop }                    from 'utils/noop';
import { resolve }                 from 'utils/resolve';

const { t, tPlugin }               = require('core/i18n/i18n.service');

/**
 * @TODO make it simpler / move it into better place
 */
ApplicationState.sidebar.stack             = new BarStack();
ApplicationState.viewport.immediate_layout = true;

GUI.addComponent = function(component, placeholder, options={}) {
  let register = true;
  if (placeholder && Object.keys(SERVICES).indexOf(placeholder) > -1) {
    // add component to the sidebar and set position inside the sidebar
    if ('sidebar' === placeholder) {
      if (!isMobile.any || false !== component.mobile) {
        ApplicationState.sidebar.components.push(component);
        (new (Vue.extend(require('components/SidebarItem.vue')))({ component, opts: options })).$mount();
      }
      register = true;
    } else if (SERVICES[placeholder]) {
      register = SERVICES[placeholder].addComponents([component], options);
    }
  }
  if (register) {
    ComponentsRegistry.registerComponent(component);
    ApplicationService.registerService(component.id, component.getService());
  }
  return true;
};

/**
 * Install global components
 *
 * ORIGINAL SOURCE: src/app/gui/vue/vue.globalcomponents.js@3.6
 */
Vue.component(ImageComponent.name, ImageComponent);
Vue.component(GalleryImagesComponent.name, GalleryImagesComponent);
Vue.component(GeospatialComponet.name, GeospatialComponet);
Vue.component(BarLoader.name, BarLoader);
Vue.component(Progressbar.name, Progressbar);
Vue.component(Skeleton.name, Skeleton);
Vue.component(HelpDiv.name, HelpDiv);
Vue.component(Resize.name, Resize);
Vue.component(LayerPositions.name, LayerPositions);
Vue.component(DateTime.name, DateTime);
Vue.component(Range.name, Range);
Vue.component(ResizeIcon.name, ResizeIcon);
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
Vue.directive("selected-first", vSelectedFirst);
Vue.directive('select2', vSelect2);
Vue.directive('t-tooltip', vTToltip);
Vue.directive('t-html', vTHtml);
Vue.directive('t-placeholder', vTPlaceholder);
Vue.directive('t-title', vTTitle);
Vue.directive("t", vT);
Vue.directive("t-plugin", vTPlugin);
Vue.directive("plugins", vPlugins);
Vue.directive("online", vOnline);
Vue.directive("download", vDownload);
Vue.directive("click-outside", vClickOutside);

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
    // hold a list of registered fontawsome classes for current project
    Vue.prototype.g3wtemplate = {
      font: FONT_AWESOME_ICONS,
      /**
       * @TODO check if deprecated
       */
      get() {},
      getInfo() {
        return {
          font: this.font
        }
      },
      addFontClass({ name, className } = {}) {
        const added = undefined === this.font[name];
        if (added) {
          this.font[name] = className;
        }
        return added;
      },
      /**
       * @TODO check if deprecated
       */
      getInfoString() {},
      getFontClass(type) {
        return undefined === this.font[type] ? '' : this.font[type];
      }
    };
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

// service know by the applications (standard)
const SERVICES = {
  navbar:   null,
  sidebar:  null,
  viewport: null,
};

const GROUPS = {
  general: ['title', 'name', 'description', 'abstract', 'keywords', 'fees', 'accessconstraints', 'contactinformation', 'wms_url'],
  spatial: ['crs', 'extent'],
  layers: ['layers'],
};

/** @TODO check if deprecated */
const ACTIONS = {};

const CONFIG = {};

// dataTable Translations and custom extentions
function _setDataTableLanguage(dataTable=null) {
  const languageOptions = {
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
  };
  //set form control class to filter
  $.extend( $.fn.dataTableExt.oStdClasses, {
    "sFilterInput": "form-control search"
  });
  !dataTable ? $.extend( true, $.fn.dataTable.defaults, languageOptions) : dataTable.dataTable( {"oLanguage": languageOptions});
}

/**
 * @TODO check if deprecated
 */
function _listenToMapVisibility(map_id, component) {
  if (!map_id) {
    return;
  }

  component.mapComponentId = map_id;

  const map = GUI.getComponent(map_id);

  const cb = map => {
    const ms = map.getService();
    component.state.visible = !ms.state.hidden;
    ms.onafter('setHidden', () => { component.state.visible = !ms.state.hidden; component.state.expanded = true; });
  };

  if (map) { cb(map) }
  else { ComponentsRegistry.on('componentregistered', c => map_id === c.getId() && cb(c)) }
}

/**
 * Application starting point
 *
 * create the ApplicationTemplate instance passing template interface configuration
 * and the applicationService instance that is useful to work with project API
 */
ApplicationService.init()
  .then(() => {
    // create Vue App
    _setDataTableLanguage();

    if (isMobile.any || (ApplicationService.getConfig().layout || {}).iframe) {
      $('body').addClass('sidebar-collapse');
    }

    new Vue({
      el: '#app',
      created() {

        Vue.component('app', App);

        //register all services for the application
        Object.keys(SERVICES)             .forEach(element   => ApplicationService.registerService(element, SERVICES[element]));   
        Object.values(GUI.getComponents()).forEach(component => ApplicationService.registerService(component.id, component.getService()));

        // update CONFIG
        const SearchComponent       = require('gui/search/vue/search');

        Object.assign(CONFIG, {
          sidebar: [
            /**
             * ORIGINAL SOURCE: src/components/g3w-metadata.js@v3.10.2
             */
            new (function() {

              const opts = {
                id:          'metadata',
                collapsible: false,
                icon:        GUI.getFontClass('file'),
                iconColor:   '#fff'
              };

              const state = {
                name: '',
                groups: {}
              };
            
              const comp = new Component({
                ...opts,
                title: 'sdk.metadata.title',
                service: Object.assign(opts.service || new G3WObject(), {
                  state,
                  content: null,
                  show: false,
                  reload(emit = true) {
                    if (emit) {
                      comp.getService().emit('reload');
                    }
                    const project = ProjectsRegistry.getCurrentProject().getState();
                    state.name    = project.title;
                    state.groups  = Object.entries(GROUPS).reduce((g, [name, fields]) => {
                      g[name] = fields.reduce((f, field) => {
                        const value = project.metadata && project.metadata[field] ? project.metadata[field] : project[field];
                        if (value) {
                          f[field] = { value, label: `sdk.metadata.groups.${name}.fields.${field}` };
                        }
                        return f;
                      }, {});
                      return g;
                    }, {});
                  }
                }),
                vueComponentObject: require('components/Metadata.vue'),
              });
            
              // build project group metadata
              comp.getService().reload(false);
              comp.getService().on('reload', () => comp.setOpen(false));
            
              // show metadata
              comp._setOpen = b => {
                const service = comp.getService();
                service.show = b;
                if (b) {
                  service.content        = new Component({ service, internalComponent: new (Vue.extend(require('components/MetadataProject.vue')))({ state }) });
                  service.content.layout = noop;
                  GUI.setContent({ content: service.content, title: 'sdk.metadata.title', perc: 100 });
                  service.show = true;
                } else {
                  GUI.closeContent()
                }
              };

              GUI.on('closecontent', () => comp.state.open = false);

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
            new (function() {
              const comp = new Component({
                id:          'print',
                visible:     ApplicationService.getConfig().user.is_staff || (ProjectsRegistry.getCurrentProject().getPrint() || []).length > 0, /** @since 3.10.0 Check if the project has print layout*/
                icon:        GUI.getFontClass('print'),
                iconColor:   '#FF9B21',
                title: 'print',
                service: {},
                internalComponent: new (Vue.extend(require('components/Print.vue'))),
              });
    
              //@since 3.11.0 use internal methods called by component setters if declared
              comp._setOpen = (bool) => comp.getService().showPrintArea(bool);
              comp._reload = () => { comp.getService().reload(); comp.state.visible = service.state.visible; }
    
              // BACKCOMP v3.x
              const service             = comp.getService();
              const internalComponent   = comp.getInternalComponent();
    
              service.state             = internalComponent.state;
              service.changeScale       = internalComponent.changeScale;
              service.getOverviewExtent = internalComponent.getOverviewExtent;
              service.changeRotation    = internalComponent.changeRotation;
              service.changeTemplate    = internalComponent.changeTemplate;
              service.print             = internalComponent.print;
              service.showPrintArea     = internalComponent.showPrintArea;
              service.reload            = internalComponent.reload;
    
              return comp;
            }),

            new SearchComponent({
              id:         'search',
              icon:        GUI.getFontClass('search'),
              iconColor:   '#8dc3e3',
              actions:     [
                {
                  id:      "querybuilder",
                  class:   `${GUI.getFontClass('calculator')} sidebar-button sidebar-button-icon`,
                  tooltip: t('sdk.querybuilder.title'),
                  fnc:     () => {
                    GUI.closeContent();
                    GUI.closeOpenSideBarComponent();
                    const opts = { type: 'sidebar', title: t('sdk.querybuilder.title'), show: true, };
                    opts.internalPanel = new (Vue.extend(require('components/QueryBuilder.vue')))(opts);
                    const panel = new Panel(opts);
                    panel.show();
                  },
                  style: {
                    color:        '#8DC3E3',
                    padding:      '6px',
                    fontSize:     '1.2em',
                    borderRadius: '3px',
                    marginRight:  '5px'
                  }
              }],
            }),

            /**
             * ORIGINAL SOURCE: src/components/g3w-tools.js@v3.10.2 
             */
            new (function() {

              const project = ProjectsRegistry.getCurrentProject();
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
              service.updateToolsGroup = (order, config) => { Vue.set(state.toolsGroups, order, config); }
              service.setToolState     = ({ id, state: newState = { type: null, message: null } } = {}) => {
                state.toolsGroups.find(g => {
                  const tool = g.tools.find(t => t.name === id);
                  if (tool) {
                    tool.state.type    = newState.type;
                    tool.state.message = newState.message;
                    return true;
                  }
                })
              };
            
              // static class field
              service.ACTIONS = ACTIONS;
            
              const tools = project.getState().tools || {};
            
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
            
              comp._setOpen = (b=false) => {
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
            new (function() {
              const comp = new Component({
                id:          'wms',
                icon:        GUI.getFontClass('layers'),
                title: 'sidebar.wms.add_wms_layer',
                service: {},
                internalComponent: new (Vue.extend(require('components/WMS.vue')))(),
              });
            
              const service             = comp.getService();
              const internalComponent   = comp.getInternalComponent();
            
              comp._setOpen = (b = false) => {
                internalComponent.state.open = b;
                if (b) {
                  GUI.closeContent();
                }
              };
            
              // BACKCOMP v3.x
              service.state              = internalComponent.state;
              service.addNewUrl          = internalComponent.addNewUrl;
              service.deleteWmsUrl       = internalComponent.deleteWmsUrl;
              service.showWmsLayersPanel = internalComponent._showWmsLayersPanel;
              service.addWMSlayer        = internalComponent.addWMSlayer;
              service.getWMSLayers       = internalComponent.getWMSLayers;
              service.deleteWms          = internalComponent.deleteWms;
              service.clear              = internalComponent.clear;
              service.changeLayerData    = internalComponent.changeLayerData;
              service.getLocalWMSData    = internalComponent.getLocalWMSData;
              service.updateLocalWMSData = internalComponent.updateLocalWMSData;
            
              return comp;
            }),

            /**
             * ORIGINAL SOURCE: src/components/g3w-catalog.js@v3.10.2 
             */
            new (function() {

              const opts = {
                id:          'catalog',
                icon:        GUI.getFontClass('map'),
                iconColor:   '#019A4C',
                config:      { legend: { config: (ApplicationService.getConfig().layout || {}).legend } },
              };

              const state = {
                highlightlayers: false,
                external: {  // external layers
                  wms:    [],   // added by wms sidebar component
                  vector: [] // added to map controls for the moment
                },
                layerstrees:  CatalogLayersStoresRegistry.getLayersStores().map(s => ({ tree: s.getLayersTree(), storeid: s.getId() })),
                layersgroups: [],
                legend:       Object.assign(opts.config.legend || {}, { place: ApplicationService.getCurrentProject().getLegendPosition() || 'tab' }),
              };
            
              const service = opts.service || new G3WObject({
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
                  /**
                   * @param {{ layer: unknown, type: unknown, selected: unknown }}
                   *
                   * @fires CatalogService~setSelectedExternalLayer
                   *
                   * @since 3.8.0
                   */
                  setSelectedExternalLayer({ layer, type, selected }) {
                    state.external[type].forEach(l => { l.selected = (undefined === l.selected ? l.selected : (l === layer ? selected : false)); })
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
            
              // add layers stores to tree
              CatalogLayersStoresRegistry.onafter('addLayersStore',      s => { state.layerstrees.push({ tree: s.getLayersTree(), storeid: s.getId() }); });
              CatalogLayersStoresRegistry.onafter('removeLayersStore',   s => { const i = state.layerstrees.findIndex(t => t.storeid === s.getId()); if (-1 !== i) { state.layerstrees.splice(i, 1); } });
              CatalogLayersStoresRegistry.onafter('removeLayersStores', () => { state.layerstrees.forEach((_, i) => { state.layerstrees.splice(i, 1); }); });
            
              const comp = new Component({
                ...opts,
                title:              'catalog',
                resizable:          true,
                vueComponentObject: require('components/Catalog.vue'),
                service,
              });
            
              /** @TODO check if deprecated */
              _listenToMapVisibility(opts.mapcomponentid, comp);
            
              return comp;
            }),
          ],

          /**
           * ORIGINAL SOURCE: src/components/g3w-queryresults.js@v3.10.2 
           */
          queryresults: new (function() {
            const QueryResultsService = require('gui/queryresults/queryresultsservice');
            const comp = new Component({
              id:                 'queryresults',
              title:              'Query Results',
              service:            new QueryResultsService(),
              vueComponentObject: require('components/QueryResults.vue'),
            });

            comp.getElement = () => comp.internalComponent ? comp.internalComponent.$el : undefined;
            comp.unmount    = () => { comp.getService().closeComponent(); return Component.prototype.unmount.call(comp) };
            comp.layout     = noop;

            comp.getService().onafter('setLayersData', async () => {
              if (!comp.internalComponent) {
                comp.setInternalComponent();
              }
              await comp.internalComponent.$nextTick();
            });

            return comp;
          }),

          /**
           * ORIGINAL SOURCE: src/components/g3w-map.js@v3.10.2 
           */
          map: new (function() {
            const { MapService } = require('gui/map/mapservice');
            const comp = new Component({
              id:      'map',
              title:   'Map Component',
              service: new MapService({ id: 'map' }),
              vueComponentObject: require('components/Map.vue'),
            })

            comp.layout = (w, h) => { comp.getService().layout({ width: w, height: h }); };

            return comp;
          }),

          /**
           * ORIGINAL SOURCE: src/components/g3w-contentsviewer.js@v3.10.2 
           */
          content: new (function() {

            const stack = new BarStack(); // handles the logic of mounting component on DOM
            const comp  = new Component({
              id:                 'contents',
              title:              'contents',
              vueComponentObject: {
                name: 'viewport-contents-viewer',
                template: `<div id="contents" class="contents"></div>`,
                data: () => ({ state: null }),
              },
            });
          
            stack.on('clear', () => comp.contentsdata = stack.state.contentsdata);
          
            Object.assign(comp, {
          
              stack,
          
              contentsdata: stack.state.contentsdata,
          
              // `push` = whether to clean the stack every time, sure to have just one component.
              setContent(opts = {}) {
                const d = $.Deferred();
                (opts.push ? resolve() : stack.clear()).then(() => comp.addContent(opts.content, opts).then(() => d.resolve(opts)));
                comp.setOpen(true);
                return d.promise();
              },
          
              addContent(content, opts={}) {
                const d = $.Deferred();
                stack.push(content, Object.assign(opts, { parent: comp.internalComponent.$el, append: true })).then(() => {
                  comp.contentsdata = stack.state.contentsdata; // get stack content
                  Array
                    .from(comp.internalComponent.$el.children)  // hide other elements but not the last one
                    .forEach((el, i, a) => el.style.display = (i === a.length - 1) ? 'block' : 'none');
                  d.resolve();
                });
                return d.promise();
              },
          
              // remove content from stack
              removeContent() {
                comp.setOpen(false);
                return stack.clear();
              },
          
              // used by  viewport.js, update the content of contentsdata only after stack is updated
              popContent() {
                return stack.pop().then(() => {
                  comp.contentsdata = stack.state.contentsdata;
                  Array
                    .from(comp.internalComponent.$el.children)       // hide other elements but not the last one
                    .forEach((el, i, a) => el.style.display = (i === a.length - 1) ? 'block' : 'none');
                });
              },
          
              // Set layout of the content each time
              layout(parentWidth) {
                const el = comp.internalComponent.$el;
                Vue.nextTick(() => {                                                     // run only after that vue state is updated
                  const height = el.parentElement.clientHeight                           // parent element is "g3w-view-content"
                    - ((el.parentElement.querySelector('.close-panel-block') || {}).offsetHeight || 0)
                    - ((el.parentElement.querySelector('.content_breadcrumb') || {}).offsetHeight || 0)
                    - 10;                                                                // margin 10 from bottom
                  el.style.height = height + 'px';
                  if (el.firstChild) {
                    el.firstChild.style.height = height + 'px';
                  }
                  stack.state.contentsdata.forEach(d => {                                // re-layout each component stored into the stack
                    if ('function' == typeof d.content.layout) {  
                      d.content.layout(parentWidth + 0.5, height);
                    }
                  })
                })
              },
          
              getComponentById:       stack.getComponentById.bind(stack),
              getContentData:         stack.getContentData.bind(stack),
              getCurrentContentData:  stack.getCurrentContentData.bind(stack),
              getPreviousContentData: stack.getPreviousContentData.bind(stack),
              clearContents:          stack.clear.bind(stack),
          
            }); 
          
            return comp;
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

        CONFIG.sidebar.forEach(comp => {
          ComponentsRegistry.registerComponent(comp);
          ApplicationService.registerService(comp.id, comp.getService())
        });

        // register other components
        ComponentsRegistry.registerComponent(CONFIG.queryresults);
        ApplicationService.registerService(CONFIG.queryresults.id, CONFIG.queryresults.getService())

        // setup Font, Css class methods
        $(document).localize();

        // set viewport
        CONFIG.map.mount('#g3w-view-map', true).then(() => {
          ApplicationState.viewport.components.map = CONFIG.map;
          ApplicationState.viewport.map_component  = CONFIG.map;
        }).fail(e => console.warn(e));

        CONFIG.content.mount('#g3w-view-content', true).then(() => {
          ApplicationState.viewport.components.content = CONFIG.content
        }).fail(e => console.warn(e));

        ComponentsRegistry.registerComponent(CONFIG.map);
        ApplicationService.registerService(CONFIG.map.id, CONFIG.map.getService())

        ComponentsRegistry.registerComponent(CONFIG.content);
        ApplicationService.registerService(CONFIG.content.id, CONFIG.content.getService())

        const skinColor = $('.navbar').css('background-color');
        GUI.skinColor = skinColor && `#${skinColor.substr(4, skinColor.indexOf(')') - 4).split(',').map((color) => parseInt(color).toString(16)).join('')}`;

        await this.$nextTick();

        ApplicationService.postBootstrap()
        ApplicationState.sizes.sidebar.width = $('.main-sidebar').width();

        //getSkinColor
        GUI.ready();
      }
    });
  })
  .catch(({ error = null, language }) => {
    if (error) {
      if (error.responseJSON && error.responseJSON.error.data) { error = error.responseJSON.error.data }
      else if (error.statusText) { error = error.statusText }
    }
    console.error(error);
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
