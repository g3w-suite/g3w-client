/**
 * @file
 * 
 * ORIGINAL SOURCE: src/services/gui.js@v4.0.0
 * ORIGINAL SOURCE: src/services/map.js@v4.0.0
 * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
 * ORIGINAL SOURCE: src/services/data.js@v4.0.0
 * 
 * @since 4.1.0
 */

import { G3W_FID, QUERY_POINT_TOLERANCE }       from 'g3w-constants';
import Emitter                                  from 'g3w-emitter';
import Component                                from 'g3w-component';
import Panel                                    from 'g3w-panel';
import { gettext as _ }                         from 'g3w-i18n';
import ApplicationState                         from 'g3w-state';
import { IframeApp }                            from 'g3w-iframe';
import MapControl                               from 'g3w-control';

import { getUniqueDomId }                       from 'utils/getUniqueDomId';
import { toRawType }                            from 'utils/toRawType';
import { getCatalogLayerById }                  from 'utils/getCatalogLayerById';
import { getAlphanumericProps }                 from 'utils/getAlphanumericProps';
import { intersects }                           from 'utils/intersects';
import { within }                               from 'utils/within';
import { saveBlob }                             from 'utils/saveBlob';
import { throttle }                             from 'utils/throttle';
import { isPointGeometryType }                  from 'utils/isPointGeometryType';
import { isLineGeometryType }                   from 'utils/isLineGeometryType';
import { isPolygonGeometryType }                from 'utils/isPolygonGeometryType';
import { getScaleFromResolution }               from 'utils/getScaleFromResolution';
import { getResolutionFromScale }               from 'utils/getResolutionFromScale';
import { createFilterFromString }               from 'utils/createFilterFromString';
import { getCatalogLayers }                     from 'utils/getCatalogLayers';
import { idb }                                  from 'utils/idb';
import { waitFor }                              from 'utils/waitFor';
import { debounce }                             from 'utils/debounce';
import { noop }                                 from 'utils/noop';
import { groupBy }                              from 'utils/groupBy';

import PickCoordinatesInteraction               from 'interactions/pick-coordinates';

Object
  .entries({
    Emitter,
    Component,
    Panel,
    _,
    ApplicationState,
    IframeApp,
    PickCoordinatesInteraction,
    MapControl,
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

/** @TODO check if deprecated */
const ACTIONS = {};

export default new (class GUI extends Emitter {

  #CONTENTS;

  setupControl = {};

  #offlineids = [];

  isready = false;

  #map_ready = false;

  /** whether to push new data content to result */
  push_content = false;

  #closeUserMessage = true;

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   *
   * @since 4.1.0
   */
  #events = {
    ol:           [],
    stores:       [], // layers stores
    unwatches:    [],
    query:        [],
  };


  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   */
  #atlas = [];

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * <Object> to store relations (key is referenceLayer of relation)
   */
  #relations = {};

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   */
  plotLayerIds = [];

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * <Array> where are store vector layer add on runtime
   */
  #vectorLayers = [];

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  #maxZoom = 1000;

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  #selectedLayer = null;

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  #highlighting = false;

  /** @since 4.1.0 */
  get config() {
    return window.initConfig;
  }

  /** @since 4.1.0 */
  get project() {
    return ApplicationState.project;
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  target = 'map';

  /** @type { null | ol.Map } */
  #map = null;

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * Zindex to layer order on map
   * 
   * @since 4.1.0
   */
  layersCount = 0;

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  #controls = [];

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * Default layers added to map
   * 
   * @since 4.1.0
   */
  defaultsLayers = {
    mapcenter:      new ol.layer.Vector({ source: new ol.source.Vector(), style: new ol.style.Style({ image: new ol.style.Icon({ opacity: 1, src: '/static/client/images/mapcentermarker.svg', scale: 0.8 }) }) }),
    highlightLayer: new ol.layer.Vector({ source: new ol.source.Vector(), style: feat => {
      const type  = feat.getGeometry().getType();
      if (['Point', 'MultiPoint'].includes(type)) {
        return new ol.style.Style({ image: new ol.style.Circle({ radius: 6, fill: new ol.style.Fill({ color:'rgb(255,255,0)' }) }), zIndex: Infinity });
      }
      if (['LineString', 'MultiLineString'].includes(type)) {
        return new ol.style.Style({ stroke: new ol.style.Stroke({ color: 'rgb(255,255,0)', width: 4 }) });
      }
      if (['Polygon', 'MultiPolygon'].includes(type)) {
        return new ol.style.Style({ stroke: new ol.style.Stroke({ color: 'rgb(255,255,0)', width: 4 }), fill: new ol.style.Fill({ color: 'rgba(255,255,0,0.25)' }) });
      }
    }}),
    selectionLayer: new ol.layer.Vector({ source: new ol.source.Vector(), style: feat => {
      const type  = feat.getGeometry().getType();
      if (['Point', 'MultiPoint'].includes(type)) {
        return new ol.style.Style({ image: new ol.style.Circle({ radius: 6, fill: new ol.style.Fill({ color: 'rgb(255,0,0)' }) }), zIndex: Infinity });
      }
      if (['LineString', 'MultiLineString'].includes(type)) {
        return new ol.style.Style({ stroke: new ol.style.Stroke({ color: 'rgb(255,0,0)', width: 4 }) });
      }
      if (['Polygon', 'MultiPolygon'].includes(type)) {
        return new ol.style.Style({ stroke: new ol.style.Stroke({ color: 'rgb(255,0,0)', width: 4 }), fill: new ol.style.Fill({ color: 'rgba(255,0,0,0.25)' }) });
      }
    }}),
  };

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  #layers = {
    base:     [], // base layers
    g3w:      [], // project layers
    external: [], // external layers
    index:    {}, // store layers by multilayer id (performance)
  };

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * Store interactions added by plugin or external application
   * 
   * @since 4.1.0
   */
  #interactions = [];

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   *
   * draw shadow - Reactangle used on print
   * 
   * @since 4.1.0
   */
  #shadow = {
    type:     'coordinate',
    outer:    [],
    inner:    [],
    scale:    null,
    rotation: null,
    listener: null,
  };

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   *
   * how many are loading
   * 
   * @since 4.1.0
   */
  #loading = 0;

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   *
   * @since 4.1.0
   */
  #marker = null;

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * Reactive state
   */
  state = ApplicationState;

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   */
  #interaction = {

    /**
     * Reference to current layer
     */
    id: null,

    /**
     * Interaction bind to layer,
     */
    interaction: null,

    /**
     * Add current toggled map control if toggled
     */
    mapcontrol: null,

    /**
     * Method that handles interaction when a mapcontrol is toggled
     */
    toggleeventhandler: null

  };

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Vector layer used by query result to show query
   * request as coordinates, bbox, polygon, etc ..
   *
   * @type {ol.layer.Vector}
   */
  #layer = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: feat => new ol.style.Style('Point' === feat.getGeometry().getType()
      ? { text:   new ol.style.Text({ fill: new ol.style.Stroke({ color: 'black' }), text: '\uf3c5', font: '900 3em "Font Awesome 5 Free"', offsetY : -15 }) }
      : { stroke: new ol.style.Stroke({ color: 'black' }) }
    )
  });

  /**
   * @TODO find out how to get rid of `GUI.getService('catalog')`
   * BACKOMP
   */
  #CATALOG = new Emitter({
    setters: {
      addExternalLayer({ layer, type = 'vector' } = {}) {
        layer.removable = true;
        ApplicationState.catalog.external[type].push(layer);
      },
      removeExternalLayer({ name, type='vector' } = {}) {
        ApplicationState.catalog.external[type].filter((l, i) => {
          if (name === l.name) {
            ApplicationState.catalog.external[type].splice(i, 1);
            return true;
          }
        });
      },
      /** used by the following plugins: "processing" */
      getExternalLayers({ type = 'vector' }) {
        return ApplicationState.catalog.external[type];
      },
    }
  });

  constructor(opts) {
    super(opts);

    this.setters = [
      'setContent',
      'getPermalink',
      'getPrintParams',
      'registerPlugin',
      'online',
      'offline',
      /** @since 4.1.0 */
      'showPanel',
      /** @since 4.1.0 */
      'setQueryResponse',
      /** @since 4.1.0 */
      'addActionsForLayers',
      /** @since 4.1.0 */
      'postRender',
      /** @since 4.1.0 */
      'editFeature',
      /** @since 4.1.0 */
      'removeFeatureFromResult',
      /** @since 4.1.0 */
      'addHideMap',
      /** @since 4.1.0 */
      'setHidden',
      /** @since 4.1.0 */
      'controlClick',
      /** @since 4.1.0 */
      'loadExternalLayer',
      /** @since 4.1.0 */
      'unloadExternalLayer',
    ];

    // BACKOMP v3.x
    this.outputDataPlace           = this.showData.bind(this);
    this.zoomToLayerFeaturesExtent = this.zoomToLayer.bind(this);
    this.highlightGeometry         = this.highlight.bind(this);
    this.showRelation              = this.showRelations.bind(this);
    this.getMapControlByType       = this.getMapControl.bind(this);
    this.clearHighlightGeometry    = () => this.highlight(false);

    this.notify = {
      warning:(message, autoclose = false) => { this.showUserMessage({ type: 'warning', message, autoclose }) },
      error:  (message, autoclose = false) => { this.showUserMessage({ type: 'alert',   message, autoclose }) },
      info:   (message, autoclose = false) => { this.showUserMessage({ type: 'info',    message, autoclose }) },
      success:(message)                    => { this.showUserMessage({ type: 'success', message, autoclose: true }) }
    };

    this.onLayerLoadStart    = this.onLayerLoadStart.bind(this);
    this.onLayerLoadEnd      = this.onLayerLoadEnd.bind(this);
    this.onLayerLoadError    = this.onLayerLoadError.bind(this);

    this._setLegendParams = debounce(this._setLegendParams.bind(this), 1000);

    // BACKOMP for v4.1.x
    this.hideContent = bool => {
      console.warn('GUI.hideContent is deprecated. Use GUI.toggleContent instead');
      const perc = ApplicationState.layout[ApplicationState.layout.__current].rightpanel['h' === ApplicationState.split ? 'width': 'height'];
      this.toggleContent(!bool);
      // return previous percentage
      return perc;
    };
  }

  /**
   * ORIGINAL SOURCE: src/components/SidebarItem.vue@v4.0.0
   * 
   * Add component to the sidebar
   * 
   * @param { Component } component sidebar item
   * @param { Object } options
   * @param { number } options.position index where to add (inside sidebar)
   */
  addComponent(component, options = {}) {
    if (!isMobile.any || false !== component.mobile) {

      const sidebarItem = new (Vue.extend({
        template: /* html */`
          <li
            :id        = "component.id"
            v-show     = "component.state.visible"
            class      = "sidebar-item"
            :class     = "{'active': !!component.state.open }"
            v-disabled = "component.state.disabled"
          >
            <div v-show = "component.state.loading" class = "bar-loader"></div>
            <a
              href             = "#"
              style            = "display: flex; justify-content: space-between; align-items: center"
              :data-i18n-title = "sidebar.open ? '' : (component.title || '')"
              data-placement   = "right"
              @click.prevent   
            >
              <div>
                <span v-if = "!sidebar.open"><i :class = "component.icon" :style = "{ color: component.iconColor }"></i></span>
                <i v-else :class = "component.icon" :style = "{ color: component.iconColor }" aria-hidden="true"></i>
                <span class = "treeview-label" v-t = "(component.title || '')"></span>
              </div>
              <div>
                <span
                  v-if   = "info.state"
                  style  = "position: absolute; right: 5px; font-weight: bold"
                  :class = "info.class"
                  :style = "info.style"
                  :title = "info.tooltip"
                >{{ info.state }}</span>
                <span
                  v-for               = "action in actions"
                  :key                = "action.id"
                  @click.stop         = "action.fnc(component.internalComponent)"
                  @keydown.enter.stop = "action.fnc(component.internalComponent)"
                  :title              = "action.tooltip"
                  data-placement      = "left"
                  style               = "font-weight: bold; padding:3px;"
                  :class              = "action.class"
                  class               = "action"
                  :style              = "action.style"
                  tabindex            = "0"
                  role                = "button"
                ></span>
                <i v-if = "false !== component.collapsible" :class = "(!!component.state.open ? 'fas fa-angle-down' : 'fas fa-angle-left')" style="margin-right: 10px;" aria-hidden="true"></i>
              </div>
            </a>
            <div ref="component-placeholder" ></div>
          </li>`,
        data: () => ({
          component,
          info:    component.info || { state: null, style: null, class: null },
          actions: component.actions,
          sidebar: ApplicationState.sidebar
        }),
      }))();

      // handle click on sidebar item (<li> element)
      component.click = ({ open = false } = {}) => {
        if (open) {
          ApplicationState.sidebar.components.forEach(comp => {
            if (comp !== component && comp.getOpen()) {
              comp.click({ open: false });                 // close other sidebar items
            }
          });
        }
        const node = component.getInternalComponent().$el; // <ul> elements
        node?.classList?.toggle?.('menu-open', open);      // toggle "menu-open" class
        node.parentNode.classList.toggle('active', open);  // parent node is a <li> that contain <ul> node (eg. <li id="metadata" class="sidebar-item">)
        component.setOpen(open);                           // set open (attribute)
      };

      // append to `g3w-menu`
      sidebarItem.$on('hook:mounted', () => {
        const sidebar = document.getElementById('g3w-menu');
        if ([null, undefined].includes(options?.position) || options?.position < 0 || options?.position >= sidebar.children.length) {
          sidebar.querySelector('#themes').insertAdjacentElement('beforebegin', sidebarItem.$el);
        } else {
          Array.from(sidebar.children).forEach((child, i) => {
            if (i === options?.position || child.id === options?.position) {
              child.insertAdjacentElement((!!options?.before || undefined === options?.before) ? 'beforebegin' : 'afterend', sidebarItem.$el);
            }
          });
        }
        component.mount(sidebarItem.$refs['component-placeholder']);
      }).$mount();

      ApplicationState.sidebar.components.push(component);
    }
  }

  /**
   * used by the following plugins: "billboards"
   */
  setPushContent(bool = false) {
    this.push_content = bool;
  }

  getComponent(id) {
    if ('contents' === id) {
      return this.#CONTENTS;
    }
    return ApplicationState.sidebar.components.find(c => id === c.getId());
  }

  /**
   * ORIGINAL SOURCE: src/index.prod.js@v4.0.0
   * ORIGINAL SOURCE: src/services/gui.js@v4.0.0
   */
  ready() {

    // G3W-SPATIALBOOKMARKS
    this.addComponent(new Component({
      id:                 'spatialbookmarks',
      icon:               'far fa-bookmark',
      iconColor:          '#00bcd4',
      title:              'Bookmarks',
      vueComponentObject: require('components/SpatialBookMarks.vue').default,
    }));

    // G3W-SEARCH
    this.addComponent(Object.assign(new Component({
      id:         'search',
      visible:     true,
      icon:        "fas fa-search",
      iconColor:   '#8dc3e3',
      title:       ApplicationState.project.state.search_title || 'search',
      actions:     [],
      service: Object.assign(new Emitter, {
        state: {
          searches: (ApplicationState.project.state.search || []).sort((a, b) => `${a.name}`.localeCompare(b.name)),
          tools: [],
          /** Retrieve saved searches from local storage */
          querybuildersearches:  ApplicationState.querybuilder?.searches?.[ApplicationState.project.getId()] ?? []
        },
        title:                    ApplicationState.project.state.search_title || "search",
        addTool(t)                { this.state.tools.push(t); },
        addTools(tt)              { for (const t of tt) this.addTool(t); },
        showPanel(o)              { return new (require('components/g3w-search')).SearchPanel(o, true) },
        getTitle()                { return this.title },
        removeTools()             { this.state.tools.splice(0) },
        async stop(d)             { return d },
        removeTool()              {},
      }),
      vueComponentObject: require('components/Search.vue').default,
    }), {
      _setOpen: bool => {
        const search = g3w.app.getComponent('search').getInternalComponent();
        // autotogle query builder panel when there is no other saved search
        if (bool && !search.state.searches.length && !search.state.tools.length && !search.state.querybuildersearches.length) {
          search.showQueyBuilderPanel();
        }
      },
    }));

    // G3W-TOOLS
    this.addComponent(new (function() {
      const state   = {
        id:          'tools',
        icon:        "fas fa-cogs",
        iconColor:   '#FFE721',
        toolsGroups: [],
        visible: false,
        loading: false
      };
    
      const service = new Emitter({ setters: {
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
        icon:        "fas fa-cogs",
        iconColor:   '#FFE721',
        title: "tools",
        service,
        internalComponent: new (Vue.extend({
          template: /* html */ `
            <ul class="g3w-tools treeview-menu">
              <div v-show = "state.loading" class = "bar-loader"></div>
              <li v-for="g in state.toolsGroups" :key="g.name">
                <div class="tool-header"><i class="fas fa-cog"></i><span>{{ g.name }}</span></div>
                <div :id="g.name + '-tools'" class="tool-box"><g3w-tool v-for="t in g.tools" :key="t.name" :tool="t" /></div>
              </li>
            </ul>`,
          components: { G3wTool: require('components/Tool.vue').default },
          data: () => ({ state: null }),
          watch: {
            async 'state.toolsGroups'(g) {
              comp.setVisible(g.length > 0);
              this.$emit('visible', g.length > 0);
              await g3w.app.isReady();
              document.querySelector('#g3w-menu #tools').classList.toggle('single', 1 === g.length && 'EDITING' === g[0].name);
            }
          },
        }))(),
      });
    
      comp._setOpen = (b = false) => {
        comp.internalComponent.state.open = b;
        if (b) {
          g3w.app.closeContent();
        }
      };
    
      return comp;
    }));

    ApplicationState.catalog.layerstrees.push(
      ...Object.values(ApplicationState.layers).flatMap(s => s.showOnCatalog() ? ({ tree: s.getLayersTree(), storeid: s.getId() }) : [])
    );

    this.#CONTENTS = Object.assign(new Component({
      id:                 'contents',
      vueComponentObject: { template: `<div id="contents" class="contents"></div>` },
    }), {
      /** DOM element where insert the component/panel  */
      parent:                 null,
      contentsdata:           ApplicationState.contentsdata,
      getComponentById: id => (ApplicationState.contentsdata.find(d => id == d.content.id) || {}).content,
    });

    /** @since 3.8.0 */
    this.onbefore('offline', () => this.#offlineids.forEach(c => { c.enable = this.#controls.find(control => c.id === control.type)?.control?.getEnable(); this.#controls.find(control => c.id === control.type)?.control?.setEnable(false); }));

    /** @since 3.8.0 */
    this.onbefore('online', () => this.#offlineids.forEach(({ id, enable }) => this.#controls.find(control => id === control.type)?.control?.setEnable(enable)));

    this.getComponent('contents').mount('#g3w-content', true);

    ApplicationState.sidebar.width = document.querySelector('.main-sidebar').offsetWidth;;

    // handle window resize
    const resize_observer1 = (() => {
      let frame;
      return new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => { this.resize(); });
      });
    })();
    resize_observer1.observe(document.querySelector('#app'));

    const resize_observer2 = (() => {
      let frame;
      return new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => { this.resize(); });
      });
    })();
    resize_observer2.observe(document.querySelector('.main-sidebar'));

    // update map state on sidebar toggle 
    (new MutationObserver(() => {
      if (ApplicationState.sidebar.open !== !document.body.classList.contains('sidebar-collapse')) {
        this.resize();
      }
    })).observe(document.body, { attributes: true, attributeFilter: ['class'] });

    this.resize();

    // remove "permalink_code" from URL
    const url = new URL(window.location);
    url.searchParams.delete('permalink_code');
    window.history.replaceState(null, null, url);

    // initialize iframe services
    if (ApplicationState.iframe) {
      new IframeApp();
    }

    this.emit('ready');
    this.isready = true;
  }

  isReady() {
    return new Promise(resolve => this.isready ? resolve() : this.once('ready', resolve));
  };

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @returns promise ready
   * 
   * @since 4.1.0
   */
  isMapReady() {
    return new Promise(resolve => this.#map_ready ? resolve() : this.once('after:setupControls', resolve));
  }

  /**
   * Passing a component application ui id return service that belongs to component
   * @param componentId
   * @returns {*}
   */
  getService(componentId) {
    if ('queryresults' === componentId || 'map' === componentId) {
      return this;
    }
    if ('catalog' === componentId) {
      return this.#CATALOG;
    }
    const component = this.getComponent(componentId);
    return component && component.getService();
  }

  /**
   * @returns plugin instance
   * 
   * @since 4.1.0
   */
  getPlugin(name) {
    return ApplicationState.plugins_registry[name];
  }

  /**
   * Store plugin instance into registry
   * 
   * @since 4.1.0
   */
  registerPlugin(plugin) {
    ApplicationState.plugins_registry[plugin.name] = ApplicationState.plugins_registry[plugin.name] || plugin;
  }

  /** @since 3.10.0 remove _setUpTemplateDependencies method**/
  isMobile() {
    return isMobile.any;
  };
  
  getFontClass(type) {
    return Vue.prototype.g3wtemplate.getFontClass(type);
  }

  /* Metodos to define */
  getResourcesUrl() {
    return window.initConfig.staticurl + window.initConfig.client;
  }

  /**
   * Called by `getData` (output)
   * 
   * @param { Promise | Object } promise request data or promise
   * @param { Object } output
   * @param { boolean | Function | Object } output.show set output condition (whether to show result or not)
   * @param { boolean } output.add
   * @param { String } output.title
   * 
   * @since 4.1.0
   */
  async showData(promise, output = {}) {

    // convert to promise
    if (!(promise instanceof Promise)) {
      promise = Promise.resolve(promise);
    }

    // unique id for request
    const rid = getUniqueDomId();

    /** @type { String[] } cached requests (by id) */
    this.showData.reqs = (this.showData.reqs || []).concat(rid);

    // in case of iframe
    if (this.showData.iframe) {
      try {
        let response = await promise;
        const json   = new ol.format.GeoJSON();
        window.parent?.postMessage?.({
          id: null,
          action: output.action ?? 'app:results',
          response: {
            data: (response.data || []).map(({ layer, features }) => ({ [layer.getId()]: { features: json.writeFeatures(features) } })),
            result: response.result
          }
        }, '*');
      } catch(e) {
        console.warn(e);
        window.parent?.postMessage?.({ id: null, action: output.action ?? 'app:results', response: { data: e, result: false } }, '*');
      }
      return;
    }

    //set loading state
    this.setLoadingContent(true);

    //check show attribute if is a valid type
    const condition = ['function', 'boolean'].includes(typeof output.show);

    Object.assign(output, {
      condition: condition ? output.show : true,
      add:       false,
      ...(condition ? {} : output.show)
    });

    // if request doesn't need to add to a current query result
    if (!output.add && ApplicationState.contentsdata.length > 0) {
      this.#clearState();
      this.setContent({
        content:    new Component({
          id:                 'queryresults',
          service:            this,
          vueComponentObject: require('components/QueryResults.vue').default,
        }),
        title:      "Results",
        push:       this.push_content,
        post_title: output.title || '',
        perc:       isMobile.any ? 100 : undefined,
      });
    }

    try {
      // Store data promise
      const data = (await promise) || {};

      //Check id we can show data
      const show = 'function' === typeof output.condition ? await output.condition(data) : false !== output.condition;
      const last = rid === this.showData.reqs.at(-1);

      // set request output ids empty
      if (last) {
        this.showData.reqs.splice(0);
      }

      //if set before call method and wait
      if (last && output.before) {
        await output.before(data);
      }

      // in case of usermessage show user message
      if (last && data.usermessage) {
        await this.showUserMessage({
          type:      data.usermessage.type,
          message:   data.usermessage.message,
          autoclose: data.usermessage.autoclose
        });
      }

      // check if data can be shown on query result content
      if (last && show && !output.add) {
        this.setContent({
          content:    new Component({
            id:                 'queryresults',
            service:            this,
            vueComponentObject: require('components/QueryResults.vue').default,
          }),
          title:      "Results",
          push:       this.push_content,
          post_title: output.title || '',
          perc:       isMobile.any ? 100 : undefined,
        });
      }

      if (last && show) {
        this.setQueryResponse(data, { add: !!output.add });
      }

      // call after is set with data
      if (last && output.after) {
        output.after(data);
      }
    } catch(e) {
      console.warn(e);
      this.showUserMessage({
        type:        'alert',
        message:     this.#errorToMessage(e),
        textMessage: true
      });
      //@scince 3.11.0 emit error-output-data
      this.emit('error-output-data', e);
      await this.closeContent();
    }

    //set loading to false when no pending request
    this.setLoadingContent(this.showData.reqs.length > 0);
  }

  showForm(opts = {}) {
    const { FormComponent } = require('components/g3w-form');
    // new instance every time
    const formComponent = opts.formComponent ? new opts.formComponent(opts) : new FormComponent(opts);
    this.setContent({
      perc:       opts.perc,
      //@since 4.1.0 used instead crumb
      title:      formComponent?.layer?.getName?.(),
      content:    formComponent,
      split:      undefined !== opts.split ? opts.split : 'h',
      push:       !!opts.push, //only one (if other deletes previous component)
      showgoback: !!opts.showgoback,
      closable:   false
    });
    // return service
    return formComponent.getService();
  }

  /**
   *
   * @param pop remove or not content or pop
   */
  closeForm({ pop = false } = {}) {
    this.emit('closeform', false);

    const backonclose = !pop && ApplicationState.content.backonclose && ApplicationState.content.contentsdata.length > 1;

    // remove just last component
    if (pop || backonclose) {
      this.popContent();
    }

    // remove all content stacks
    if (!pop && !backonclose){
      this.closeContent();
      this.setModal(false);
    }
  }

  disableElement({element, disable}) {
    document.querySelectorAll(element).forEach(el => el.classList.toggle('g3w-disabled', disable));
  }

  disableContent(disable) {
    ApplicationState.content.disabled = disable;
  }

  disablePanel(disable=false) {
    this.disableElement({ disable, element: "#sidebar-panel-placeholder" });
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Collapse any expanded sidebar component 
   */
  closeSideBar() {
    ApplicationState.sidebar.components.forEach(c => c.getOpen() && c.state.closewhenshowviewportcontent && c.collapsible && c.click({ open: false }));
  };

  get _projectLayerIds() {
    const layersId = [];
    const traverse = tree => {
      (tree.nodes || [tree]).forEach(n => {
        if (n.id) { layersId.push(n.id) }
        else { traverse(n) }
      });
    };
    ApplicationState.project.state.layerstree.forEach(traverse);
    return layersId;
  }

  async showPanel(content) {
    //set null to reactivity
    ApplicationState.sidebar.title  = null;
    ApplicationState.sidebar.parent = '#sidebar-panel-placeholder'

    const current = ApplicationState.sidebar.contentsdata.at(-1);

    if (current) {
      current.content.internalPanel.$el.style.display = 'none';
    } 

    const parent = ApplicationState.sidebar.parent;
    const data   = ApplicationState.sidebar.contentsdata;

    // Check a duplicate element by component id (if already exist)
    let id = data.findIndex(d => content.getId() === d.content.getId());

    if (-1 !== id) {
      await data[id].content.unmount();
      data.splice(id, 1);
    }

    // Mount vue component
    await content.mount(parent);
    //set content title
    ApplicationState.sidebar.title = content.title;

    data.push({ content, options: { parent: '#sidebar-panel-placeholder' } });
  }

  async closePanel() {
    const data = ApplicationState.sidebar.contentsdata;
    if (data.length <= 0) {
      return;
    }
    
    //set null for reactivity
    ApplicationState.sidebar.title = null;
    const panel = data.slice(-1)[0].content;
    await panel.unmount();
    let content = data.pop();
    content     = null;
    const current = ApplicationState.sidebar.contentsdata.at(-1);
    if (current) {
      current.content.internalPanel.$el.style.display = 'block';
      ApplicationState.sidebar.title                  = current.content.title;
    }
  }

  /**
   * @see https://www.w3schools.com/howto/howto_js_draggable.asp 
   */
  #makeDraggable(el) {
    let x2 = 0, y2 = 0, x1 = 0, y1 = 0;

    el.addEventListener('mousedown', e => {
      // skip dragging on form elements
      if (['.select2-container', 'button', 'select', 'input', 'textarea', 'x-select'].some(i => e.target.closest(i))) {
        return;
      }
      e.preventDefault();

      const rect = el.getBoundingClientRect();
      if (!el.style.top)  el.style.top  = rect.top + "px";
      if (!el.style.left) el.style.left = rect.left + "px";

      x1 = e.clientX;
      y1 = e.clientY;

      document.addEventListener('mouseup', mouseUp);
      document.addEventListener('mousemove', mouseMove);
    });

    function mouseUp() {
      document.removeEventListener('mouseup', mouseUp);
      document.removeEventListener('mousemove', mouseMove);
    }
    
    function mouseMove(e) {
      e.preventDefault();
      x2 = x1 - e.clientX;
      y2 = y1 - e.clientY;
      x1 = e.clientX;
      y1 = e.clientY;

      el.style.top  = (parseFloat(el.style.top)  - y2) + "px";
      el.style.left = (parseFloat(el.style.left) - x2) + "px";
    }
  }

  async showUserMessage({
    title,
    subtitle,
    message = '',
    type = 'tool',
    duration = 3000,
    textMessage = false,
    closable = true,
    draggable = false,
    autoclose,
    hooks = {},
    iconClass = null, //@since 3.11.0
  } = {}) {

    const dialog = Object.assign(document.createElement('template'), {
        innerHTML: /* html */ `
          <dialog class="usermessage-${type}" popover="manual">
            <form tabindex="0">
              <header>
                <i class = "${g3w.app.getFontClass(iconClass || type)}"></i>
                <div>
                  <h4 style="font-weight: bold;">${title ? _(title): type.toUpperCase()}</h4>
                  ${ subtitle ? `<h5>${_(subtitle)}</h5>` : '' }
                </div>
                <button type="button" value="cancel" style="align-self: flex-start;border: none;line-height: 1;font-weight: 700;font-size: 25px;background: none;width: 40px;height: 40px;${ closable ? '' : 'visibility:hidden;' }">&times;</button>
              </header>
              <div>${ textMessage ? message : _(message) }</div>
            </form>
          </dialog>
      `.trim()
      }).content.firstChild;

     // inject custom header component
    if (hooks['header']) {
      dialog.querySelector('header').replaceWith((new (Vue.extend(hooks['header']))().$mount()).$el);
    }

    // inject custom body, footer components
    [hooks['body'], hooks['footer']]
      .filter(h => h)
      .forEach(h => dialog.appendChild((new (Vue.extend(h))().$mount()).$el));  

    dialog.addEventListener('beforetoggle', e => {
      if (e.newState === 'closed') {
        // clean up childs (vue)
        Array.from(dialog.children).forEach(el => {
          el.__vue__?.$destroy();
          el.remove();
        });
        dialog.remove();
      }
    });

    document.body.append(dialog);

    dialog.showPopover();

    if (draggable || 'tool' === type) {
      this.#makeDraggable(dialog);
    }

    // close dialog on x icon
    dialog.querySelector('button[value="cancel"]').addEventListener('click', () => {
      dialog.hidePopover();
    });

    if (autoclose) {
      const timer = setTimeout(() => {
        dialog.hidePopover();
        clearTimeout(timer)
      }, duration);
    }

    if ((autoclose || closable) && 'tool' !== type) {
      dialog.style.cursor = 'pointer';
      dialog.addEventListener('click', () => {
        dialog.hidePopover();
      });
    }

  }

  closeUserMessage() {
    document.querySelector('.usermessage-tool')?.hidePopover();
  }

  /**
   * used by the following plugins: "qps_timeseries"
   * 
   * @deprecated since 4.1.0, use `GUI.dialog(options)` instead
   */
  showModalDialog(options = {}) {
    const dialog  = this.dialog(options);
    const $dialog = $(dialog);
    setTimeout(() => { $dialog.trigger('shown.bs.modal'); }, 500);
    dialog.addEventListener('close', () => { $dialog.trigger('hidden.bs.modal'); });
    return $dialog;
  }

  /**
   * Initally based on bootbox.js v4.4.0
   * 
   * @since 4.1.0
   */
  dialog(options = {}) {

    const dialog = Object.assign(document.createElement('template'), {
      innerHTML: /* html */ `
        <dialog class="${options.className || ''}">
          <form method="dialog">
            <button value="cancel" ${(options.closeButton ?? true) ? '' : 'hidden'} style="border: none;line-height: 1;font-weight: 700;font-size: 25px;background: none;position: absolute;inset: 0 0 auto auto;width: 40px;height: 40px;">&times;</button>
            <h4 style="color: var(--skin-color); font-weight: 700;" ${options.title ? '' : 'hidden'}>${ options.title || '' }</h4>
            <menu style="display: flex;justify-content: end;gap: 5px;">
              ${
                Object
                  .keys(options.buttons || {})
                  .map(key => /* html */`<button value="${key}" class="btn ${options.buttons[key].className}" ${options.buttons[key].disabled ? 'disabled' : ''}>${options.buttons[key].label}</button>`)
                  .join('')
              }
            </menu>
          </form>
        </dialog>
      `.trim()
    }).content.firstChild;

    if ('string' !== typeof options.message) {
      dialog.querySelector('h4').insertAdjacentElement('afterend', options.message)
    } else {
      dialog.querySelector('h4').insertAdjacentHTML('afterend', options.message)
    }

    const cb = (e, bbx) => {
      if (false === options?.buttons?.[bbx]?.callback?.call(dialog, e)) {
        e.stopPropagation();
        e.preventDefault();
      } else {
        dialog.close();
        dialog.remove();
      }
    };

    document.body.appendChild(dialog);
    dialog.showModal();

    dialog.addEventListener('cancel', e => { cb(e, 'cancel'); });
    dialog.addEventListener('close', e => { cb(e, dialog.returnValue); });
  
    return dialog;
  }

  /**
   * Similar to `window.confirm`
   * 
   * @since 4.1.0
   */
  async confirm(message) {
    return new Promise((resolve, reject) => {
      const dialog = Object.assign(document.createElement('template'), {
        innerHTML: /* html */`
          <dialog>
            <form method="dialog">
              ${message}
              <menu style="display: flex;justify-content: end; gap:5px;border-top: 1px solid #f4f4f4;margin-top: 15px;">
                <button value="no" class="btn btn-secondary">${ _('Cancel') }</button>
                <button value="yes" class="btn btn-success">${ _('OK') }</button>
              </menu>
            </form>
          </dialog>
        `.trim()
      }).content.firstChild;

      document.body.appendChild(dialog);
      dialog.showModal();

      dialog.addEventListener('close', () => {
        if ('yes' === dialog.returnValue) {
          resolve(true);
        } else {
          resolve(false);
        }
        dialog.remove();
      });
    });
  }

  /**
   * ORIGINAL SOURCE: src/utils/prompt.js@v4.0.0
   * 
   * Similar to `window.prompt`
   * 
   * @since 4.1.0
   */
  async prompt(message, value) {
    // auto-select first value
    if (Array.isArray(value) && 1 === value.length) {
      return '0';
    }
    return new Promise((resolve, reject) => {
      const uid    = getUniqueDomId();
      const dialog = Object.assign(document.createElement('template'), {
        innerHTML: /* html */`
          <dialog>
            <form method="dialog">
              <h4 style="color: var(--skin-color); font-weight: 700;" ${Array.isArray(value) ? '' : 'hidden'}>${ message }</h4>
              ${
                Array.isArray(value)
                ? value
                    .map(item => ({ value: item.value, label: item.label, id: getUniqueDomId() }))
                    .map(item => /* html */`<label for="${item.id}"><input id="${item.id}" type="radio" name="template" value="${item.value}" autocomplete="off" /> ${item.label || item.value}</label><br>`)
                    .join('')
                : /* html */`
                  <label for="${uid}">${message}</label>
                  <input id="${uid}" class="form-control" autocomplete="off" type="text" value="${value}">
                `
              }
              <menu style="display: flex;justify-content: end; gap:5px;border-top: 1px solid #f4f4f4;margin-top: 15px;">
                <button value="no" class="btn btn-secondary">${ _('Cancel') }</button>
                <button value="yes" class="btn btn-success">${ _('OK') }</button>
              </menu>
            </form>
          </dialog>
        `.trim()
      }).content.firstChild;

      const input = dialog.querySelector('input');
      const yes   = dialog.querySelector('button[value="yes"]');
      let _value;

      const canSubmit = () => {
        _value = Array.isArray(value) ? dialog.querySelector('input[name="template"]:checked')?.value : input.value;
        yes.disabled = !_value?.trim()?.length;
      }

      dialog.querySelector('form').addEventListener('input', canSubmit);

      canSubmit();

      document.body.appendChild(dialog);
      dialog.showModal();

      dialog.addEventListener('close', () => {
        if ('yes' === dialog.returnValue) {
          resolve(_value);
        } else {
          reject();
        }
        dialog.remove();
      });
    });
  }

  showSpinner(options = {}) {
    // jquery element
    if ( options?.container instanceof jQuery) {
      options.container = options.container[0];
    }
    // css selector
    if ('string' === typeof options?.container) {
      options.container = document.querySelector(options.container);
    }
    // fallback
    if (!options?.container) {
      options.container = document.body;
    }
    const container   = options.container;
    const id          = options.id                                             || 'loadspinner';
    const where       = options.where                                          || 'prepend'; // append | prepend
    const style       = options.style                                          || '';
    const transparent = options.transparent && 'background-color: transparent' || '';
    const center      = options.center      && 'margin: auto'                  || '';
    if (!document.getElementById(id)) {
      container.insertAdjacentHTML('prepend' === where ? 'afterbegin' : 'beforeend', /* html */`
        <div id="${id}" class="spinner-wrapper ${style}" style = "${transparent}">
            <div class="spinner ${style}" style="${center}"></div>
        </div>`
      );
    }
  }

  hideSpinner(id = 'loadspinner') {
    document.getElementById(id)?.remove();
  }

  /** @since 3.11.0*/
  toggleSidebar() {
    if (document.body.classList.contains('sidebar-open')) {
      this.hideSidebar();
    } else if (document.body.classList.contains('sidebar-collapse') || window.innerWidth <= 767) {
      this.showSidebar();
    } else {
      this.hideSidebar();
    }
  }

  /**
   * Toggle set full screen modal
   */
  showFullModal({ element = "#modal-fullscreen", show = true} = {}) {
    $(element).modal(show ? 'show' : 'hide')
  }

  disableSideBar(bool = true) {
    ApplicationState.sidebar.disabled = bool;
  }

  //  (100%) content
  async showContent(options = {}) {
    this.setLoadingContent(false);
    options.perc = isMobile.any ? 100 : options.perc;
    await this.setContent(options);
    return true;
  }

  // add component to stack (append)
  // Differences between pushContent and setContent are:
  //  - push every component is added, set is refreshed
  //  - pushContent has a new parameter (backonclose) when is clicked x
  //  - the contentComponent is close all stacks are closed
  async pushContent(options = {}) {
    options.perc = isMobile.any ? 100 : options.perc;
    options.push = true;
    await this.setContent(options);
  }

  //return number of a component of stack
  getContentLength() {
    return ApplicationState.content.contentsdata.length;
  }

  getCurrentContent() {
    return ApplicationState.content.contentsdata.at(-1) || null;
  }

  toggleUserMessage(bool = true) {
    this.#closeUserMessage = bool;
  }

  setLoadingContent(loading = false) {
    ApplicationState.content.loading = loading;
    return loading && new Promise((resolve) => setTimeout(resolve, 200))
  }

  /**
   * @since 4.0.0 
   */
  async setContent(opts = {}) {
    this.emit('opencontent', true);

    // close user message before set content
    if (this.#closeUserMessage) {
      this.closeUserMessage();
    }

    const panel = ApplicationState.layout[ApplicationState.layout.__current].rightpanel;

    Object.assign(opts, {
      content:     opts.content || null,
      title:       opts.title   || null,
      push:        !!opts.push,
      split:       opts.split || 'h',
      perc:        opts.perc ?? (isMobile.any ? 100 : ('h' === ApplicationState.split ? panel.width: panel.height)),
      backonclose: !!opts.backonclose,
      showtitle:   opts.showtitle ?? true,
    });

    const contents = this.getComponent('contents');
    const content  = opts.content;

    // set all content parameters
    Object.assign(ApplicationState.content, {
      title:        opts.title,
      split:        undefined === opts.split       ? null : opts.split,
      closable:     undefined === opts.closable    || opts.closable,
      backonclose:  undefined === opts.backonclose || opts.backonclose,
      headertools:  undefined === opts.headertools ? [] : opts.headertools,
      showgoback:   undefined === opts.showgoback  || opts.showgoback,
      contentsdata: ApplicationState.contentsdata,
    });

    ApplicationState.split = opts.split;

    if (!opts.perc || !opts.push)  {
      await this.#clearContents();
    }
   
    Object.assign(opts, {
      parent: contents.internalComponent.$el,
      append: true
    });
    
    contents.parent = opts.parent;

    // check the type of content:

    // String or JQuery
    if (content instanceof jQuery || 'string' === typeof content) {
      let el = 'string' === typeof content ? ($(content).length ? $(`<div> ${content} </div>`) : $(content)) : content
      $(contents.parent).append(el);
      ApplicationState.contentsdata.push({ content: el, options: opts });
      console.warn('[G3W-CLIENT] jQuery components will be discontinued, please update your code as soon as possible', ApplicationState.contentsdata.at(-1));
    }

    // Vue element
    else if ('function' === typeof content?.mount) {
      // Check a duplicate element by component id (if already exist)
      let id = ApplicationState.contentsdata.findIndex(d => d.content.getId && (content.getId() === d.content.getId()));
      if (-1 !== id) {
        await ApplicationState.contentsdata[id].content.unmount();
        ApplicationState.contentsdata.splice(id, 1);
      }
      // Mount vue component
      await content.mount(contents.parent, opts.append || false);
      ApplicationState.contentsdata.push({ content, options: opts });
    }

    // DOM element
    else {
      contents.parent.appendChild(content);
      ApplicationState.contentsdata.push({ content, options: opts });
    }

    Array
      .from(contents.internalComponent.$el.children)  // hide other elements but not the last one
      .forEach((el, i, a) => el.style.display = (i === a.length - 1) ? 'block' : 'none');

    contents.setOpen(true);

    await this.toggleContent(true);

    // automatically hide sidebar on mobile
    if (window.innerWidth < 767) {
      this.hideSidebar();
    }  
  }

  /**
   * @param bool whether to show content (right sidebar)
   */
  async toggleContent(bool) {
    document.querySelector('#g3w-content').toggleAttribute('hidden', !bool);
    await this.resize();
  }

  async closeContent() {
    this.emit('closecontent', false);

    const open = ApplicationState.content.contentsdata.length > 0;

    // content is open → remove content
    if (open) {
      this.getComponent('contents').setOpen(false);
      await this.#clearContents();
      this.toggleContent(false);
      await Vue.nextTick();
    }
  }

  // remove last content from stack
  async popContent() {

    // skip when no content data
    if (!ApplicationState.content.contentsdata.length) {
      return Promise.reject();
    }

    const data  = ApplicationState.contentsdata.at(-2);
    const opts  = data.options;

    Object.assign(ApplicationState.content, {
      title:        opts.title,
      split:        undefined !== opts.split       ? opts.split       : null,
      closable:     undefined !== opts.closable    ? opts.closable    : true,
      backonclose:  undefined !== opts.backonclose ? opts.backonclose : true,
      contentsdata: ApplicationState.contentsdata,
      style:        undefined !== opts.style       ? opts.style       : {},
      headertools:  undefined !== opts.headertools ? opts.headertools : [],
      showgoback:   undefined !== opts.showgoback  ? opts.showgoback  : true,
    });

    ApplicationState.split = opts.split ?? ApplicationState.split;

    if (!opts.perc)  {
      await this.#clearContents();
    }

    this.toggleContent(!!opts.perc);

    await Vue.nextTick();

    if (ApplicationState.contentsdata.length <= 0) {
      return;
    }

    // component exists on stack → remove the last from stack
    const content = ApplicationState.contentsdata.slice(-1)[0].content;

    if (content instanceof Component || content instanceof Panel) {
      await content.unmount();
    } else {
      content.remove();
    }

    ApplicationState.contentsdata.pop();

    Array
      .from(this.getComponent('contents').internalComponent.$el.children)       // hide other elements but not the last one
      .forEach((el, i, a) => el.style.display = (i === a.length - 1) ? 'block' : 'none');

    this.resize();

    return ApplicationState.contentsdata.at(-1);
  }

  isSidebarVisible() {
    return !document.body.classList.contains('sidebar-collapse');
  }

  /**
   * Draw grey/text overaly (eg. show a text on map)
   * 
   * @param {*} bool 
   * @param {*} message 
   */
  setModal(bool, message) {
    if (bool) {
      // after rendering the layer, restore the canvas context
      let x_min, x_max, y_min, y_max, rotation, scale;
      this.setModal(false);
      this.#shadow.listener = this.getMap().on('postcompose', e => {
        const ctx  = this.getMap().getViewport().querySelector('canvas').getContext('2d');
        const size = this.getMap().getSize();
        // Inner polygon must be counter-clockwise
        const height = size[1] * ol.has.DEVICE_PIXEL_RATIO;
        const width  = size[0] * ol.has.DEVICE_PIXEL_RATIO;
        this.#shadow.outer = [0,0,width, height];
        ctx.restore();
        ctx.beginPath();
        // Outside polygon must be clockwise
        ctx.moveTo(0, 0);
        ctx.lineTo(width, 0);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.lineTo(0, 0);
        ctx.closePath();
        // end external bbox (map is cover)
        if (this.#shadow.inner.length) {
          ctx.save();
          x_min    = this.#shadow.inner[0];
          y_min    = this.#shadow.inner[3];
          x_max    = this.#shadow.inner[2];
          y_max    = this.#shadow.inner[1];
          rotation = this.#shadow.rotation;
          scale    = this.#shadow.scale;
          // Inner polygon must be counter-clockwise antiorario
          ctx.translate((x_max+x_min)/2, (y_max+y_min)/2);
          ctx.rotate(rotation*Math.PI / 180);
          ctx.moveTo(-((x_max-x_min)/2),((y_max-y_min)/2));
          ctx.lineTo(((x_max-x_min)/2),((y_max-y_min)/2));
          ctx.lineTo(((x_max-x_min)/2),-((y_max-y_min)/2));
          ctx.lineTo(-((x_max-x_min)/2),-((y_max-y_min)/2));
          ctx.lineTo(-((x_max-x_min)/2),((y_max-y_min)/2));
          ctx.closePath();
          // end inner bbox
        }
        ctx.fillStyle = 'rgba(0, 5, 25, 0.40)';
        ctx.fill();
        if (message) {
          ctx.font = "bold 25px Arial";
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          message.split('\n').forEach((m, i) => ctx.fillText(m, width / 2, (height / 2) + 30 * i));
        }
        ctx.restore();
      });
    } else {
      if (this.#shadow.listener) {
        ol.Observable.unByKey(this.#shadow.listener);
        // reset inner draw shadow
        if (this.#shadow.inner.length) {
          this.#shadow = {
            type:     'coordinate',
            outer:    [],
            inner:    [],
            scale:    null,
            rotation: null
          };
        }
        this.#shadow.listener = null;
      }
      this.getMap().render();
    }
  }

  showSidebar() {
    document.body.classList.add('sidebar-open');
    document.body.classList.remove('sidebar-collapse');
  }

  hideSidebar() {
    document.body.classList.remove('sidebar-open');
    document.body.classList.add('sidebar-collapse');
  }

  getSize({ element, what }) {
    if (element && what) {
      return ApplicationState.sizes[element][what];
    }
  }

  getPrintParams(params = {}) {
    return params;
  }

  /**
   * Create permalink url
   * 
   * @param { URL }    url  "original_url" sent to server
   * @param { Object } data "permalink_data" sent to server
   *
   * @since 4.0.0
   */
  async getPermalink(url, data) {

    if (this.getPermalink.loading) {
      return;
    }

    this.getPermalink.loading = true;

    const project = ApplicationState.project;
    const uparams = Array.from(url.searchParams.entries());

    // get difference between start layersstree project with current
    const traverse = (nodes, onodes, tree = []) => {
      nodes.forEach((node, i) => {
        // get diff
        const diff = Object.keys(node).reduce((acc, attr) => Object.assign(acc,
          undefined !== onodes[i][attr] && node[attr] !== onodes[i][attr]
            ? { [attr]: node[attr] }
            : {}
        ), {});

        // handle recursion (group node)
        if (Array.isArray(node.nodes)) {
          diff.nodes = [];
          traverse(node.nodes, onodes[i].nodes, diff.nodes);
          diff.nodes = diff.nodes.filter(Boolean);
          if (!diff.nodes.length) {
            delete diff.nodes;
          }
        }

        // only if has changes
        if (Object.keys(diff).length) {
          diff[node.id ? 'id' : 'name'] = node.id || node.name;
          tree.push(diff);
        }
      });
      return tree;
    };

    const layers = project.state.layers.map(l => getCatalogLayerById(l.id).config.styles.some((s, i) => s.current !== l.styles[i].current) && ({
      id: l.id,
      styles: getCatalogLayerById(l.id).config.styles,
    })).filter(Boolean);

    const layersstree = traverse(
      project.getLayersStore().state.layerstree[0].nodes, // current state
      project.state.layerstree,                           // original state
    ).filter(Boolean);

    let response = await (await fetch('/api/embed/', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        url,
        data: {
          initextent:      this.getMapExtent(),                              // current map extent
          lng:             ApplicationState.language,                        // current launguage
          initbaselayer:   ApplicationState.baseLayerId || undefined,        // current base layer
          toc_tab_default: 'legend-panel' === ApplicationState.sidebar.contentsdata.at(-1)?.content?.id ? 'legend' : undefined, // whether to keep open legend panel 
          layers:          layers.length      ? layers      : undefined,     // layers configuration: store changes of layers attribute (default style etc..)
          layerstree:      layersstree.length ? layersstree : undefined,     // layerstree on TOC: loop through child nodes and return structure layerstree diff only
          ...data,
        },
      }),
    })).json();

    const permalink_code = response?.data?.permalink_code;

    const dialog = Object.assign(document.createElement('template'), {
      innerHTML: /* html */`
        <dialog id="share_modal">
          <h4 style="margin: 0; padding: .5em; color: #FFF; position: sticky; top: 0; background-color: #212c31"><i class="fa fa-share-alt" style="margin-right: .5ch;"></i> ${_('Share via link')}</h4>
          <form method="dialog">
            <input readonly value = "${ url.toString() }" onfocus="event.target.select()" class="form-control mt-2" id="embed-link" />
            <label style="margin: 1em 0;" ${uparams.length ? '' : 'hidden' }>
              <input type="checkbox" data-key="permalink_code" checked>
              Generate permalink
            </label>
            <div id="embed-params" style="border-top: thin solid #ccc;padding: 1em 0;" hidden>
              <span>Choose params to share</span>
              <div style="display: flex;gap: 1em;padding: 1em 0;">
                ${uparams.map(([key, value]) => /* html */`<label title="${value}"><input type="checkbox" data-key="${key}" checked> ${key}</label>`).join('')}
              </div>
            </div>
            <menu style="display: flex; justify-content: end;">
              <button type="submit" onclick="document.querySelector('#embed-link').focus() || document.execCommand('copy')" class="form-control btn btn-success mt-2">${ _('Copy share URL') }</button>
            </menu>
          </form>
        </dialog>
      `.trim()
    }).content.firstChild;

    // generate permalink
    const generate = () => {
      let search;
      const eparams = dialog.querySelector('#embed-params');
      const elink   = dialog.querySelector('#embed-link');
      if (dialog.querySelector('input[type="checkbox"][data-key="permalink_code"]').checked) {
        eparams.hidden = true;
        elink.value = url.origin + '/api/embed/' + permalink_code + '/';
      } else {
        eparams.hidden = false;
        search = Array
          .from(eparams.querySelectorAll('input[type="checkbox"]:checked'))
          .map(c => `${encodeURIComponent(c.getAttribute('data-key'))}=${encodeURIComponent(url.searchParams.get(c.getAttribute('data-key')))}`)
          .join('&');
        elink.value = url.origin + url.pathname + (search ? `?${search}` : '');
      }
      
    };

    generate();

    dialog.addEventListener("click", e => {
      if (e.target === dialog) {
        dialog.close();
      }
    });

    dialog.querySelectorAll('input[type="checkbox"]').forEach(c => c.addEventListener('change', generate));
    dialog.addEventListener('close', () => {
      dialog.remove();
      this.getPermalink.loading = false;
    });
    document.body.appendChild(dialog);
    dialog.showModal();
  }

  /**
   * @param { Array<{ src: string }> } images array of images
   * @param { number } index image to be shown
   * 
   * @since 4.1.0
   */
  showGallery(images, index) {
    const dialog = Object.assign(document.createElement('template'), {
      innerHTML: /* html */`
        <dialog class="modal-gallery" style="padding: 0;position:absolute;max-height:unset;margin: 0 auto;height: 100%;background: none;">
          ${
            images
              .map((img, i) => /* html */`<img src="${img.src}" loading="lazy" style="width: 100%;height: 100%; object-fit: contain; cursor:pointer;" ${ i === index ? '' : 'hidden' } />`)
              .join('')
          }
          <menu style="position: fixed;inset: 0;pointer-events: none;display: flex;padding: 0;margin: 0;justify-content: space-between;align-items: center;font: 50px Monospace;">
            <button value="close" title="close"    style="width: 80px;height: 80px;border: 0;pointer-events: all;background: none;color: #fff;position: fixed;right: 0;top: 0;">🗙</button>
            <button value="prev"  title="Previous" style="width: 80px;height: 80px;border: 0;pointer-events: all;" ${1 === images.length ? 'hidden' : ''}>&lsaquo;</button>
            <button value="next"  title="Next"     style="width: 80px;height: 80px;border: 0;pointer-events: all;" ${1 === images.length ? 'hidden' : ''}>&rsaquo;</button>
          </menu>
        </dialog>
      `.trim()
    }).content.firstChild;

    dialog.addEventListener("click", e => {
      const btn = e.target.closest('button');
      if (e.target === dialog || 'close' === btn?.value || (1 === images.length && 'IMG' === e.target.tagName)) {
        dialog.close();
      }
      if (['next','prev'].includes(btn?.value)) {
        const imgs = Array.from(dialog.querySelectorAll('img'));
        const i    = imgs.findIndex(img => !img.hidden);
        imgs[i].hidden = true;
        imgs.at((i + ('next' === btn.value ? 1 : -1)) % imgs.length).hidden = false;
      }
    });

    dialog.addEventListener('close', () => {
      dialog.remove();
    });

    document.body.appendChild(dialog);
    dialog.showModal();
  }

  /**
   * Called on DOM resize
   */
  async resize() {
    const app      = document.querySelector('#app');
    const content  = document.querySelector('#g3w-content');
    const navbar   = document.querySelector('.navbar');
    const contents = document.querySelector('#contents');
    const sidebar  = document.querySelector('.main-sidebar');
    const footer   = document.querySelector('#map_footer');

    const W        = app.getBoundingClientRect().width;
    const H        = window.innerHeight - navbar.offsetHeight;

    const panel    = ApplicationState.layout[ApplicationState.layout.__current].rightpanel;

    const h_split  = 'h' === (ApplicationState.contentsdata.at(-1)?.options?.split ?? ApplicationState.split);
    const v_split  = 'v' === (ApplicationState.contentsdata.at(-1)?.options?.split ?? ApplicationState.split);
    const is_full  = 100 === ApplicationState.contentsdata.at(-1)?.options?.perc || (h_split ? panel.width_100 : panel.height_100);

    // percentage of secondary view (content)
    const scale    = is_full ? 1 : ((h_split ? panel.width: panel.height) /100);

    contents.parentElement.classList.toggle('full-size', is_full);

    ApplicationState.sidebar.open = !document.body.classList.contains('sidebar-collapse');

    // reset scrollbars position (mobile ⇄ desktop)
    app.scrollTo(0,0);

    // resize "content" (state)
    Object.assign(ApplicationState.content.sizes, {
      width:  content.hidden ? 0 : (h_split ? Math.max(W * scale, 200) - (is_full && window.innerWidth > 767 ? sidebar.offsetWidth : 0) : W),
      height: content.hidden ? 0 : (v_split ? Math.max(H * scale, 200) - (is_full && window.innerWidth > 767 ? footer.offsetHeight : 0) : H - footer.offsetHeight) } 
    );

    // resize floating elements (sidebars, navbar, footer)
    document.body.style.setProperty('--mt', `${window.innerWidth < 767 && ApplicationState.sidebar.open    ? 0                                                           : navbar.offsetHeight}px`);
    document.body.style.setProperty('--mr', `${h_split && !content.hidden                                  ? ApplicationState.content.sizes.width                        : 0}px`);
    document.body.style.setProperty('--mb', `${v_split                                                     ? ApplicationState.content.sizes.height + footer.offsetHeight : footer.offsetHeight}px`);
    document.body.style.setProperty('--ml', `${window.innerWidth > 767                                     ? sidebar.offsetWidth                                         : 0}px`);

    // map controls layout vars (decoupled from map view padding vars)
    const controls_top       = 5;
    const controls_right     = (h_split && !content.hidden ? ApplicationState.content.sizes.width : 0) + 5;
    const controls_bottom    = v_split ? ApplicationState.content.sizes.height + footer.offsetHeight : footer.offsetHeight;
    const controls_maxheight = Math.max(H - controls_top - controls_bottom, 0);

    document.body.style.setProperty('--g3w-controls-top', `${controls_top}px`);
    document.body.style.setProperty('--g3w-controls-right', `${controls_right}px`);
    document.body.style.setProperty('--g3w-controls-bottom', `${controls_bottom}px`);
    document.body.style.setProperty('--g3w-controls-max-height', `${controls_maxheight}px`);

    // wait DOM repaint (after vue state is updated)
    await Vue.nextTick();

    // resize "map"
    if (this.#map && W > 0 && H > 0) {
      this.getMap().updateSize();
      this.state.hidemaps.forEach(h => h.map.updateSize());
      this.state.bbox       = this.getMapBBOX();
      this.state.resolution = this.#map.getView().getResolution();
      this.state.center     = this.#map.getView().getCenter();
    }

    this.setHidden(W <= 0 || H <= 0);

    const padding = [
      // TODO: move `#map` container underneath the top `.navbar` element (NB: it will break `--g3w-map` anchor?) 
      0, // parseFloat(document.body.style.getPropertyValue('--mt'))
      parseFloat(document.body.style.getPropertyValue('--mr')),
      parseFloat(document.body.style.getPropertyValue('--mb')),
      parseFloat(document.body.style.getPropertyValue('--ml'))
    ];

    // init "map"
    if (!this.#map) {
      await this.#initMap({ padding });
    }

    // update map padding
    this.getMap().getView().padding = padding;
    // re-layout each component stored into the stack
    ApplicationState.contentsdata.forEach(d => {
      try {
        if ('function' == typeof d.content.layout) {
          d.content.layout(ApplicationState.content.sizes.width, parseFloat(contents.style.height));
        }
      } catch(e) {
        this.showUserMessage({ type: 'warning', message: e.toString(), autoclose: true });
        setTimeout(() => this.resize(), 1000);
      }
    });

    this.emit('resize');

    window.localStorage.setItem('SIDEBAR', JSON.stringify(panel));
  }

  /**
   * Convert error to user message showed
   * 
   * @param error
   * @returns {string}
   */
  #errorToMessage(error) {
    const type = toRawType(error);

    if ('Error' === type) {
      return `CLIENT - ${error.message}`;
    }

    if ('Object' === type && error.responseJSON && false === error.responseJSON.result) {
      const e = error.responseJSON.error;
      return `${(e.code || '').toUpperCase()} ${e.data || ''} ${e.message || '' }`;
    }

    if ('Object' === type && error.responseText) {
      return error.responseText;
    }

    if ('Array' === type) {
      return error.map(e => this.#errorToMessage(e)).join(' ');
    }

    return error || 'server_error';
  }

  /**
   * clear all stacks
   */
  async #clearContents() {
    await Promise.allSettled((ApplicationState.contentsdata || []).map(async d => {
      if (d.content instanceof Component || d.content instanceof Panel) {
        await d.content.unmount();
      } else {
        let parent = this.getComponent('contents').parent;
        ('string' === typeof parent ? document.querySelector(parent) : parent)?.replaceChildren(); // removes all children
      }
    }));
    ApplicationState.contentsdata.splice(0, ApplicationState.contentsdata.length);
  }

  /**
   * @since 4.1.0
   */
  online() {
    ApplicationState.online = true;
    this.emit('online');
  }

  /**
   * @since 4.1.0
   */
  offline() {
    ApplicationState.online = false;
    this.emit('offline');
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Hook method called when response is handled by Data Provider
   *
   * @param { Object }                             queryResponse
   * @param { Array }                              queryResponse.data
   * @param { 'coordinates' | 'bbox' | 'polygon' } queryResponse.type
   * @param { Object }                             queryResponse.query
   * @param { Object }                             queryResponse.query.external
   * @param { boolean }                            queryResponse.query.external.add       - whether add external layers to response
   * @param { Object }                             queryResponse.query.external.filter
   * @param { boolean }                            queryResponse.query.external.SELECTED
   * @param { Object }                             options
   * @param { boolean }                            options.add                            - whether is a new query request (add/remove query request)
   * 
   * @since 4.1.0
   */
  setQueryResponse(queryResponse, options = { add: false, update: false }) {
    // set mandatory queryResponse fields
    if (!queryResponse.data)           queryResponse.data           = [];
    if (!queryResponse.query)          queryResponse.query          = { external: { add: false, filter: { SELECTED: false } } };
    if (!queryResponse.query.external) queryResponse.query.external = { add: false, filter: { SELECTED: false }};


    // overwrite any previous request
    if (false === options.add && !options.update) {
      this.#clearState();
    }

    // the request
    if (false === options.add) {
      this.state.query      = queryResponse.query;
      this.state.type       = queryResponse.type;
    }

    // whether add external layers to response
    if (true === queryResponse.query.external.add && false === options.add) {
      // add visible layers to query response (vector layers)
      this.#vectorLayers.forEach(layer => {
        // TODO: extract this into `layer.isSomething()` ?
        if (layer.getVisible() && [undefined, !!(ApplicationState.catalog.external.vector.find(l => l.id === layer.get('id')) || {}).selected].includes(queryResponse.query.external.filter.SELECTED)) {
          queryResponse.data[
            '__g3w_marker' === layer.get('id') // keep geocoding control "marker" layer at the top
            ? 'unshift'
            : 'push'
          ](this.getVectorFeatures(layer, queryResponse.query));
        }
      });
    }

    const geom = false === options.add && ({
      'coordinates': 2 === (this.state.query.coordinates || []).length && new ol.geom.Point(this.state.query.coordinates),
      'bbox':        4 === (this.state.query.bbox || []).length        && ol.geom.Polygon.fromExtent(this.state.query.bbox),
      'polygon':     this.state.query.geometry,
      'drawpolygon': this.state.query.geometry,
      'circle':      this.state.query.geometry,
    })[this.state.query.type];

    // show a query result on map
    if (geom) {
      const feat = new ol.Feature(geom);
      feat.setId(undefined);
      this.#layer.getSource().clear();
      this.getMap().removeLayer(this.#layer);
      this.#layer.getSource().addFeature(feat);
      this.getMap().addLayer(this.#layer);
      this.#layer.setZIndex(this.getMap().getLayers().getLength()); // ensure layer is on top of others
    }

    // Convert response from DataProvider into a QueryResult component data structure
    // Skip when the layer has no features or rawdata is undefined (external wms)
    const layers = queryResponse.data
      .flatMap(d => [].concat(d))
      .filter(d => d && (undefined !== d.rawdata || (Array.isArray(d.features) && d.features.length > 0)))
      .map(({
        layer,
        features,
        rawdata, // rawdata response
        error
      } = {}) => {

        const is_layer  = layer instanceof g3w.Layer;
        const is_vector = layer instanceof ol.layer.Vector;                     // instance of openlayers layer Vector Class
        const is_string = 'string' === typeof layer || layer instanceof String; // can be created by string

        let sourceType;

        if (is_string) {
          sourceType = 'vector';
        } else if (is_layer) {
          try {
            sourceType = layer.getSourceType();
          } catch (error) {
            console.warn('uknown source type for layer:', error, layer);
          }
        }
        
        const name = is_string && layer.split('_');

        const id = (is_layer ? layer.getId() : undefined) ||
          (is_vector ? layer.get('id') : undefined) ||
          (is_string ? layer : undefined);

        let attributes;
        let layerAttrs;

        // sanity check (eg. external layers ?)
        if (!features || !features.length) {
          attributes = [];
        }
    
        // Sanitize OWS Layer attributes
        if (!attributes && layer instanceof g3w.Layer) {
          layerAttrs = layer.getAttributes().map(attr => 'ows' === this.state.type ? ({ ...attr, name: attr.name.replace(/ /g, '_') }) : attr);
        }
    
        if (!attributes && layer instanceof ol.layer.Vector) {
          layerAttrs = layer.getProperties();
        }
    
        if (!attributes && 'string' === typeof layer || layer instanceof String) {
          layerAttrs = (features[0] ? features[0].getProperties() : [])
        }
    
        const specialAttrs = (!attributes && layer instanceof g3w.Layer && layerAttrs || []).filter(attr => {
            try {
              return ('_' === attr.name[0] || Number.isInteger(1 * attr.name[0]))
            } catch(e) {
              return false;
            }
          }).map(attr => ({ alias: attr.name.replace(/_/, ''), name: attr.name }));
    
        if (!attributes && specialAttrs.length) {
          features.forEach(f => {
            // get attributes special keys from feature properties received by server request
            const attrs = Object.keys(f.getProperties());
            specialAttrs.forEach(layerAttr => {
              attrs.find(attr => {
                if (attr === layerAttr.alias) {
                  f.set(layerAttr.name, f.get(attr));
                  return true
                }
              })
            });
          });
        }
    
        // Parse attributes to show on a result based on field
    
        let attrs = !attributes && getAlphanumericProps(
          Object.keys(features[0] instanceof ol.Feature ? features[0].getProperties() : features[0].properties)
        );
    
        if (!attributes) {
          attributes = (layerAttrs && layerAttrs.length > 0)
            ? layerAttrs.filter(attr => attrs.includes(attr.name))
            : attrs.map(featureAttr => ({
              name:  featureAttr,
              label: featureAttr,
              show:  G3W_FID !== featureAttr && [undefined, 'gdal', 'wms', 'wcs', 'wmst', 'postgresraster', 'arcgismapserver'].includes(sourceType),
              type:  'varchar'
            }));
        }

        const external   = (is_vector || is_string);
        const structure  = is_layer && layer.hasFormStructure() && layer.getLayerEditingFormStructure();

        if (structure && Array.isArray(this.#relations[layer.getId()]) && this.#relations[layer.getId()].length > 0) {
          for (const node of structure) {
            this.#setRelationField(node);
          }
        }

        // layerObj
        return {
          id,
          attributes,
          external,
          features: (!rawdata && features || []).map(f => ({
            id:         external ? f.getId() : (f instanceof ol.Feature ? f.getId() : f.id),
            attributes: f instanceof ol.Feature ? f.getProperties() : f.properties,
            geometry:   f instanceof ol.Feature ? f.getGeometry()   : f.geometry,
            selected:   !external && (!!queryResponse.query.autofilter || layer.state.filter.active || layer.hasSelectionFid((f instanceof ol.Feature ? f.getId() : f.id))), //@since 3.11.8 check if autofilter is set
            show:       true,
          })),
          hasgeometry:            Array.isArray(features) && !rawdata && features.some(f => f instanceof ol.Feature ? f.getGeometry() : f.geometry),
          hasImageField:          Array.isArray(features) && !rawdata && features.length && attributes.some(attr => 'image' === attr.type),
          loading:                false,
          show:                   true,
          expandable:             true,
          addfeaturesresults:     { active: false },
          downloadformats:        { active: false },
          editable:               is_layer   ? layer.isEditable() && layer.config.editing?.visible : false,
          editing:                is_layer   ? layer.state.editing                                 : { inediting: false},
          source:                 is_layer   ? layer.getSource()                                   : undefined,
          infoformat:             is_layer   ? layer.getInfoFormat()                               : undefined,
          infoformats:            is_layer   ? layer.getInfoFormats()                              : [],
          downloads:              is_layer   ? layer.getDownloadFormats()                          : [],
          formStructure:          structure  ? {
            structure,
            // get field show
            fields: layer.getFields().filter(f => f.show).concat(
              (Array.isArray(features) && !rawdata && features.length > 0 && attributes || []).filter(attr => layer.getFields().some(f => f.name === attr.name))
            ),
          } : undefined,
          relationsattributes:       (is_layer || is_vector || is_string)                       ? []                     : undefined,
          hasdownloadablerelations:  !external && layer.hasDowloadableRelations(), //@since 3.11.7
          filter:                    (is_layer && !['wms', 'wcs', 'wmst', 'arcgismapserver'].includes(sourceType)) ? layer.state.filter     : {},
          selection:                 (is_layer && !['wms', 'wcs', 'wmst', 'arcgismapserver'].includes(sourceType) && layer.state.selection) || (is_vector && layer.selection) || { active: undefined },
          title:                     (is_layer && layer.getTitle()) || (is_vector && layer.get('name')) || (is_string && name && (name.length > 4 ? name.slice(0, name.length - 4).join(' ') : layer)) || undefined,
          atlas:                     this.#atlas.filter(a => a.atlas.qgs_layer_id === id),
          rawdata:                   rawdata  || null,
          error:                     error    || '',
          toc:                       external || layer.state.toc, //@since v3.10.0
          max_preview_fields:        layer.state?.max_preview_fields || 3, //@since 4.0.0 
        };
      });
      
    /// sort layers by TOC (external layer always on bottom)
    if (false === options.add) {
      layers.sort((a, b) => a.external ? 0 : (this._projectLayerIds.indexOf(a.id) > this._projectLayerIds.indexOf(b.id) ? 1 : -1));
    }

    // get features from added pick layer in case of a new request query
    layers.forEach((l, index) => {
       // whether result comes from pagination or previous requestis a filter pagination (case search with autofilter)
      l.filter.pagination = l.filter.active || (l.filter.pagination || !!(this.state.query?.pagination?.[l.id]?.paginate));
      if (options.add || options.update) {
        this.updateLayerResultFeatures(l, options.update);
      } else {
        this.state.queried_layers.push(l);
      }
    });

    this.setActionsForLayers(layers, { add: options.add, update: options.update });
    this.state.changed = true;

    // used by the following plugins: "bforest"
    this.emit('onafter:setLayersData', layers, options);
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param actions
   * @param layers
   * 
   * @since 4.1.0
   */
  addActionsForLayers(actions, layers) {}

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Used by the following plugins: "law", "innovapuglia"
   *
   * @param element
   * 
   * @since 4.1.0
   */
  postRender(element) {}

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Setter method related to relation table
   * 
   * @since 4.1.0
   */
  editFeature({ layer, feature } = {}) {}

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Remove a feature from current layer result
   *
   * @param layer
   * @param feature
   * 
   * @since 4.1.0
   */
  removeFeatureFromResult(layer, feature) {
    this.updateLayerResultFeatures({ id: layer.id, external: layer.external, features: [feature] });
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * used by the following plugins: "qplotly"
   * 
   * @since 4.1.0
   */
  addLayersPlotIds(layerIds = []) {
    this.plotLayerIds = layerIds;
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * used by the following plugins: "br-service"
   * 
   * Register for plugin or other component of application to add
   * custom component on result for each layer feature or layer
   *
   * @param opts.id        unique id identification
   * @param opts.layerId   Layer id of layer
   * @param opts.component custom component
   * @param opts.type      feature or layer
   * @param opts.position
   * 
   * @since 4.1.0
   */
  registerCustomComponent({
    id       = getUniqueDomId(),
    layerId,
    component,
    type     = 'feature',
    position = 'after',
  } = {}) {
    if (undefined === this.state.layerscustomcomponents[layerId]) {
      this.state.layerscustomcomponents[layerId] = {
        layer:   { before: [], after: [] },
        feature: { before: [], after: [] }
      };
    }
    this.state.layerscustomcomponents[layerId][type][position].push({ id, component });
    return id;
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Loop over response features based on layer response and
   * check if features layer needs to be added or removed to
   * current `state.queried_layers` results.
   *
   * @param responseLayer layer structure coming from request
   * @param replace    @since 3.11.0 mean replace current state layer features
   *
   * @since 4.1.0
   */
  updateLayerResultFeatures(responseLayer, replace = false) {
    const layer = this.state.queried_layers.find(l => l.id === responseLayer.id);

    if (layer?.features?.length > 0) {
      const features_ids = replace ? [] : layer.features.map(f => this.#getFid(f, layer?.external)) // get features id from current layer on a result
      const action = this.state.layersactions[layer.id].find(a => 'selection' === a.id);            // get action selection;
      if (replace) {
        layer.features.forEach(f => delete this.state.layersFeaturesBoxes[this.getBoxId(layer, f)]);
        layer.features.splice(0);
      }
      (responseLayer.features || []).forEach((feat, index) => {
        const feature_id = this.#getFid(feat, layer?.external);
        // If true, remove the feature because is already loaded
        if (features_ids.some(id => id === feature_id)) {
          //@since 3.11.0
          if (action && feat.selected) {
            (layer?.external ? layer : getCatalogLayerById(layer.id)).fidsOut(feature_id, layer.filter.active);
          }
          //filter feature
          layer.features = layer.features.filter(f => feature_id !== this.#getFid(f, layer?.external));
          delete this.state.layersFeaturesBoxes[this.getBoxId(layer, feat)]
          if (action) {
            delete action.state.toggled[index];
            //need to reset toggled state in reactive mode
            action.state.toggled = Vue.observable(layer.features.reduce((a,f,i) => { a[i] = f.selected; return a }, {}));
          }
        } else {                                                              // add feature
          layer.features.push(feat);
        }
      });
      // toggle layer feature box
      (layer.features || []).forEach(f => {
        const collapsed = (layer.features || []).length > 1;
        const box       = this.state.layersFeaturesBoxes[this.getBoxId(layer, f)];
        if (box) {
          setTimeout(() => box.collapsed = collapsed); // due to vue reactivity, wait a little bit before update layers
        }
      });
    }

    // no more features on layer → remove interaction pickcoordinate to get a result from a map
    if (layer && 0 === (layer.features || []).length) {
      // due to vue reactivity, wait a little bit before update layers
      setTimeout(() => {
        this.state.queried_layers = this.state.queried_layers.filter(l => l.id !== layer.id);
        this.highlight(false);
        this.removeAddFeaturesLayerResultInteraction(true);
      })
    }

    // highlight new feature
    if (1 === this.state.queried_layers.length) {
      let type, geometry;
      const coordinates = this.state.queried_layers[0].features
        .map(f => f.getGeometry ? f.getGeometry() : f.geometry)
        .map(geom => {
          type = type ? type : (geom instanceof ol.geom.Geometry) ? geom.getType() : geom.type;
          return geom?.getCoordinates?.() ?? geom.coordinates;
        });

      //check if features have geometry
      if (coordinates.length > 0) {
        try {
          geometry = new ol.geom[type.includes('Multi') ? type : `Multi${type}`](type.includes('Multi') ? coordinates.flat(): coordinates);
        } catch(e) {
          console.warn(e);
        }
      }
      this.highlight(geometry, { duration: Infinity, zoom: false });
    }

    // call "action.change"
    this.state.layersactions[layer.id].forEach(action => action.change && action.change(layer));

    // reset actions tools
    (layer.features || []).forEach((_, idx) => {
      const tool = this.state.currentactiontools[layer.id];
      if (undefined === tool) {
        return;
      }
      if (undefined === tool[idx]) {
        Vue.set(tool, idx, null);
      }
      tool[idx] = null;
    });

    // used by the following plugins: "bforest"
    this.emit('onafter:changeLayerResult', layer);
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Generate a boxid identifier to query result html
   *
   * @param layer
   * @param feature
   * @param relation_index
   *
   * @returns {string}
   * 
   * @since 4.1.0
   */
  getBoxId(layer, feature, relation_index) {
    return (null !== relation_index && undefined !== relation_index)
      ? `${layer.id}_${feature.id}_${relation_index}`
      : `${layer.id}_${feature.id}`;
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param layers
   * @param options
   * 
   * @since 4.1.0
   */
  setActionsForLayers(layers, options = { add: false, update: false }) {
    if (options.add || options.update) {
      return;
    }

    // reset array
    this.#events.query = [];

    // loop results
    layers.forEach((layer, index) => {
      // eventually set layer action tool and need to be reactive
      this.state.layeractiontool[layer.id]           = Vue.observable({ component: null, config: null });
      this.state.currentactiontools[layer.id]        = Vue.observable({ ...Array((layer.features || []).length).fill(null) });
      this.state.currentactionfeaturelayer[layer.id] = Vue.observable({ ...Array((layer.features || []).length).fill(null) });
      this.state.layersactions[layer.id]             = this.state.layersactions[layer.id] || [];

      this.state.layersactions[layer.id].push(...([

        // zoom to geometry
        layer.hasgeometry && {
          id:        'gotogeometry',
          mouseover: true,
          class:     "fas fa-map-marker-alt",
          hint:      'Zoom to feature',
          cbk:       throttle((layer, feature) => {
            if (!feature.geometry) {
              return;
            }
            const async = document.querySelector('#g3w-content')?.classList?.contains?.('full-size');
            this.once('asyncFnc.todo', () => {
              if (this.isOneLayerResult()) {
                this.zoomToFeatures([feature], {});
              } else {
                this.highlight(feature.geometry, { layerId: layer.id, duration: 1500 });
              }
            });
            if (async) {
              this.closeContent();
            } else {
              setTimeout(() => this.emit('asyncFnc.todo'));
            }
          })
        },

        // show relations (query)
        (this.#relations[layer.id] || []).some(r => 'MANY' === r.type) && {
          id:       'show-query-relations',
          class:    "fas fa-sitemap",
          hint:     'Show Relations',
          cbk: (layer, feature) => {
            this.showRelations({ feature, layerId: layer.id });
          },
        },

        // print (atlas)
        this.#atlas.filter(a => a.atlas.qgs_layer_id === layer.id).length && {
          id:       'printatlas',
          download: true,
          class:    "fas fa-print",
          hint:     'Print Atlas',
          cbk:      (layer, feature) => this.printAtlas(layer, feature)
        },

        // remove feature
        ('__g3w_marker' === layer.id || (!layer.external && !['wms', 'arcgismapserver'].includes((layer.source || {}).type))) && {
          id:        'removefeaturefromresult',
          mouseover: true,
          class:     "fas fa-minus-square",
          style:     { color: 'red' },
          /** @since 3.11.0 hide element in case of pagination (show = false) */
          state:     Vue.observable({ disabled: layer.filter.pagination || layer.filter.active }),
          hint:      'Remove feature from results',
          cbk:       this.removeFeatureFromResult.bind(this),
          init() {
            //@4.1.0 need to listen pagination and active filter on layer
            this.unwatch = Vue.watch(() => [layer.filter.pagination, layer.filter.active], bools => this.state.disabled = (bools.reduce((a, bool) => { a = a || bool; return a; }, false))); // listen filter layer pagination change
          },
          clear() {
            this.unwatch && this.unwatch(); // remove action when destroy
          },
          change() {
            this.state.disabled = layer.filter.pagination;
          }
        },

        // select feature
        (layer.toc && undefined !== layer.selection.active) && {
          id:       'selection',
          class:    "fas fa-check-circle",
          hint:     'Add/Remove Selection',
          state:    Vue.observable({
            toggled:  layer.features.reduce((a, _ , i ) => { a[i] = false; return a; }, {}),
            disabled: layer.filter.active // show action when filter is not set
          }),
          init({ layer, feature, index, action } = {}) {
            this.unwatch = Vue.watch(() => layer.filter.active, bool => this.state.disabled = bool ); // listen filter layer pagination change
            if (!feature) {
              return console.trace('Invalid feature');
            }
            action.state.toggled[index] = feature.selected;
          },
          change({ features }) {
            // wait for pagination change request
            setTimeout(() => {
              features.forEach((_, index) => undefined === this.state.toggled[index] && Vue.set(this.state.toggled, index, false))
            })
          },
          clear() {
            this.unwatch && this.unwatch(); // remove action when destroy
          },
          cbk: throttle((layer, feature) => { this.toggleSelection(layer, feature); })
        },

        // permalink (click to copy)
        (layer.hasgeometry && !layer.external && !['wms', 'arcgismapserver'].includes((layer.source || {}).type)) && {
          id:          'link_zoom_to_fid',
          class:       "fa fa-share-alt",
          hint:        'Share via link',
          cbk: (layer, feature) => {
            const url = new URL(location.href);
            url.searchParams.set('zoom_to_fid', `${layer.id}|${feature.attributes[G3W_FID]}`);
            this.getPermalink(url, {});
          }
        },

        // edit
        (layer.editable) && {
          id:    'editing',
          class: "fas fa-pencil-alt",
          hint:  'Editing',
          state:  Vue.observable({ disabled: layer.editing.inediting }), //disable when in editing
          init() {
             this.unwatch = Vue.watch(() => layer.editing.inediting, bool => this.state.disabled = bool );
          },
          clear() {
            this.unwatch && this.unwatch(); // remove action when destroy
          },
          cbk:   (layer, feature) => this.editFeature({ layer, feature })
        },

      ]).filter(Boolean));


      // In case of external layer doesn't listen to `selection` event
      if (layer.external && layer.toc && undefined !== layer.selection.active) {
        //in case 
        layer.selection.features = layer.selection.features || [];
        layer.features.forEach(f => f.selected = (layer.selection.features.find(s => f.id === s.getId()) || ({ selected: false })).selected);
      } else if (!layer.external && layer.toc && undefined !== layer.selection.active) {
        const handler = () => layer.features.forEach((_, i) => this.state.layersactions[layer.id].find(a => a.id === 'selection').state.toggled[i] = false);
        getCatalogLayerById(layer.id).on('unselectionall', handler);
        this.#events.query.push({ layer: getCatalogLayerById(layer.id), event: 'unselectionall', handler });
      }

    });

    this.addActionsForLayers(this.state.layersactions, this.state.queried_layers);
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Get action referred to layer getting the action id
   *
   * @param opts.layer layer linked to action
   * @param opts.id    action id
   * 
   * @returns undefined when no action is found
   * 
   * @since 4.1.0
   */
  getActionLayerById({
    layer,
    id,
  } = {}) {
    if (this.state.layersactions[layer.id]) {
      return this.state.layersactions[layer.id].find(action => action.id === id);
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Set current layer action tool in feature
   *
   * @param {Object } opts
   * @param opts.layer current layer
   * @param opts.index feature index
   * @param opts.action action
   * @param opts.component vue component
   * 
   * @since 4.1.0
   */
  setCurrentActionLayerFeatureTool({
    layer,
    action,
    index,
    component = null
  } = {}) {
    const tools   = this.state.currentactiontools[layer.id];        // get current action tools
    const feats   = this.state.currentactionfeaturelayer[layer.id];
    feats[index]  = component ? action : null;
    tools[index]  = component;                                      // set component

    // need to check if pass component and
    if (
      tools[index] &&                   // if component is set
      action.id !== feats[index].id &&  // same action
      feats[index].toggleable           // check if toggleable
    ) {
      feats[index].state.toggled[index] = false;
    }

  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * @param {Object } opts
   * @param opts.layer current layer
   * @param opts.component vue component
   * @param opts.config configuration Object
   * 
   * @since 4.1.0
   */
  setLayerActionTool({
    layer,
    component = null,
    config    = null,
  } = {}) {
    this.state.layeractiontool[layer.id].component = component;
    this.state.layeractiontool[layer.id].config    = config;
  };

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * Clear all
   * 
   * @since 4.1.0
   */
  clear() {
    // unlistener events actions
    this.#events.query.forEach(obj => obj.layer.off(obj.event, obj.handler));
    this.#events.query = [];
    this.highlight(false);
    this.#layer.getSource().clear();
    this.removeAddFeaturesLayerResultInteraction(true);
    //reset pagination
    this.#clearState();
    // used by the following plugins: "stress"
    this.emit('onbefore:closeComponent');
    // used by the following plugins: "bforest"
    this.emit('onafter:closeComponent');
    this.#layer.getSource().clear();
    this.getMap().removeLayer(this.#layer);

    // clear map
    this.#events.ol.forEach(key => ol.Observable.unByKey(key));
    this.#events.ol.splice(0);
    Object.values(ApplicationState.layers).forEach(this.#removeEventsKeysToLayersStore.bind(this));

    // exec lazy functions 
    setTimeout(() => {
      this.emit('asyncFnc.todo');
      this.off('asyncFnc.todo');
    })
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Check if a one layer result
   *
   * @returns {boolean}
   * 
   * @since 4.1.0
   */
  isOneLayerResult() {
    return (1 === this.state.queried_layers.length);
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param {boolean} toggle whether toggle mapcontrol
   * 
   * @since 4.1.0
   */
  removeAddFeaturesLayerResultInteraction(toggle) {
    if (null !== this.#interaction.toggleeventhandler) {
      this.off('mapcontrol:toggled', this.#interaction.toggleeventhandler);
    }

    // remove current interaction to get features from layer
    if (null !== this.#interaction.interaction) {
      this.removeInteraction(this.#interaction.interaction);
    }

    // check if query map control is toggled and registered
    if (null !== this.#interaction.mapcontrol) {
      this.#interaction.mapcontrol.toggle(toggle);
    }

    // reset values
    Object.assign(this.#interaction, {
      interaction:        null,
      id:                 null,
      toggleeventhandler: null,
      mapcontrol:         null,
    });

  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Adds feature to Features layer results
   *
   * @param layer
   * 
   * @since 4.1.0
   */
  addLayerFeaturesToResultsAction(layer) {
    const not_current = ![null, layer.id].includes(this.#interaction.id);
    const new_layer   = not_current && this.state.queried_layers.find(l => l.id === this.#interaction.id);

    // disable previous layer
    if (not_current && new_layer) {
      new_layer.addfeaturesresults.active = false;
    }

    // remove previous interaction
    if (not_current && this.#interaction.interaction) {
      this.removeInteraction(this.#interaction.interaction);
    }

    // set new layer
    this.#interaction.id = layer.id;

    layer.addfeaturesresults.active = !layer.addfeaturesresults.active;

    // disable map context menu when add feature interaction is active
    this.getMap().set('can_show_context_menu', !layer.addfeaturesresults.active);

    if (false === layer.addfeaturesresults.active) {
      this.removeAddFeaturesLayerResultInteraction(true);
    } else {

      // used by the following plugins: "bforest"
      this.emit('onbefore:activeMapInteraction');

      const external_layer = (this.state.queried_layers.find(l => l.id === layer.id) || {}).external;

      this.#interaction.mapcontrol  = this.#interaction.mapcontrol || this.getCurrentToggledMapControl() || null;
      this.#interaction.interaction = new PickCoordinatesInteraction();

      this.addInteraction(this.#interaction.interaction, { close: false });

      this.#interaction.interaction
        .on('picked', async ({ coordinate: coordinates }) => {
          if (external_layer) {
            // call setQueryResponse setters method directly in case of external layer 
            this.setQueryResponse(
              {
                data:  [ this.getVectorFeatures(this.#vectorLayers.find(v => layer.id === v.get('id')), { coordinates }) ],
                query: { coordinates }
              },
              { add: true }
            );
          } else {
            await this.getData(
              'query:coordinates',
              {
                inputs: {
                  coordinates,
                  query_point_tolerance: ApplicationState.project.getQueryPointTolerance(),
                  layerIds:              [layer.id],
                  multilayers:           false,
                },
                outputs: {
                  show: { add: true }
                }
              }
            );
          }
        });

      this.#interaction.toggleeventhandler = (evt) => {
        if (evt.target.isToggled() && evt.target.isClickMap()) {
          layer.addfeaturesresults.active = false;
        }
      };

      this.once('mapcontrol:toggled', this.#interaction.toggleeventhandler);

    }
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * used by the following plugins: "bforest"
   * 
   * @since 4.1.0
   */
  deactiveQueryInteractions() {
    this.state.queried_layers.forEach(l => {
      if (l.addfeaturesresults) { l.addfeaturesresults.active = false }
    })
    this.removeAddFeaturesLayerResultInteraction();
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * @returns { boolean } whether show feature in results (show + active filter + selected)
   * 
   * @since 4.1.0
   */
  showFeature(layer, feature) {
    return feature.show && ((layer.filter || {}).active ? feature.selected : true);
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Reset internal state
   * 
   * @since 4.1.0
   */
  #clearState() {
    //need to reset pagination
    this.state.queried_layers.forEach(l => l.filter.pagination = false);
    this.state.queried_layers.splice(0);
    this.state.query               = null;
    this.state.querytitle          = "";
    this.state.changed             = false;
    this.state.layersactions       = {};
    this.state.actiontools         = {};
    this.state.layeractiontool     = {};
    this.state.currentactiontools  = {};
    this.state.layersFeaturesBoxes = {};
    this.removeAddFeaturesLayerResultInteraction();
    this.#relations = (ApplicationState.project.getRelations() || []).reduce((group, r) => {
      group[r.referencedLayer] = group[r.referencedLayer] || [];
      group[r.referencedLayer].push(r);
      return group;
    }, {});
    this.#atlas = ApplicationState.project.getPrint().filter(p => p.atlas) || [];
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * @since 4.1.0
   */
  getState() {
    return this.state;
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param querytitle
   * 
   * @since 4.1.0
   */
  setTitle(querytitle) {
    this.state.querytitle = querytitle || "";
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param vectorLayer
   * 
   * @since 4.1.0
   */
  registerVectorLayer(vectorLayer) {
    if (!this.#vectorLayers.includes(vectorLayer)) {
      this.#vectorLayers.push(vectorLayer);
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param vectorLayer
   * 
   * @since 4.1.0
   */
  unregisterVectorLayer(vectorLayer) {
    this.#vectorLayers          = this.#vectorLayers.filter(vl => {
      this.state.queried_layers = this.state.queried_layers.filter(l => l.id !== vectorLayer.get('id'));
      return vl !== vectorLayer;
    });
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param vectorLayer
   * @param query
   *
   * @returns {Object|Boolean}
   * 
   * @since 4.1.0
   */
  getVectorFeatures(layer, query = {}) {
    let {
      coordinates,
      bbox,
      geometry,
      filterConfig = {}
    } = query; // extract information about a query type

    let features = [];

    const has_coords = coordinates && Array.isArray(coordinates);
    const has_bbox   = bbox && Array.isArray(bbox);

    // case query coordinates
    if (has_coords) {
      this.#map.forEachFeatureAtPixel(
        this.#map.getPixelFromCoordinate(coordinates),
        f => { features.push(f); },
        { layerFilter: l => l === layer }
      );
    }

    // case query bbox
    if (has_bbox && !has_coords) {
      //set geometry has Polygon
      geometry = ol.geom.Polygon.fromExtent(bbox);
    }

    const is_poly = geometry instanceof ol.geom.Polygon || geometry instanceof ol.geom.MultiPolygon;

    // check query geometry (Polygon or MultiPolygon)
    if (is_poly && !has_coords && 'vector' === layer?.getType?.()) {
      features = layer.getIntersectedFeatures(geometry);
    } else if (is_poly && !has_coords && ol.layer.Vector === layer.constructor) {
      layer.getSource().getFeatures().forEach(f => {
        let add;
        switch (filterConfig.spatialMethod) {
          case 'within':     add = within(geometry, f.getGeometry());                      break;
          case 'intersects':
          default:           add = intersects(geometry, f.getGeometry());                  break;
        }
        if (true === add) {
          features.push(f);
        }
      });
    }

    return {
      features,
      layer
    };
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param ids
   * @param container
   * @param relationData
   * 
   * @since 4.1.0
   */
  showChart(ids, container, relationData) {
    this.emit('show-chart', ids, container, relationData);
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * @param container DOM element
   * 
   * @since 4.1.0
   */
  hideChart(container) {
    this.emit('hide-chart', container);
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param layer
   * @param feature
   * @param { Object } opts
   * @param opts.field
   * @param opts.values
   * @param opts.template
   * 
   * @since 4.1.0
   */
  async printAtlas(layer, feature, opts) {
    const emit = undefined !== opts;
    try {

      if (undefined === opts) {
        const atlas = this.#atlas.filter(a => a.atlas.qgs_layer_id === layer.id);
        let index;
        try {
          index = await this.prompt(_('Select Template'), atlas.map((atlas, i) => ({ value: i, label: atlas.name })) );
        } catch(e) {
          console.warn(e);
        }
        if (!index) {
          return;
        }
        let field = atlas?.[index]?.atlas?.field_name || '$id';
        opts = {
          field,
          values:   (feature ? [feature] : layer.features).map(feat => feat.attributes['$id' === field ? G3W_FID : field]),
          template: atlas?.[index]?.name,
        };
      }

      ApplicationState.download = true;
      this.setLoadingContent(true);

      let response = await fetch(ApplicationState.project.state.WMSUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body:  new URLSearchParams(await this.getPrintParams({
          SERVICE:     'WMS',
          VERSION:     '1.3.0',
          REQUEST:     'GetPrintAtlas',
          EXP_FILTER:  opts.field + (opts.values.length > 1 ? ' IN (' : '=') + (opts.values.map(v => `'${v}'`).join()) + (opts.values.length > 1 ? ')' : ''),
          TEMPLATE:    opts.template,
          filtertoken: ApplicationState.tokens.filtertoken,
          DOWNLOAD:    1,
        }) || {}).toString(),
      });

      if (!response.ok) {
        throw new Error(500 === response.status ? 'Internal Server Error' : 'Request Failed');
      }
        
      const url = URL.createObjectURL(await response.blob());
      response  = url && await fetch(url);

      if (!response?.ok) {
        throw (await response.json()).message;
      }

      saveBlob(await response.blob(), opts.template || (response.headers.get('content-disposition') || 'filename=g3w_download_file').split('filename=').at(1));
    } catch(e) {
      if (emit) {
        throw e;
      } else {
        this.showUserMessage({ type: 'alert', message: e || 'server_error', textMessage: !!e })
      }
    } finally {
      ApplicationState.download = false;
      this.setLoadingContent(false);
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Show layer relations
   * 
   * @param { Object } opts
   * @param opts.relation current relation (when omitted all relations all listed)
   * @param opts.layerId  current layer id
   * @param opts.feature  current feature
   * @param opts.push     whether to append relations to current content
   * 
   * @since 4.1.0
   */
  showRelations({
    relationId,
    layerId,
    feature,
    push = true
  } = {}) {
    const relation = relationId && ApplicationState.project.getRelationById(relationId);
    this.setContent({
      push,
      content: new Component({
        internalComponent: new (Vue.extend(require('components/Relations.vue').default))({
          relation,
          layerId,
          feature,
        })
      }),
      perc:        isMobile.any ? 100           : undefined,
      title:       relation     ? relation.name : getCatalogLayerById(layerId).getTitle(),
      // post_title:  relation     ? ''            : 'relations',
      text:        relation     ? true          : undefined,
      backonclose: relation     ? undefined     : true,
    });
  };

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Get id of the  feature
   *
   * @since 4.1.0
   */
  #getFid(feature, external) {
    return external ? feature.id : (feature.attributes[G3W_FID] || feature.id); // in case of query by geometry, features are returned without G3W_FID. They have id 
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * Add / Remove features from selection
   * 
   * ORIGINAL SOURCE: src/app/gui/queryresults/queryresultsservice.js@3.8.12::addToSelection
   * 
   * @param { * }                                  layer   queried layer instance
   * @param { * | 'inverse' | 'all' | 'paginate' } feature the feature or the status to be toggled (when ommitted: toggle all features)
   * @param { 'inverse' | 'all' | 'paginate' }     force   whether to force a particular state (for that feature)
   * 
   * @since 4.1.0
   */
  async toggleSelection(layer, feature, force) {

    // "feature" param can be omitted → parse it as "force" param
    if ('string' === typeof feature && undefined === force) {
      force   = feature;
      feature = undefined;
    }

    const action        = this.getActionLayerById({ layer, id: 'selection' }); //get selection action of layer result content)
    const index         = (layer.features || []).findIndex(f => f == feature); // find feature index when selection is set to single feature
    const toggled       = layer.features.every(f => f.selected); // check if all features are selected  
    const catalog_layer = layer.external ? layer : getCatalogLayerById(layer.id);
    const features      = [].concat(feature || layer.features || []);

    if (0 === features.length) {
      return console.warn('no features');
    }

    // inverse selection (all features)
    if ('inverse' === force) {
      catalog_layer.inverseSelection();
      layer.features.forEach(f => {
        f.selected = !f.selected;
        // update OL selection layer (on map)
        if (f.selected && f.geometry && !catalog_layer.getSelection().features[f.id]) {
          const feat = new ol.Feature(f.geometry instanceof ol.geom.Geometry ? f.geometry : (new ol.format.GeoJSON()).readGeometry(f.geometry));
          feat.setId(`${catalog_layer.getId()}_${f.id}`); // see: #777, prevent ID collision when selecting features from multiple layers
          feat.set(G3W_FID, feat.get(G3W_FID) ?? `${f.id}`); // ensure `G3W_FID` is always set
          Object.entries(f.attributes).forEach(([a, v]) => feat.set(a, v));
          catalog_layer.getSelection().features[f.id] = catalog_layer.getSelection().features[f.id] || {
            feature:  feat,
            selected: true
          };
        }
        //check if feature has geometry
        if (f.geometry) {
          this.defaultsLayers.selectionLayer.getSource()[f.selected ? 'addFeature' : 'removeFeature'](catalog_layer.getSelection().features[f.id].feature);
        }
      });
      catalog_layer.getSelection().active = layer.features.some(f => f.selected);
      return;
    }

    // toggle selection
    layer.features.forEach((f, i) => {
      if (!feature) {
        f.selected = !toggled;
        if (action) { action.state.toggled[i] = !toggled; }
      } else if (i === index) {
        f.selected = !f.selected;
        if (action) { action.state.toggled[i] = f.selected;}
      }
    });

    // handle pagination
    if (!layer.external && !feature && toggled && layer.filter.pagination) {
      await catalog_layer.clearSelectionFids();
      return;
    }

    // ensure "layer.selection.features" is defined
    layer.selection.features = layer.selection.features || [];

    // external layer (click on layer)
    if (layer.external && !feature) {
      // set selection to all features
      layer.selection.active = !toggled;
      layer.features.forEach(feature => {
        let feat       = layer.selection.features.find(f => feature.id === f.getId()); // check feature if has been already added to selection
        if (!feat) {
          feat = new ol.Feature(feature.geometry);
          feat.setId(feature.id);
          Object.keys(feature.attributes).forEach(attr => feat.set(attr, feature.attributes[attr]));
          layer.selection.features.push(
            Object.assign(feat, {
            __layerId: layer.id,
            selection: { selected: layer.selection.active },
          }));
        }
        // set current selection selected attribute
        feat.selected = layer.selection.active;
        // add/remove to selection
        if (layer.selection.active) {
          this.defaultsLayers.selectionLayer.getSource().addFeature(feat);
        } else {
          this.defaultsLayers.selectionLayer.getSource().removeFeature(feat);
        }
      });
    
      return;
    }

    // external layer (click on feature)
    if (layer.external && feature) {
      let feat = catalog_layer.selection.features.find(f => feature.id === f.getId()); // check feature if has been already added to selection
      if (feat) {
        feat.selected = action.state.toggled[index];
      }
      // create selection feature for external if not yet added
      if (!feat) {
        feat = new ol.Feature(feature.geometry);
        feat.setId(feature.id); 
        Object.keys(feature.attributes).forEach(attr => feat.set(attr, feature.attributes[attr]));
        // add feature to selection layer features
        catalog_layer.selection.features.push(
            Object.assign(feat, {
            __layerId: catalog_layer.id,
            selected:  true , // NB: default true because otherwise it means that is clicked on selection
          })
        );
      }

      // add/remove to selection
      if (feat.selected) {
        this.defaultsLayers.selectionLayer.getSource().addFeature(feat);
      } else {
        this.defaultsLayers.selectionLayer.getSource().removeFeature(feat);
      }

      // set selection property (external layer)
      catalog_layer.selection.active = catalog_layer.selection.features.some(f => f.selection.selected);
      
      return;
    }

    // get fids (unique id) of features
    const fids = (features || []).map(f => f.attributes[G3W_FID] || f.id);


    fids.forEach((fid, i) => {
      const is_selected = catalog_layer.state.filter.active || catalog_layer.isSelected(fid);
      // update OL selection layer (on map)
      if (!is_selected && features[i]?.geometry && !catalog_layer.getSelection().features[fid]) {
        const f = new ol.Feature(features[i].geometry instanceof ol.geom.Geometry ? features[i].geometry : (new ol.format.GeoJSON()).readGeometry(features[i].geometry));
        f.setId(`${catalog_layer.getId()}_${fid}`);          // see: #777, prevent ID collision when selecting features from multiple layers
        f.set(G3W_FID, f.get(G3W_FID) ?? `${fid}`); // ensure `G3W_FID` is always set
        Object.entries(features[i].attributes).forEach(([a, v]) => f.set(a, v));
        catalog_layer.getSelection().features[fid] = catalog_layer.getSelection().features[fid] || {
          feature:  f,
          selected: true
        };
      }
      // exclude / remove
      if ((feature && is_selected) || (!feature && toggled)) {
        catalog_layer.fidsOut(fid, !!feature);
      }
      // include / add
      if ((feature && !is_selected) || (!feature && !toggled && !is_selected)) {
        catalog_layer.fidsIn(fid, !!feature);
      }
    });

    // set layer selection state

    // PROJECT LAYER and not all toggled
    if (catalog_layer.state.filter.active && !toggled) {
      fids.forEach((_, idx) => {
        // index of feature to remove
        const i = feature ? index : idx;
        layer.features.splice(i, 1);
        // delete related action
        delete action.state.toggled[i];
        // reset toggled state 
        action.state.toggled = Object.entries(action.state.toggled).reduce((a, t, i) => Object.assign(a, { [i]: t }), {});
      });
    }

    //set selection state of layer true if some feature is selected
    catalog_layer.getSelection().active = layer.features.some(f => f.selected) || catalog_layer.state.selection.fids.size > 0;

    // remove Highlight geometry layer fetures
    this.highlight(false);
    
    // PROJECT LAYER - In case of single layer and no features, remove layer
    if (1 === this.state.queried_layers.length && !this.state.queried_layers[0].features.length) {
      this.state.queried_layers.splice(0);
    }

  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * 
   * @since 4.1.0 
   */
  #setRelationField(node) {
    if (node.nodes) {
      for (const _node of node.nodes) {
        this.#setRelationField(_node);
      }
    } else if (node.name) {
      node.relation = true;
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * show spinner layers
   *
   * @since 4.1.0
   */
  onLayerLoadStart() {
    if (0 === this.#loading) {
      this.emit('loadstart');
      this.showSpinner({ container: '#map-spinner', id: 'maploadspinner', style: 'transparent' });
    }
    this.#loading += 1;
    }
  
  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  onLayerLoadEnd() {
    this.#loading -= 1;
    if (0 === this.#loading) {
      this.emit('loadend');
      this.hideSpinner('maploadspinner');
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  onLayerLoadError() {
    /** @since 4.1.0 - notify warning */
    if (ApplicationState.project.state.show_load_layer_error && !this.onLayerLoadError.shown) {
      this.showUserMessage({ type: 'warning', message: 'Some layers are not available' });
      this.onLayerLoadError.shown = true;
    }
    //Need to set layer in load end state
    this.onLayerLoadEnd();
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * Used by the following plugins: "cdu"
   * 
   * @since 4.1.0
   */
  removeHideMap(id) {
    const i = (this.state.hidemaps || []).findIndex(m => id === m.id);
    if (-1 !== i) {
      this.state.hidemaps.splice(i, 1);
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * Used by the following plugins: "cdu", "archiweb"
   * 
   * @since 4.1.0
   */
  createMapImage({ map } = {}) {
    return new Promise((resolve) => {
      const canvas  = (map || this.getMap()).getViewport().querySelector('canvas');
      const dpr     = window.devicePixelRatio || 1;
      const sidebar = document.querySelector('.main-sidebar');
      const padding = (this.isSidebarVisible() && sidebar) ? Math.round(sidebar.getBoundingClientRect().width * dpr) : 0;

      const w       = Math.max(canvas.width - padding, 0);
      const h       = canvas.height;
      const cropped = Object.assign(document.createElement('canvas'), { width: w, height: h });
      
      cropped.getContext('2d').drawImage(canvas, padding, 0, w, h, 0, 0, w, h);
      cropped.toBlob(resolve);
    });
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  getProject() {
    return ApplicationState.project;
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  getMap() {
    try {
      return this.#map;
    } catch(e) {
      console.warn(e);
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  getProjection() {
    return ApplicationState.project.getProjection();
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  isMapHidden() {
    return this.state.hidden;
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  getCrs() {
    return ApplicationState.project.getProjection().getCode();
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  getViewport() {
    return this.#map.getViewport();
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  getResolution() {
    return this.#map.getView().getResolution();
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  getEpsg() {
    return this.#map.getView().getProjection().getCode();
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * Show Marker on a map
   * 
   * @param coordinates
   * @param duration
   * 
   * @since 4.1.0
   */
  showMarker(coordinates, duration = 1000) {
    this.#marker.setPosition(coordinates);
    setTimeout(() => this.#marker.setPosition(), duration);
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @returns layer by name
   * 
   * @since 4.1.0
   */
  getLayerByName(name) {
    return this.getMap().getLayers().getArray().find(l => name === l.get('name'));
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @returns layer by id
   * 
   * @since 4.1.0
   */
  getLayerById(id) {
    return this.getMap().getLayers().getArray().find(l => id === l.get('id'));
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * Used by the following plugins: "strees"
   * 
   * get all features from vector layer based on coordinates
   * 
   * @since 4.1.0
   */
  getVectorLayerFeaturesFromCoordinates(layerId, coordinates) {
    let intersectGeom;
    let features      = [];
    const map         = this.getMap();
    const vectorLayer = this.getLayerById(layerId);
    if (Array.isArray(coordinates)) {
      if (2 === coordinates.length) {
        const pixel = map.getPixelFromCoordinate(coordinates);
        map.forEachFeatureAtPixel(pixel,
          feature => features.push(feature),
          { layerFilter(layer) { return layer === vectorLayer; }
        });
      } else if (4 === coordinates.length) {
        intersectGeom = ol.geom.Polygon.fromExtent(coordinates);
        if ('vector' === vectorLayer?.getType?.()) {
          features = vectorLayer.getIntersectedFeatures(intersectGeom);
        } else if (ol.layer.Vector === vectorLayer.constructor) {
          vectorLayer.getSource().getFeatures()
            .forEach(f => intersectGeom.intersectsExtent(f.getGeometry().getExtent()) && features.push(f))
        }
      }
    } else if (coordinates instanceof ol.geom.Polygon || coordinates instanceof ol.geom.MultiPolygon) {
      intersectGeom = coordinates;
      if ('vector' === vectorLayer?.getType?.()) {
        features = vectorLayer.getIntersectedFeatures(intersectGeom);
      } else if (ol.layer.Vector === vectorLayer.constructor) {
        vectorLayer
          .getSource()
          .getFeatures()
          .forEach(f => intersectGeom.intersectsExtent(feature.getGeometry().getExtent()) && features.push(f))
      }
    }
    return features;
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * Used by the following plugins: "cdu"
   * 
   * @since 4.1.0
   */
  getQueryLayerByCoordinates({ layer, coordinates } = {}) {
    return new Promise((resolve, reject) => {
      layer.query({
        coordinates,
        mapProjection: this.getProjection(),
        resolution:    this.getResolution(),
      })
      .then((response) => resolve(response))
      .catch(e => { console.warn(e); reject(e); })
    })
  }

  //setup controls
  /*
    layout : {
      lv: <options> h : horizontal (default), v vertical
      lh: <options> h: horizontal: v vertical (default)
    }
  */

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  createMapControl(type, {
    id,
    add     = true,
    options = {},
  } = {}) {
    // BACKCOMP v3.x
    if ('string' !== typeof type) {
      id           = type.id;
      add          = type.add ?? true;
      options      = type.options ?? {};
      type         = id;
    }
    const control = new MapControl({ name: id, ...options });
    this.addControl(id || type, control, add);
    return control;
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  showAddLayerModal() {
    $('#modal-addlayer').modal('show');
    this.emit('addexternallayer');
  }

  /**
   * @since 4.1.0
   */
  showLegendPanel() {
    this.showSidebar();
    new Panel({
      id:           'legend-panel',
      title:        'legend',
      internalPanel: new (Vue.extend({
        template: /* html */`
        <div id = "legend-panel">
          <figure
            v-for  = "url in legendurls"
            :key   = "url.url"
            style  = "padding-bottom:5px; border-bottom: 1px solid #eee;"
            :style = "{ backgroundColor: backgroundLegend }"
          >
            <bar-loader :loading = "url.loading" />
            <img
              v-show = "!url.loading && !url.error"
              :src   = "url.url"
              @error = "onLegendError(url)"
              @load  = "onLegendLoad(url)"
              alt    = ""
            />
          </figure>
        </div>
        `,
        data: () => ({
          legendurls:       [],
          backgroundLegend: ApplicationState.layout.app?.legend?.transparent ? 'transparent' : '#FFF',
        }),
        methods: {
          onLegendError(url) {
            url.error   = true;
            url.loading = false;
          },
          onLegendLoad(url) {
            url.loading = false;
          },
          async setLegendUrls() {
            this.legendurls = await g3w.app.getLegendSrc({ layertitle: true }); 
          },
          
        },
        async mounted() {
          await this.setLegendUrls();
          
          if (ApplicationState.project.state.context_base_legend) {
            g3w.app.on('change-map-legend-params', this.setLegendUrls);
          }
          
        },
        beforeDestroy() {
          // automatically hide sidebar on mobile
          if (window.innerWidth < 767) {
            g3w.app.hideSidebar();
          }
          if (ApplicationState.project.state.context_base_legend) {
            g3w.app.off('change-map-legend-params', this.setLegendUrls );
          }
        },
      }))(),
      show: true
    });
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  getCenter() {
    return this.getMap().getView().getCenter();
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   *
   * @since 4.1.0
   */
  getMapExtent() {
    return this.getMap().getView().calculateExtent(this.getMap().getSize());
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @param url
   * @param epsg cordinate referece system (since 3.8.0)
   *
   * @returns {string}
   * 
   * @since 4.1.0
   */
  async addMapExtentUrlParameterToUrl(url, epsg) {
    url = new URL(url);
    const changed = undefined !== epsg && epsg !== this.getEpsg();
    if (changed) {
      await ApplicationState.projections.set(epsg);
    }
    url.searchParams.set(
      'map_extent',
      (
        changed
          ? ol.proj.transformExtent(this.getMapExtent(), this.getEpsg(), epsg)
          : this.getMapExtent()
      ).toString()
    )
    return url.toString()
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   *
   * @since 4.1.0
   */
  getMapControl(type) {
    // BACKOMP v3.x
    if ("string" !== typeof type) {
      type = type.type;
    }
    return (this.#controls.find(c => type === c.type) || {}).control;
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   *
   * @param id
   * @param type
   * @param control
   * @param addToMapControls
   * @param visible
   * 
   * @since 4.1.0
   */
  addControl(id, type, control, addToMapControls = true, visible = control?.isVisible?.() ?? true) {

    // BACKCOMP v3.x
    if ('string' !== typeof type ) {
      [id, type, control, addToMapControls, visible] = [id, id, type, control ?? true, addToMapControls ?? true];
    }

    this.#map.addControl(control);

    control.on('toggled', e => this.emit('mapcontrol:toggled', e));

    this.#controls.push({ id, type, control, visible, mapcontrol: addToMapControls && visible });

    control.on('controlclick', ({ target: mapcontrol }) => {
      const clickmap = !!(mapcontrol.isClickMap && mapcontrol.isClickMap());
      if (clickmap) {
        this.#interactions.forEach(int => int.setActive(false));
      }
      this.controlClick(mapcontrol, { clickmap })
    });

    control.element?.querySelector('button')?.setAttribute('data-placement', 'left');

    if (addToMapControls && !visible) {
      control.element.style.display = "none";
    }

    if (addToMapControls) {
      document.querySelector('.g3w-map-controls').append(control.element);
    }

    if (false === control.offline) {
      this.#offlineids.push({ id: type, enable: control.getEnable() });
    }

    if (false === control.offline && control.getEnable()) {
      control.setEnable(ApplicationState.online);
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   *
   * @since 4.1.0
   */
  getMapControls() {
    return this.#controls;
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   *
   * @since 4.1.0
   */
  deactiveMapControls() {
    this.#controls.forEach(c => c.control?.isToggled?.() && c.control.toggle(false));
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * Method to disable
   *#layers
   * @since 4.1.0
   */
  disableClickMapControls(bool = true) {
    this.getMap().set('can_show_context_menu', !bool);
    this.#controls
      .filter(c => c.control?.isClickMap?.())
      .forEach(c => {
        c.control.isToggled() && c.control.toggle();
        c.control[bool ? 'disable' : 'enable']();
    })
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  _setLegendParams(bool = true) {
    if (bool) {
      const map  = this.getMap();
      const size = (map && map.getSize().filter(v => v > 0)) || null;
      const bbox = size && 2 === size.length ? map.getView().calculateExtent(size) : ApplicationState.project.state.initextent;
      this.#layers.g3w.forEach(l => {
        if(!l.isXYZ()) {
          l.setCustomParams({
            crs: this.getEpsg(),
            // in the case of axis orientation inverted if it needs to invert the axis
            bbox: "neu" === map.getView().getProjection().getAxisOrientation()  ? [bbox[1], bbox[0], bbox[3], bbox[2]] : bbox,
          });
        }
      });
      this.emit('change-map-legend-params');
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  getMapUnits() {
    return this.state.mapUnits;
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * Used by the following plugins: "cdu"
   * 
   * @since 4.1.0
   */
  addHideMap({ layers=[] } = {}) {
    const MAP = {
      id: `hidemap_${Date.now()}`,
      map: null,
    };
    this.state.hidemaps.push(MAP);
    // create Map
    Vue.nextTick().then(async () => {
      MAP.map = new ol.Map({
        controls:            ol.control.defaults({ attribution: false, zoom: false }),
        interactions:        ol.interaction.defaults(),
        view:                new ol.View({
          projection: this.getMap().getView().getProjection(),
          center:     this.getMap().getView().getCenter(),
          resolution: this.getMap().getView().getResolution()
        }),
        keyboardEventTarget: document,
        target:              MAP.id,
      });
      layers.forEach(l => MAP.map.addLayer(l));
    });
    return MAP;
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  setHidden(bool) {
    this.state.hidden = bool;
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  controlClick(mapcontrol, info = {}) {}

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * called when an external layer is loaded
   * 
   * @since 4.1.0
   */
  loadExternalLayer(layer) {} 

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  unloadExternalLayer(layer) {}

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * remove all events of layersStore
   * 
   * @since 4.1.0
   */
  #removeEventsKeysToLayersStore(store) {
    const id = store.getId();
    if (this.#events.stores[id]) {
      this.#events.stores[id].forEach(evt => { Object.entries(evt).forEach(([event, key]) => store.un(event, key)); });
      delete this.#events.stores[id];
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * register all events of layersStore and relative keys
   * 
   * @since 4.1.0
   */
  #setUpEventsKeysToLayersStore(store) {
    const id = store.getId();
    // check if already store a key of events
    this.#events.stores[id] = [];

    //In the case of store that has layers @since 3.10.0
    store.getLayers().forEach(l => {
      if ('vector' === l.getType()) {
        const olLayer = l.getOLLayer();
        if (olLayer) {
          this.getMap().addLayer(olLayer);
        }
      }
    });

    this.#events.stores[id].push({
      addLayer: store.onafter('addLayer', l => {
      if ('vector' === l.getType()) {
        const olLayer = l.getOLLayer();
        if (olLayer) {
          this.getMap().addLayer(olLayer);
        }
      }
    }),
    });
    this.#events.stores[id].push({
      removeLayer: store.onafter('removeLayer', l => { 'vector' === l.getType() && this.#map.removeLayer(l.getOLLayer()) }),
    });
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  removeLayers() {
    this.#layers.base.forEach(l => this.#map.removeLayer(l.getOLLayer()))
    this.#layers.g3w.forEach(l => {
      l.un('loadstart', this.onLayerLoadStart);
      l.un('loadend',   this.onLayerLoadEnd);
      l.un('loaderror', this.onLayerLoadError);
      this.#map.removeLayer(l.getOLLayer());
    });
    this.#layers.g3w.splice(0);
    this.#layers.external.forEach(layer => this.removeExternalLayer(layer.get('name')));
    this.#layers.external.splice(0);
    this.defaultsLayers.mapcenter     .getSource().clear();
    this.defaultsLayers.highlightLayer.getSource().clear();
    this.defaultsLayers.selectionLayer.getSource().clear();
    this.getMap().removeLayer(this.defaultsLayers.mapcenter);
    this.getMap().removeLayer(this.defaultsLayers.highlightLayer);
    this.getMap().removeLayer(this.defaultsLayers.selectionLayer);
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * set ad increase layerIndex
   * 
   * @since 4.1.0
   */
  setLayerZIndex({ layer, zindex = this.layersCount+=1 }) {
    //@since 3.11.0 For editing purpose, need to be set on top (add 1000)
    zindex = zindex + (layer.get('__g3w_editable') ? 1000 : 0)
    layer.setZIndex(zindex);
    this.emit('set-layer-zindex', { layer, zindex });
    return zindex;
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * Used by the following plugins: "cdu"
   * 
   * @since 4.1.0
   */
  createMapLayer(layer) {
    let mapLayer = layer;

    // Raster Layer
    if (layer.isRaster()) {
      mapLayer = this.#layers.g3w.find(l => layer.id === l.id) || new g3w.Layer(layer);
    }

    mapLayer.addLayer(layer);
    return mapLayer;
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * Used by the following plugins: "qtimeseries"
   *
   * Update MapLayer
   *
   * @param layer
   * @param options
   * @param options.force
   * @param options.layerId in case of filtertoken change on a single layer of TOC
   * @param { Boolean } showSpinner show or not spinner
   * 
   * @since 4.1.0
   */
  updateMapLayer(layer, options = { force: false }, { showSpinner = true } = {}) {

    if (layer?.isVector?.()) {
      return;
    }

    if (layer?.isBaseLayer?.()) {
      layer.update(this.state);
      return;
    }

    // if force to add g3w_time parameter to force request of map layer from server
    if (options.force) {
      options.g3w_time = Date.now();
    }

    if (showSpinner !== layer.showSpinner) {
      layer.showSpinner = showSpinner;
      if (showSpinner) {
        layer.on('loadstart', this.onLayerLoadStart);
        layer.on('loadend',   this.onLayerLoadEnd);
        layer.on('loaderror', this.onLayerLoadError);
      } else {
        layer.off('loadstart', this.onLayerLoadStart);
        layer.off('loadend',   this.onLayerLoadEnd);
        layer.off('loaderror', this.onLayerLoadError);
      }
    }

    layer.update(this.state, options);
    return layer;
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  getCurrentToggledMapControl() {
    return this.#controls.find(c => c?.control?.isToggled?.())?.control;
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * close: param to close eventually right content open
   * @param interaction
   * @param options is an object contain: {
   *   active: If set new interaction active or not
   *   active: If set new interaction active or not
   *   close: if eventually close GUI Content (es. result right content)
   * }
   * return object having current toggled control if there is a toggled mapcontrol
   * 
   * @since 4.1.0
   */
  addInteraction(interaction, options = { active:true, close:true }) {
    const { active = true }   = options;
    const control             = this.getCurrentToggledMapControl();
    const toggled             = control && control.isToggled && control.isToggled() || false;
    const untoggleMapControls = control && control.isClickMap ? control.isClickMap() : true;
    if (untoggleMapControls && active) {
      this.#controls.forEach(c => {
        if (c.control?.isToggled?.()) {
          c.control.toggle(false);
          if (false !== options.close) {
            this.closeContent();
          }
        }
      });
    }
    this.getMap().addInteraction(interaction);
    interaction.setActive(active);
    this.#interactions.push(interaction);
    return {
      control,
      toggled// return current toggled map control if toggled
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  removeInteraction(interaction) {
    if (interaction) {
      interaction.setActive(false);
    }
    this.#map.removeInteraction(interaction);
    this.#interactions = this.#interactions.filter(_interaction => interaction !== _interaction);
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  #watchInteraction(interaction) {
    interaction.on('change:active', e => {
      if ((e.target instanceof ol.interaction.Pointer) && e.target.getActive()) {
        this.emit('mapcontrol:active', e.target);
      }
    })
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * Used by the following plugins: "qtimeseries"
   *
   * Show map Info
   * 
   * @param info
   * 
   * @since 4.1.0
   */
  showMapInfo({ info, style } = {}) {
    this.state.map_info = info;
    this.state.map_style = style || this.state.map_style;
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @param { ol.geom.Geometry | Object | false } geom
   * @param { string } geom.id
   * @param { Object } options
   * @param { boolean } options.feature
   * @param { boolean } options.zoom
   * @param { boolean } options.highlight
   * @param options.style
   * @param options.color
   *
   * @returns { Promise<any> }
   * 
   * @since 4.1.0
   */
  async highlight(geom, options = {}) {
    
    // reset highlighted geometries
    if (false === geom) {
      if (!this.#highlighting) {
        this.defaultsLayers.highlightLayer.getSource().clear();
      }
      return;
    }

    if (options.geometry) {
      return this.highlight(options.geometry, { layerId: geom.id, zoom: false, duration: Infinity });
    }

    const hide      = 'function' === typeof options.hide      ? options.hide      : null;
    const highlight = 'boolean' === typeof options.highlight  ? options.highlight : true;
    const zoom      = 'boolean' === typeof options.zoom       ? options.zoom      : true;
    const duration  = options.duration ?? 2000;
    let geometry    = geom instanceof ol.geom.Geometry ? geom       : (new ol.format.GeoJSON()).readGeometry(geom);

    this.highlight(false);

    if (zoom) {
      await this.zoomToExtent(geometry.getExtent());
    }

    if (!highlight) {
      return;
    }

    if (options.style) {
      this.defaultsLayers.highlightLayer.setStyle(options.style);
    }

    this.defaultsLayers.highlightLayer.getSource().addFeature(new ol.Feature({ geometry }));

    return new Promise(async resolve => {

      const cb = () => {
        this.defaultsLayers.highlightLayer.getSource().clear();
        // set default style
        if (options.style) {
          this.defaultsLayers.highlightLayer.setStyle(feat => {
            const color = options.color;
            const type = feat.getGeometry().getType();
            if (['Point', 'MultiPoint'].includes(type)) {
              return new ol.style.Style({ image: new ol.style.Circle({ radius: 6, fill: new ol.style.Fill({ color }) }), zIndex: Infinity });
            }
            if (['LineString', 'MultiLineString'].includes(type)) {
              return new ol.style.Style({ stroke: new ol.style.Stroke({ color, width: 4 }) });
            }
            if (['Polygon', 'MultiPolygon'].includes(type)) {
              return new ol.style.Style({ stroke: new ol.style.Stroke({ color, width: 4 }), fill: new ol.style.Fill({ color: ol.color.asString([...ol.color.asArray(color)].splice(0, 3).concat(.25)) }) /* force rgba color transparency (alpha = .25) */ });
            }
          });
        }
        if (!hide) {
          this.#highlighting = false;
        }
        resolve();
      }

      if (hide) {
        hide(cb);
      }

      if (duration !== Infinity && !hide) {
        this.#highlighting = true;
        setTimeout(cb, duration);
      }

    });
  }

  /**
   * ORIGINAL SOURCE: src/services/queryresults.js@v4.0.0
   *
   * @param layer
   * @param options
   * 
   * @since 4.1.0
   */
  zoomToLayer(layer, options = {}) {
    options.highlight = !this.isOneLayerResult();
    const async       = document.querySelector('#g3w-content')?.classList?.contains?.('full-size');
    const features    = (layer.features || []).filter(f => this.showFeature(layer, f));
    this.once('asyncFnc.todo', () => { this.zoomToFeatures(features, options); });
    if (async) {
      this.closeContent();
    } else {
      this.emit('asyncFnc.todo');
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   *
   * Zoom to Feature ID 
   * 
   * @since 4.1.0
   */
  async #zoomToFid(zoom_to_fid = '', separator = '|') {
    const [layerId, fid] = zoom_to_fid.split(separator);

    if (undefined === layerId && undefined === fid) {
      return;
    }

    const layer = ApplicationState.project.getLayerById(layerId);

    const { data = [] } = await this.getData('search:fids', {
      inputs: {
        layer,
        fids:  [fid],
        formatter: 1,
      },
      outputs: {
        show: {
          loading: false,
          async condition({ data = [] } = {}) {
            if (layer.isEditable()) {
              await waitFor(() => undefined !== layer.config.editing);
            }
            return !!(data[0] && data[0].features.length > 0);
          }
        }
      }
    });

    if (data?.at(0)?.features?.at(0)) {
      await this.zoomToFeatures([data?.at(0)?.features?.at(0)]);
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   *
   * Handle ztf url parameter
   * 
   * @param zoom_to_features
   * 
   * @since 4.1.0
   */
  async #zoomToFeaturesUrl(zoom_to_features = '') {
    try {
      const [id, filter] = zoom_to_features.split(':');

      if (!id || !filter) {
        return;
      }

      // find project layer
      const pLayer = ApplicationState.project.getLayers().find(l =>
        id === l.id ||
        id === l.name ||
        id === l.origname
      );

      const layer = pLayer && ApplicationState.project.getLayerById(pLayer.id);

      const r = pLayer && await this.getData('search:features', {
        inputs: {
          layer,
          filter: createFilterFromString({ layer, filter }),
        },
        outputs: {
          show: {
            loading: false,
            async condition({ data = [] } = {}) {
              if (layer.isEditable()) {
                await waitFor(() => undefined !== layer.config.editing);
              }
              return (data?.at(0)?.features ?? []).length > 0;
            }
          }
        }
      });

      if (r?.data?.at(0)?.features) {
        this.zoomToFeatures(r?.data?.at(0)?.features);
      }
    } catch(e) {
      console.warn(e);
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  zoomToFeatures(features = [], options = { highlight: false }) {
    features = features || [];

    let extent, gtype, geometry;
    const coordinates = features
      .filter(f => f.getGeometry?.() ?? f.geometry)
      .map(f => {
        const geom       = f.getGeometry?.() ?? f.geometry;
        const is_ol_geom = geom instanceof ol.geom.Geometry;
        const f_ext      = is_ol_geom ? [...geom.getExtent()] : f.bbox;
        extent           = ol.extent.extend(undefined === extent ? f_ext : extent, f_ext);
        gtype            = gtype ? gtype : is_ol_geom ? geom.getType() : geom.type;
        return ( is_ol_geom ? geom.getCoordinates() : geom.coordinates );
      });

    //check if features have geometry
    if (coordinates.length > 0) {
      const is_multi = gtype.includes('Multi');
      try {
        geometry = new ol.geom[is_multi ? gtype : `Multi${gtype}`](is_multi ? coordinates.flat(): coordinates);
        extent   = extent ?? geometry.getExtent();
      } catch(e) {
        console.warn(e);
      }
    }

    if (options.highlight && extent) {
      options.highLightGeometry = geometry;
    }

    return this.zoomToExtent(extent, options);
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @param   { ol.extent }   extent
   * @param   { Object }      options
   * @param   { boolean }     options.force
   * @param   { ol.geometry } options.highLightGeometry
   *
   * @returns { Promise<void> }
   * 
   * @since 4.1.0
   */
  async zoomToExtent(extent, options = {}) {

    if (!extent) {
      return Promise.resolve();
    }

    const map     = this.getMap();
    const view    = map.getView();
    const mapSize = map.getSize();

    
    let resolution;

    // if outside project extent, return max resolution
    if (false === ol.extent.containsExtent(ApplicationState.project.state.extent, extent)) {
      resolution = view.getResolutionForExtent(ApplicationState.project.state.extent, mapSize);
    }

    // retrieve resolution from given `extent`
    else if (true === options.force) {
      resolution = view.getResolutionForExtent(extent, mapSize); // resolution of request extent
    }

    // calculate main resolutions from map
    else {
      const curr = view.getResolution();
      // max resolution of the map
      resolution = Math.max(view.getResolutionForExtent(extent, mapSize), getResolutionFromScale(this.#maxZoom, this.getMapUnits()));
      resolution = (curr < resolution) && (curr > resolution) ? curr : resolution;
    }
  
    await (new Promise(done => {
      view.once('change:center', () => setTimeout(done, 500));
      view.fit(extent, { duration: 200, minResolution: resolution });
    }));

    if (options.highLightGeometry) {
      await this.highlight(options.highLightGeometry, { zoom: false, duration: options.duration });
    }

  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * Force to referesh a map
   * 
   * Used by the following plugins: "editing"
   * 
   * @param options
   * 
   * @since 4.1.0
   */
  refreshMap() {
    this.#layers.g3w.concat(this.#layers.base).forEach(l => this.updateMapLayer(l, { force: true }));
  }

  async #initMap({ padding }) {

    const width  = document.querySelector('#app').getBoundingClientRect().width;
    const height = window.innerHeight - document.querySelector('.navbar').offsetHeight;

    this.emit('before:setupViewer');

    if (0 === width || 0 === height) {
      console.warn('[G3W-CLIENT] map was hidden during bootstrap');
      return;
    }

    const search = new URLSearchParams(location.search); // search params

    const showmarker       = 1 * (search.get('showmarker') || 0); /** @since 3.10.0 - [0|1] whether to show marker on map center */
    const iframetype       = search.get('iframetype');            /** @since 3.10.0 - [map] whether to hide map controls */
    const zoom_to_fid      = search.get('zoom_to_fid');
    const zoom_to_features = search.get('ztf');                   // zoom to features
    const map_extent       = search.get('map_extent');            /** @since 3.10.0  - whether to use a custom initextent */
    const coords           = {
      lat: parseFloat(search.get('lat')),
      lon: parseFloat(search.get('lon')),
      x:   parseFloat(search.get('x')),
      y:   parseFloat(search.get('y')),
      z:   parseInt(search.get('z')), /**@since 4.1.0 zoom  */
    };

    // remove some params from URL
    const url = new URL(window.location);
    ['zoom_to_fid', 'ztf'].forEach(s => url.searchParams.delete(s));
    window.history.replaceState(null, null, url);

    // destroy previous map
    if (this.#map) {
      this.#map.dispose();
      this.#map = null
    }

    const initextent = map_extent?.split?.(',').map(coord => 1 * coord) ?? ApplicationState.project.state.initextent;
    const extent     = ApplicationState.project.state.extent;

    this.#map = new ol.Map({
      controls:            ol.control.defaults({ attribution: false, zoom: false, rotateOptions: { autoHide: true, tipLabel: "Reset rotation (CTRL+DRAG to rotate)" } }),
      interactions:        ol.interaction.defaults().extend([ new ol.interaction.DragRotate({ condition: ol.events.condition.platformModifierKeyOnly, }) ]),
      keyboardEventTarget: document,
      target:              'map',
      view:                new ol.View({
        padding,
        extent,
        projection:    this.getProjection(),
        center:        ol.extent.getCenter(initextent),
        resolution:    Math.max(ol.extent.getWidth(initextent) / width, ol.extent.getHeight(initextent) / height), // max(xInitRes, yInitRes)
      }),
    });

    //set application epsg and map unit
    ApplicationState.map_epsg = this.getEpsg();
    ApplicationState.map_unit = this.#map.getView().getProjection().getUnits();

    // disable douclickzoom
    this.#map.getInteractions().getArray().find(i => i instanceof ol.interaction.DoubleClickZoom).setActive(false);

    // visual click (sonar effect)
    this.#map.on('click', ({ coordinate }) => {
      const circle = new ol.layer.Vector({
        source: new ol.source.Vector({ features: [ new ol.Feature({ geometry: new ol.geom.Point(coordinate) }) ] }),
        style:  new ol.style.Style()
      });
      const start    = +new Date();
      const duration = 1700;
      const interval = this.#map.on('postcompose', ({ frameState }) => {
        const elapsed  = frameState.time - start;
        const ratio   = ol.easing.easeOut(elapsed / duration);
        circle.setStyle(
          new ol.style.Style({
            image: new ol.style.Circle({
              radius: 40 * ratio, // start = 0, end = 40
              fill:   new ol.style.Fill({ color: [225, 227, 228, .1] }),
              stroke: new ol.style.Stroke({ color: [225, 227, 228, 1], width: 1.85 * (1 - ratio) }), // start = 1.85, end = 0
            })
          })
        );
        if (elapsed > duration) {
          this.#map.removeLayer(circle);
          ol.Observable.unByKey(interval); // stop the effect
        }
      });
      this.#map.addLayer(circle);
    });

    let currentControl;
    let can_drag = false;

    // set mouse cursor (dragging)
    Vue.watch(
      () => [this.getCurrentToggledMapControl(), (this.getPlugin('editing') && this.getPlugin('editing').getActiveTool())],
      ([control, activeTool]) => {
        currentControl = control
        can_drag       = !control && !activeTool;
        this.#map.getViewport().classList.toggle('ol-grab', can_drag);
        this.#map.getInteractions().getArray().find(i => i instanceof ol.interaction.DoubleClickZoom).setActive(can_drag);
      }
    );
    this.#map.on(['pointerdrag', 'pointerup'], (e) => {
      /** @TODO disable default interaction "shift+zoom" ? */
      this.#map.getViewport().classList.toggle('ol-grabbing', e.type == 'pointerdrag' && (!currentControl || !(currentControl.getInteraction() instanceof ol.interaction.DragBox)));
      this.#map.getViewport().classList.toggle('ol-grab',     e.type == 'pointerup'   && can_drag);
    });

    let geom;
    if (zoom_to_fid) {
      await this.#zoomToFid(zoom_to_fid);
    } else if (zoom_to_features) {
      await this.#zoomToFeaturesUrl(zoom_to_features);
    } else if (!isNaN(coords.lat) && !isNaN(coords.lon)) {
      geom = new ol.geom.Point(ol.proj.transform([coords.lon, coords.lat], 'EPSG:4326', this.getEpsg()));
    } else if (!isNaN(coords.x) && !isNaN(coords.y)) {
      geom = new ol.geom.Point([coords.x, coords.y]);
    }

    //check if zoom is set
    if (geom && isNaN(coords.z) && geom.getExtent()) {
      this.zoomToExtent(geom.getExtent());
    }

    /** @since 4.1.0 if set zoom, zoom to zoom set according to project extent constraint */
    if (geom && !isNaN(coords.z)) {
      this.getMap().getView().setCenter(geom.getCoordinates());
      this.getMap().getView().setZoom(coords.z);
    }

    // show marker on map center
    if (1 === showmarker) {
      this.defaultsLayers.mapcenter.getSource().addFeature(new ol.Feature({ geometry: new ol.geom.Point(this.getCenter()) }))
    }

    // iframe → hide map controls (empty object)
    if ('map' === iframetype) {
      window.initConfig.mapcontrols = {};
    }

    // update max scale
    this.#maxZoom = Math.min(
      getScaleFromResolution(this.getMap().getView().getResolutionForExtent(ApplicationState.project.state.initextent, this.getMap().getSize()), this.getMapUnits()),
      this.#maxZoom
    );

    this.state.size     = this.#map.getSize();
    this.state.mapUnits = this.#map.getView().getProjection().getUnits();

    if (window.initConfig.background_color) {
      document.querySelector('.ol-viewport').style.backgroundColor = window.initConfig.background_color;
    }

    this.#map.getViewport().insertAdjacentHTML(
      'afterbegin',
      /* html */`<div id="map-spinner" style="position:absolute; top: 50%; right: 50%; z-index: 1;"></div>`
    );

    this.#map.getInteractions().forEach(int => this.#watchInteraction(int));
    this.#map.getInteractions().on('add', int => this.#watchInteraction(int.element));

    this.#marker = new ol.Overlay({
      position:    null,
      positioning: 'center-center',
      element:     document.getElementById('marker'),
      stopEvent:   false,
    });

    this.#map.addOverlay(this.#marker);

    // keep default layers above others
    this.#map.getLayers().on('add', e => {
      const zindex = this.setLayerZIndex({
        layer:  e.element,
        zindex: e.element.get('basemap') || 'bottom' === e.element.get('position') ? 0 : undefined,
      });
      //In case of add wms on bottom position, check current zindex of default layers that need to set on top of map layers
      if (this.defaultsLayers.mapcenter)      { this.defaultsLayers.mapcenter.getZIndex()      < zindex && this.defaultsLayers.mapcenter.setZIndex(zindex + 1); }
      if (this.defaultsLayers.selectionLayer) { this.defaultsLayers.selectionLayer.getZIndex() < zindex && this.defaultsLayers.selectionLayer.setZIndex(zindex + 1); }
      if (this.defaultsLayers.highlightLayer) { this.defaultsLayers.highlightLayer.getZIndex() < zindex && this.defaultsLayers.highlightLayer.setZIndex(zindex + 2); }
    });

    this.#map.getLayers().on('remove', e => {
      if (e.element.getZIndex() === this.layersCount) {
        this.layersCount--;
      }
    })

    this.state.bbox       = this.getMapBBOX();
    this.state.resolution = this.#map.getView().getResolution();
    this.state.center     = this.#map.getView().getCenter();

    // setup layers

    // sort layers by type: [0=BASE, 1=RASTER, 2=VECTOR]
    Object
      .values(ApplicationState.layers)
      .flatMap(s => s.isQueryable() ? s.getLayers() : [])
      .filter(l => l.isGeoLayer())
      .reduce((groups, l) => {

        // base layers
        if (l.isBaseLayer()) {
          this.#layers.base.unshift(l);
          groups[0].unshift(l);
          l.onbefore('change', () => this.updateMapLayer(l, {}));
        }

        // vector layers
        if (l.isVector()) {
          groups[2].unshift(l.getOLLayer());
        }

        // group raster layers by "multilayerid"
        if (l.isRaster() && !l.isBaseLayer()) {
          let id = l.getMultiLayerId();
          if (l.isQtimeseries()) {
            this.#layers.index[`qtimeseries_${id}`] = (this.#layers.index[`qtimeseries_${id}`] ?? -1) + 1;
            id = `${id}_${this.#layers.index[`qtimeseries_${id}`]}`;
          } else if (undefined !== this.#layers.index[`qtimeseries_${id}`]) {
            id = `${id}_${this.#layers.index[`qtimeseries_${id}`] + 1}`;
          }
          const mapLayer = this.#layers.index[id] || new g3w.Layer(l);
          mapLayer.addLayer(l, 'start');
          // listen change filter token
          l.onbefore('change',      () => this.updateMapLayer(mapLayer, { force: true }));
          l.on('filtertokenchange', ({ layerId }) => { this.updateMapLayer(mapLayer, { force: true, layerId })  })
          if (!this.#layers.index[id]) {
            mapLayer.on('loadstart', this.onLayerLoadStart);
            mapLayer.on('loadend',   this.onLayerLoadEnd);
            mapLayer.on('loaderror', this.onLayerLoadError);
            this.#layers.index[id] = mapLayer;
            this.#layers.g3w.unshift(mapLayer);
            groups[1].unshift(mapLayer);
          }
        }

        return groups;
      }, [
        [],
        [],
        [
          this.defaultsLayers.mapcenter,
          this.defaultsLayers.selectionLayer,
          this.defaultsLayers.highlightLayer,
        ]
      ])
      .flatMap(g => g)
      .forEach(l => {
        if (l instanceof ol.layer.Layer) {
          this.getMap().addLayer(l);
          return;
        }
        const olLayer = l.getOLLayer();
        if (olLayer) {
          this.getMap().addLayer(olLayer);
        }
        this.updateMapLayer(l, {})
      });

    /** @since 3.11.0 - temporary layers from local storage (ref: `addlayers` map control) */
    idb.getItem('externalLayers').then(externalLayers => {
      Object.entries(externalLayers || {}).forEach(([id, layer]) => {
        const olLayer = new ol.layer.Vector({
          source: new ol.source.Vector({ features: new ol.format.GeoJSON().readFeatures(layer.features) })
        });
        olLayer.set('name', id);
        this.addExternalLayer(olLayer, { ...layer.options, zoomToExtent: false });
      });
    });
    
    // setup ol events

    // set change resolution
    this.#events.ol.forEach(k => ol.Observable.unByKey(k));
    this.#events.ol.push(
      this.#map.getView().on('change:resolution', debounce(() => {
        this.state.bbox       = this.getMapBBOX();
        this.state.resolution = this.#map.getView().getResolution();
        this.state.center     = this.#map.getView().getCenter();
        this.#layers.g3w.concat(this.#layers.base).forEach(l => this.updateMapLayer(l, {}));
        if (ApplicationState.project.state.context_base_legend) {
          this._setLegendParams();
        }
      }))
    );

    if (ApplicationState.project.state.context_base_legend) {
      this.#events.ol.push(
        this.#map.on('moveend', () => this._setLegendParams())
      );
    } else {
      //set always to show legend at the start
      this._setLegendParams();
    }

    // CHECK IF MAPLAYESRSTOREREGISTRY HAS LAYERSTORE
    Object.values(ApplicationState.layers).forEach(this.#setUpEventsKeysToLayersStore.bind(this));
    Vue.watch(
      () => Object.keys(ApplicationState.layers),
      (newVal, oldVal) => {
        const added   = newVal.filter(key => !(key in oldVal));
        const removed = oldVal.filter(key => !(key in newVal));
        added.forEach(key   => this.#setUpEventsKeysToLayersStore(ApplicationState.layers[key]));
        removed.forEach(key => this.#removeEventsKeysToLayersStore(ApplicationState.layers[key]));
      }
    );

    this.#map_ready = true;

    this.emit('before:setupControls');

    await Promise.all([
      'toggler',
      'addlayer',
      'annotation',
      'attribution',
      'geocoding',
      'geolocation',
      'measure',
      'mouseposition',
      'baselayer',
      'overview',
      'query',
      'queryby',
      'scale',
      'scaleline',
      'screenshot',
      'streetview',
      'zoom',
      'zoombox',
      'zoomhistory',
      'zoomtoextent',
    ].map(type => import(`${initConfig.staticurl}${initConfig.client}map-controls/${type}.js`)));

    for (const type of Object.keys(this?.config?.mapcontrols || {})) {
      try {
        await this.setupControl[type](type); // TODO: make use dynamic of imports instead of firing a custom event 
      } catch (e) {
        console.warn(e);
      }
    }

    this.emit('after:setupControls');

    this.emit('after:setupViewer');

  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  getMapBBOX() {
    return this.#map.getView().calculateExtent(this.#map.getSize());
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  setInnerGreyCoverBBox(opts = {}) {
    let lowerLeft;
    let upperRight;

    if (opts.inner) {
      switch (opts.type) {
        case 'pixel':
          lowerLeft  = [opts.inner[0], opts.inner[1]];
          upperRight = [opts.inner[2], opts.inner[3]];
          break
        case 'coordinate':
        default:
          lowerLeft  = this.getMap().getPixelFromCoordinate([opts.inner[0], opts.inner[1]]);
          upperRight = this.getMap().getPixelFromCoordinate([opts.inner[2], opts.inner[3]]);
          break;
      }
      this.#shadow.inner[0] = lowerLeft[0]  * ol.has.DEVICE_PIXEL_RATIO; // x_min
      this.#shadow.inner[1] = lowerLeft[1]  * ol.has.DEVICE_PIXEL_RATIO; // y_min
      this.#shadow.inner[2] = upperRight[0] * ol.has.DEVICE_PIXEL_RATIO; // x_max
      this.#shadow.inner[3] = upperRight[1] * ol.has.DEVICE_PIXEL_RATIO; // y_max
    }

    this.#shadow.scale    = opts.scale    ?? (this.#shadow.scale || 1);
    this.#shadow.rotation = opts.rotation ?? (this.#shadow.rotation || 0);

    if (this.#shadow.outer) {
      this.getMap().render();
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * Return external layers added to map
   * 
   * @param {'vector' | 'wms'} type since 3.11.0
   * 
   * @since 4.1.0
   */
  getExternalLayers(type) {
    if (undefined !== type && 'string' !== typeof type) {
      type = type.type;
    }
    return this.#layers.external.filter(l => undefined !== type ? type === l._externalLayerType : true);
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * Used by the following plugins: "qtimeseries"
   * 
   * @since 4.1.0
   */
  getMapLayerByLayerId(id) {
    return this.#layers.g3w.find(l => l.layers.find(l => id === l.getId()));
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  getMapLayers() {
    return this.#layers.g3w;
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  getBaseLayers() {
    return this.#layers.base;
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  getProjectLayer(id) {
    return Object.values(ApplicationState.layers).map(s => s.getLayerById(id)).find(l => l);
  }

  /**
   * @since 4.1.0
   */
  getLocalStorage(key) {
    return (JSON.parse(window.localStorage.getItem(key) || '{}'));
  }

  /**
   * @since 4.1.0
   */
  setLocalStorage(key, data) {
    try {
      window.localStorage.setItem(key, JSON.stringify(data));
    } catch(e) {
      console.warn(e);
    }
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * Add an external layer to the map (eg. ZIP, KMZ, GPX, ...)
   *
   * @param { ol.layer.Vector | ol.layer.Image | ol.layer.Tile | unknown } externalLayer
   * @param { Object }  options
   * @param { unknown } options.position
   * @param { number }  options.opacity
   * @param { boolean } options.visible
   * @param { unknown } options.crs
   * @param { unknown } options.type
   * @param { unknown } options.download
   * @param { string }  options.downloadUrl (since 3.8.3) an alternate external server url where to perfom download.
   * @param { boolean }  options.persistent (since 3.11.0) whether to save layer into local storage (ie. web sessions).
   *
   * @returns { Promise<unknown> }
   * 
   * @since 4.1.0
   */
  async addExternalLayer(externalLayer, options = {}) {

    let vectorLayer;

    // vector layer
    if (externalLayer instanceof ol.layer.Vector) {

      externalLayer.set('id', externalLayer.get('id') ?? getUniqueDomId());

      vectorLayer           = externalLayer;
      vectorLayer.filter    = { // used by `selection` for query result purpose ?
        active: false           // UNUSED - it means not yet implemented?
      };
      vectorLayer.selection = {
        active: false,
        features: []
      };

      if (options.color) {
        vectorLayer.setStyle(Object.assign(
          feat => {
            options.color = options.color.rgba ? 'rgba(' + [options.color.rgba.r, options.color.rgba.g, options.color.rgba.b, options.color.rgba.a].join() + ')' : options.color;
            const geometryType = feat.getGeometry().getType();
            const { color } = options;
            let style;
            if (isPointGeometryType(geometryType)) {          // Point
              style = new ol.style.Style({
                image: new ol.style.Circle({
                  fill:   new ol.style.Fill({ color }),
                  stroke: new ol.style.Stroke({ color, width: 1 }),
                  radius: 5,
                })
              });
            } else if (isLineGeometryType(geometryType)) {    // Line
              style = new ol.style.Style({
                stroke: new ol.style.Stroke({ color, width: 3 }),
              });
            } else if (isPolygonGeometryType(geometryType)) { // Polygon
              style = new ol.style.Style({
                fill:   new ol.style.Fill({ color: 'rgba(255,255,255,0.5)' }),
                stroke: new ol.style.Stroke({ color, width: 3 }),
              })
            } else {
              console.warn('invalid geometry type: ', geometryType);
            }
            if (options.field) {
              style.setText(new ol.style.Text({
                text:   `${feat.get(options.field)}`,
                font:   'bold',
                scale:   2,
                offsetY: 15,
                fill:    new ol.style.Fill({ color: options.color }),
                stroke:  new ol.style.Stroke(({ color: '#FFF', width: 2 })),
              }));
            }
            return style;
          }, { _g3w_options: options }
        ));
      }

      let color;
      try {
        const style = externalLayer.getStyle();
        color = style?._g3w_options?.color ?? 'blue'; //setted by geo utils create style function
      } catch(e) { console.warn(e); }

      externalLayer = {
        id:               externalLayer.get('id'),
        name:             vectorLayer.get('name') || vectorLayer.get('id'),
        projectLayer:     false,
        title:            vectorLayer.get('name') || vectorLayer.get('id'),
        removable:        true,
        external:         true,
        crs:              options.crs,
        type:             options.type,
        _type:            'vector',
        visible:          false !== options.visible,
        checked:          true,
        position:         options.position ?? 'top',
        opacity:          options.opacity  ??  1,
        color:            color || 'blue',
        filter:           vectorLayer.filter,
        selection:        vectorLayer.selection,
        download:         options.download || false,
        /**
         * An alternate (external) server url where to perfom download.
         *
         * @example
         *
         * ```js
         * GUI.addExternalLayer(layer, {
         *   type: 'geojson',
         *   downloadUrl:  _<URL WHERE DOWNLOAD FILE>_
         * });
         * ```
         *
         * @since 3.8.3
         */
        downloadUrl: options.downloadUrl,
        toc:         true, //@since 4.1.0 whether to show layer in TOC
      };
    }

    // image layer
    if (externalLayer instanceof ol.layer.Image || externalLayer instanceof ol.layer.Tile) {
      Object.assign(externalLayer, {
        id:           externalLayer.get('id'),
        name:         externalLayer.get('name'),
        removable:    true,
        projectLayer: false,
        title:        externalLayer.get('name'),
        _type:        options.type ?? 'wms', //@since 4.1.0 take in account also tms layer
        opacity:      options.opacity  ??  1,
        position:     options.position ?? 'top',
        external:     true,
        checked:      false !== options.visible,
        toc:          true, //@since 4.1.0 whether to show layer in TOC
      });

      // register loading events (spinner)
      const image = externalLayer instanceof ol.layer.Image ? 'image' : 'tile';
      externalLayer.getSource().on(`${image}loadstart`, this.onLayerLoadStart);
      externalLayer.getSource().on(`${image}loadend`,   this.onLayerLoadEnd);
      externalLayer.getSource().on(`${image}loaderror`, this.onLayerLoadError);
    }

    // skip when another layer with the same name was already added
    if (this.getLayerByName(externalLayer.name)) {
      this.showUserMessage({ type: 'warning', message: `Layer with same name already added: <b>${externalLayer.name}</b>` });
    }

    const type  = (externalLayer._type || externalLayer.type || '').toLowerCase().trim('').trim();

    const layer    = 'vector' === type ? vectorLayer : externalLayer;
    const features = 'vector' === type && layer.getSource().getFeatures() || [];
    const extent   = 'vector' === type && layer.getSource().getExtent()   || [];

    // prefix each feature with layer id
    features.forEach((f, i) => f.setId(`${externalLayer.id}_${i}`));

    if (features.length) {
      externalLayer.geometryType = features[0].getGeometry().getType();
      externalLayer.selected     = false;
    }

    if (extent.length) {
      externalLayer.bbox = { minx: extent[0], miny: extent[1], maxx: extent[2], maxy: extent[3] };
    }

    layer.set('position', options.position ?? 'top');
    layer.setOpacity(options.opacity  ??  1);
    layer.setVisible(false !== options.visible);

    /** @TODO use a common parent class (project/external layers) */
    externalLayer.set                 = externalLayer.set                 || ((a, d) => externalLayer[a] = d);
    externalLayer.get                 = externalLayer.get                 || (a => externalLayer[a]);
    externalLayer.getId               = externalLayer.getId               || (() => externalLayer.id);
    externalLayer.getName             = externalLayer.getName             || (() => externalLayer.name);
    externalLayer.getGeometryType     = externalLayer.getGeometryType     || (() => externalLayer.geometryType);
    externalLayer.isSelected          = externalLayer.isSelected          || (() => externalLayer.selected);
    externalLayer.setSelected         = externalLayer.setSelected         || (s => externalLayer.selected = s);
    externalLayer.isQueryable         = externalLayer.isQueryable         || (() => !!vectorLayer);
    externalLayer.isVisible           = externalLayer.isVisible           || (() => {
      if (vectorLayer) {
        externalLayer.visible = vectorLayer.getVisible();
      }
      return externalLayer.visible;
    });
    externalLayer.setVisible          = externalLayer.setVisible          || (v => {
      if (vectorLayer) {
        vectorLayer.setVisible(v);
      }
      externalLayer.visible = v;
    });

    // keep a reference to original "externalLayer" object
    layer._externalLayer     = externalLayer;
    layer._externalLayerType = type;

    this.#map.addLayer(layer);

    this.#layers.external.push(layer);

    if (vectorLayer && false !== options.persistent) {
      idb.getItem('externalLayers').then(externalLayers => {
        idb.setItem('externalLayers', {
          ...(externalLayers || {}),
          [vectorLayer.get('name')]: {
            features: new ol.format.GeoJSON().writeFeatures(vectorLayer.getSource().getFeatures()),
            options
          }
        });
      });
    }

    this.getService('catalog').addExternalLayer({ layer: externalLayer, type });

    // invoke `onAddExternalLayer` on each map control + add vector layer "queryresults" 
    if ('vector' === type) {
      this.registerVectorLayer(layer);
      this.#events.unwatches[externalLayer.name] = [];
      this.#controls.forEach(({ control }) => control?.onAddExternalLayer?.({ layer: externalLayer, unWatches: this.#events.unwatches[externalLayer.name] }));
    }

    if (extent && options.zoomToExtent) {
      this.#map.getView().fit(extent);
    }

    // reactive layer options (local storage)
    layer.on([
      'change:position',
      'change:opacity',
      'change:visible'
    ], e => {
        if ('vector' === type) {
          return;
        }
        const data = this.getLocalStorage('externallayers');
        data.data.forEach((l, i) => {
          if (layer.get('id') === l.name && ApplicationState.project.getId() === l.pid) {
            data.data[i][e.key] = layer.get(e.key);
          }
        });
        this.setLocalStorage('externallayers', data);
    });
  
    this.loadExternalLayer(layer);

    return layer;
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * Remove external layer
   *
   * @param name
   * 
   * @since 4.1.0
   */
  removeExternalLayer(name) {
    const layer = this.getLayerByName(name);
    const type  = layer._type || 'vector';
    
    this.unregisterVectorLayer(layer);
    this.getService('catalog').removeExternalLayer({ name, type });

    this.#map.removeLayer(layer);

    if ('vector' === type) {
      /** @since v4.0.0 remove selection feature belong to layer */
      this.defaultsLayers.selectionLayer.getSource()
        .getFeatures()
        .filter(f  => layer.get('id') === f.__layerId)
        .forEach(f => this.defaultsLayers.selectionLayer.getSource().removeFeature(f));
      this.#events.unwatches[name].forEach(unWatch => unWatch());
      delete this.#events.unwatches[name];
    }

    /** @since 3.11.0 - remove vector layers from local storage */
    if ('vector' === type) {
      idb.getItem('externalLayers').then(externalLayers => {
        externalLayers = externalLayers || {};
        if (name in externalLayers) {
          delete externalLayers[name];
        }
        idb.setItem('externalLayers', externalLayers);
      });
    }

    /** @since 4.1.0 - remove wms/tms layers from local storage */
    if (['tms','wms'].includes(type)) {
      const data = this.getLocalStorage('externallayers');
      data.data = (data.data || []).filter(l => type !== l.type || ApplicationState.project.getId() !== l.pid || layer.id !== l.name);
      this.setLocalStorage('externallayers', data);
    }

    this.#layers.external = this.#layers.external.filter(l => {
      // remove layer from selection
      if (l._externalLayer === this.#selectedLayer) {
        this.#selectedLayer = null;
      }
      // vector
      if (type === l._externalLayerType && name === l._externalLayer.name) {
        this.#controls.forEach(({ control }) => control?.onRemoveExternalLayer?.(l._externalLayer));
        return false;
      }
      // wms
      if (type === l._externalLayerType && layer.id === l._externalLayer.getId()) {
        l._externalLayer.un('loadstart', this.onLayerLoadStart);
        l._externalLayer.un('loadend',   this.onLayerLoadEnd);
        l._externalLayer.un('loaderror', this.onLayerLoadError);
        // try to remove layer filter token
        if (layer.projectLayer) {
          l._externalLayer?.layers?.forEach?.forEach(l => {
            l.un('change');
            l.removeEvent('filtertokenchange')
          });
        }
        return false;
      }
      // other types ?
      if (l.get('id') === layer.get('id')) {
        return false;
      }
      return true;
    });

    this.unloadExternalLayer(layer);

    this.emit('remove-external-layer', name);
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  getCookie(name) {
    return ('; '+document.cookie).split(`; ${name}=`).pop().split(';')[0];
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @param { unknown | string | null } layer
   *
   * @since 4.1.0
   */
  selectLayer(layer) {
    let id = 'string'=== typeof layer ? layer : layer && layer.getId();

    // toggle previous selection
    if (this.#selectedLayer && id === this.#selectedLayer.getId()) {
      id = null;
    }

    layer = getCatalogLayerById(id) || this.getExternalLayers('vector').map(l => l._externalLayer).find(l => id === l.getId());

    // select layer by id
    getCatalogLayers().concat(this.getExternalLayers('vector').map(l => l._externalLayer)).forEach(l => l.setSelected(l.getId() === id));

    this.#selectedLayer = layer && layer.isSelected() ? layer : null;


    this.#controls.forEach(({ control }) => control.onSelectLayer && control.onSelectLayer(this.#selectedLayer));
  }

  /**
   * ORIGINAL SOURCE: src/services/map.js@v4.0.0
   * 
   * @since 4.1.0
   */
  getSelectedLayer() {
    return this.#selectedLayer;
  }

  /**
   * ORIGINAL SOURCE: src/services/data.js@v4.0.0
   * 
   * @param { 'query:coordinates' | 'search:features' | 'search:fids' } func function name
   * @param options
   * 
   * @returns {ReturnType<GUI['getData/query:coordinates' | 'getData/search:features' | 'getData/search:fids']>}
   */
  async getData(func, options = {}) {
    const { inputs = {}, outputs = {} } = options;
    const promise = this['getData/' + func](inputs);
    if (outputs) {
      this.showData(promise, outputs);
    }
    return await (await promise);
  }

  /**
   * ORIGINAL SOURCE: src/components/Catalog.vue@v4.0.0
   * 
   * Get legend src for visible layers
   * 
   * @param { Object }  opts
   * @param { boolean } opts.all whether force to retrieve all layers (legend urls)
   *
   * @returns { Promise<any> }
   */
  async getLegendSrc({ all = false, ...params } = {}) {
    /**
     * Stringify a query URL param (eg. `&WIDTH=700`)
     *
     * @returns { string | null } a string if value is set or null
     */
    const __ = (name, value) => (value || 0 === value) ? `${name}${value}` : null;

    // create object containing urls to fetch and relative layers
    return (
      await Promise.allSettled(
        Object.entries(
          Object
            .values(ApplicationState.layers)
            // extract geolayers (from TOC)
            .flatMap(s => {
              if (!s.showOnCatalog()) {
                return [];
              }
              const map    = s.getLayers().reduce((m, l) => (l.isGeoLayer() && (all || l.isVisible()) ? m.set(l.getId(), l) : m), new Map());
              const tree   = s.getLayersTree?.()?.[0];
              const layers = tree ? [] : [...map.values()];
              const walk   = t => t?.nodes?.forEach(n => n.id ? map.has(n.id) && layers.push(map.get(n.id)) : walk(n));
              // sorted by TOC
              if (tree) {
                walk(tree);
              }
              return layers;
            })
            .reduce((urls, layer) => {
              const url   = layer.getLegendUrl({
                all:        !ApplicationState.project.state.context_base_legend, // true = dynamic legend
                format:     'image/png',
                categories: layer.state.categories,
                ...params
              });

              // extract LEGEND_ON and LEGEND_OFF from prefix -> (in case of legend categories)
              const prefix = layer.state?.source?.url
                ? url
                : url.split('LAYER=')[0].split('LEGEND_ON=')[0].split('LEGEND_OFF=')[0];

              urls[prefix] ??= {
                layers: [],
                method: layer.state?.source?.url || layer.state.external ? 'GET' : ApplicationState.project.state.ows_method
              };

              if (!layer.state?.source?.url) {
                urls[prefix].layers.unshift({
                  layerName:  url.split('LAYER=')[1],
                  style:      layer.state?.styles?.find(s => s.current)?.name ?? false,
                  legend_on:  (url.split('LAYER=')[0].split('LEGEND_ON=')[1] || '').replace('&', ''),                         // remove eventually &
                  legend_off: (url.split('LAYER=')[0].split('LEGEND_ON=')[0].split('LEGEND_OFF=')[1] || '').replace('&', ''), // remove eventually &
                });
              }
              return urls;
            }, {})
        )
        .map(async ([url, { method, layers }]) => {

          const obj = {
            loading : true,
            url     : null,
            error   : false
          };

          try {
          
            const params = {
              LAYERS     : [],
              STYLES     : [],
              LEGEND_ON  : [],
              LEGEND_OFF : []
            };

            (layers || []).reduce((_, layer) => {
                params.LAYERS.push(layer.layerName);
                params.STYLES.push(layer.style);
                if (layer.legend_on)  { params.LEGEND_ON.push(layer.legend_on);   }
                if (layer.legend_off) { params.LEGEND_OFF.push(layer.legend_off); }
                return params;
              }, params);

            let url_params = [
              __('LAYERS=',      params.LAYERS.join(',')),
              __('STYLES=',      params.STYLES.join(',')),
              __('LEGEND_ON=',   params.LEGEND_ON.join(',')),
              __('LEGEND_OFF=',  params.LEGEND_OFF.join(',')),
              __('filtertoken=', ApplicationState.tokens.filtertoken),
            ]
            .filter(p => p) // discard nullish parameters (without a value)
            .join('&');

            try {
              obj.url = 'GET' === method
                ? url + (layers.length ? url_params : '')
                : URL.createObjectURL(await (await fetch(url.split('?')[0], {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                    // send encoded params
                    body: // new URLSearchParams(url.split('?')[1])
                      url
                        .split('?')[1]
                        .split('&')
                        .filter(p => p.split('=')[0]).map(p => `${p.split('=')[0]}=${encodeURIComponent(p.split('=')[1])}`)
                        .join('&')
                        + '&' + url_params
                  })).blob());
            } catch(e) {
              console.warn(e);
              //set loading to false
              obj.loading = false;
            }
          } catch(e) {
            console.warn(e);
          }
          return obj;
        })
      )
    ).map(({ value }) => value);
  }

  /**
   * ORIGINAL SOURCE: src/services/data.js@v4.0.0
   * 
   * @private invoked by `getData('query:coordinates')`
   */
  async 'getData/query:coordinates'({
    coordinates,
    layerIds              = [],                   // see: `QueryResultsService::addLayerFeaturesToResultsAction()`
    multilayers           = false,
    query_point_tolerance = QUERY_POINT_TOLERANCE,
    /** @since 3.8.0 **/
    addExternal = true,
    feature_count = 10
  } = {}) {
    let data       = [];
    const external = ApplicationState.catalog.external.vector.some(l => l.selected);
    const layers   = Object.values(ApplicationState.layers)
      .flatMap(s => s.isQueryable() ? s.getLayers({
        GEOLAYER:        true,
        QUERYABLE:       true,
        SELECTED_OR_ALL: (0 === layerIds.length),
        VISIBLE:         true,
        IDS:             layerIds.length ? layerIds.map(id => id) : undefined,
      }) : []);
    const size           = this.getMap().getSize();
    const mapProjection  = this.getMap().getView().getProjection();
    const resolution     = this.getMap().getView().getResolution();
    if ((!external || layerIds.length > 0) && layers.length) {
      data = await Promise.allSettled(Object.values(
        multilayers
          ? groupBy(layers, l => `${l.getInfoFormat()}:${l.getInfoUrl()}:${l.getMultiLayerId()}`) // group query by multilayerid
          : layers
      ).map(layers => [].concat(layers)[0].query({
        feature_count,
        coordinates,
        query_point_tolerance,
        mapProjection,
        size,
        resolution,
        ...(multilayers ? { reproject: true, layers } : {})
      }))
      );
    }
    // show all errors
    if (data.some(r => 'rejected' === r.status)) {
      throw data.filter(r => 'rejected' === r.status).map(r => r.reason);
    }
    return {
      result: true,
      type: 'ows',
      query: {
        coordinates,
        type: 'coordinates',
        external: {
          add: (!external || layerIds.length > 0)
            ? (1 === layers.length && layers[0].isSelected() ? false : addExternal) // avoid querying a temporary layer (external layer) when another layer is selected
            : addExternal,                                                          // an external layer is selected
          filter: {
            SELECTED: external
          }
        }
      },
      data: data.filter(r => 'fulfilled' === r.status).map(r => r.value).flatMap(({ data = [] }) => data),
    };
  }

  /**
   * ORIGINAL SOURCE: src/services/data.js@v4.0.0
   * 
   * Method to search features
   * 
   * @param options.layer
   * @param options.filter
   * @param options.raw
   * @param options.queryUrl
   * @param options.feature_count
   * @param options.formatter
   * @param options.ordering
   * @param { 0|1 } options.autofilter - since 3.11.0
   * @param options.page               - since 3.11.0
   * @param options.page_sizes         - since 3.11.0
   * @param { boolean } options.raw    - whether it should return raw data
   * 
   * @private invoked by `getData('search:features')`
   */
  async 'getData/search:features'(options = {
    layer,
    filter,
    raw: false,
    queryUrl,
    feature_count,
    formatter: 1,
    ordering,
    autofilter: 0,
    page,
    page_sizes,
  }) {
    const { layer, ...params } = options;

    params.filter    = [].concat(params.filter);
    params.page_size = (params.page_sizes || [])[0];
    const layersId   = []; // id of project layers (sorted by TOC).
    const pagination = {
      getData: {
        params: {},
        method: 'getFilterData',
      }
    };

    const traverse = tree => (tree.nodes || [tree]).forEach(n => {
      if (n.id) {
        layersId.push(n.id)
      } else {
        traverse(n);
      }
    });
    ApplicationState.project.state.layerstree.forEach(traverse);

    return {
      data: (await Promise.allSettled(
        ([].concat(layer).sort((a, b) => (layersId.indexOf(a.state.id) > layersId.indexOf(b.state.id) ? 1 : -1)))
          .map((l, i) => l.getFilterData({ ...params, field: params.filter[i] }))
      ))
        .filter(d => 'fulfilled' === d.status && d.value?.data?.at?.(0)?.features)
        .map(({ value } = {}) => {
          const layerId = value.data?.at?.(0)?.layer?.state?.id;
          // autofilter → automatically set filtertoken
          if (1 === params.autofilter) {
            (value.data || []).forEach(({ layer, filtertoken }) => {
                if (filtertoken) {
                  layer.state.selection.active = layer.state.filter.active = true;
                  layer.setToken(filtertoken); }
              })
          }
          // pagination (total elements > page size)
          if (params.page_sizes)  {
            const page_size     = Math.max(...(Array.isArray(params.page_sizes) ? params.page_sizes : [params.page_sizes])); // page size = max elements per page
            const page_sizes    = (page_size <= value.count ? params.page_sizes : [...params.page_sizes.filter(p => p < value.count), value.count]);
            pagination[layerId] = {
              /** number of pages */
              pages          : params.page && Math.ceil(value.count / params.page_size),
              /** @type { Array } number of features that want get with pagination */
              page_sizes     : page_sizes,
              /** current page */
              current        : params.page,
              /** @since 3.11.8 - current page size (how many features are get) */
              current_sizes  : page_sizes[0],
              count          : value.count,
              paginate       : true, //@since 4.0.4 set always true to has results uniform layer tools (selection, filter, save filter)
              layer          : value.data?.at?.(0)?.layer,
            };
            pagination.getData.params[layerId] = { ...params, filter: params.filter[0] };
          }
          // raw data
          if (params.raw) {
            return { data: value };
          }
          if (Array.isArray(value.data) && value.data.length > 0) {
            return value.data?.at?.(0);
          }
        }),
      query: {
        type: 'search',
        /** @type { Array } filter search (array of filter) */
        search: params.filter,
        /** whether it was an autofilter request */
        autofilter: !!params.autofilter,
        /** @since 3.11.0 - pagination info (in case of paginated request) */
        pagination: params.page_size && pagination
      },
      type: 'api',
    };
  }

  /**
   * ORIGINAL SOURCE: src/services/data.js@v4.0.0
   * 
   * Return feature from api
   * 
   * @param opts.layer
   * @param opts.formatter
   * @param opts.fids
   * 
   * @private invoked by `getData('search:fids')`
   */
  async 'getData/search:fids'({
    layer,
    formatter = 0,
    fids      = [],
  } = {}) {
    let features = []; 
    try {
      // convert API response to Open Layer Features
      features = (await layer?.getFeatureByFids?.({ fids, formatter }))?.map?.(f => {
        const props    = f.properties ?? {};
        props[G3W_FID] = f.id;
        const feat     = new ol.Feature(f.geometry && new ol.geom[f.geometry.type](f.geometry.coordinates));
        feat.setProperties(props);
        feat.setId(f.id);
        return feat;
      });
    } catch(e) {
      console.warn(e);
    }
    return {
      data: [{
        layer,
        features
      }],
      query: { type: 'search', fids },
    };
  }

});
