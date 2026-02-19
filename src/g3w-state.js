/**
 * @file STATE of application
 * 
 * @since 4.1.0
 */

import Emitter           from 'g3w-emitter';
import { normalizeEpsg } from 'utils/normalizeEpsg';
import proj4             from 'proj4';

/** make "reactive" a native JS Object */
const observe = obj => new Proxy(obj, {
  set(target, property, value) {
    Vue.set(target, property, value);
    return true;
  },
});

const STATE = {

  /**
   * @since 4.1.0 - true = application is disabled and unclickable (waiting)
   */
  disabled: false,

  /**
   * true = application is ready
   */
  ready: false,

  /**
   * true = application is loaded inside an iframe
   */
  iframe: window.top !== window.self,

  /**
   * true = application is connected
   */
  online: navigator.onLine,

  /**
   * true = application is loaded on a mobile device
   */
  ismobile: isMobile.any,
  
  /**
   * true = there is a pending download 
   */
  download: false,

  /**
   * true = there is a pending upload
   */
  upload: false,

  /**
   * Store current map base layer id
   */
  baseLayerId: null,

  /**
   * en = default language
   */
  language: 'en',

  /**
   * Store all i18n objects
   * 
   * @since 4.0.0
   */
  locales: {},

  /**
   * Store Array of loading plugins (by name)
   * Every time a plugin is loaded, plugin name is removed from Array
   * It used in v-plugins directive
   */
  plugins: [],

  /** @since 4.1.0 store g3w-plugin instances */
  plugins_registry: {},

  /** @since 4.1.0 - original server config (also stored in here for vue reactivity) */
  initConfig: window.initConfig,

  /**
   * Store application current user
   */
  user: null,

  /** @since 4.1.0 */
  mapUnits:   'm',

  /** @since 4.1.0 */
  bbox:       [],

  /** @since 4.1.0 */
  hidemaps:   [],

  /** @since 4.1.0 */
  resolution: null,

  /** @since 4.1.0 */
  center:     null,

  /** @since 4.1.0 */
  loading:    false,

  /** @since 4.1.0 */
  hidden:     true,

  /** @since 4.1.0 */
  scale:      0,

  /** @since 4.1.0 */
  map_info: null,

  /** @since 4.1.0 */
  map_style: null,

  /** @since 4.1.0 */
  mapunits:   ['metric'],

  /** @since 4.1.0 */
  map_epsg: '',

  /** @since 4.1.0 */
  map_unit: 'metric',

  /** @since 4.0.7 */
  map_theme: {
    theme:  null,  // current map theme
    change: false, // changed map theme
  },

  /** @since 4.1.0 */
  logged: undefined !== window.initConfig.user.id,

  /** @since 4.1.0 */
  cookie_accepted: !!window.localStorage.getItem('cookie:accepted'),

  /** @since 4.1.0 */
  components: [],

  /** @since 4.1.0 */
  queried_layers: [],

  /** @since 4.1.0 */
  changed: false,

  /** @since 4.1.0 */
  query: null,

  /** @since 4.1.0 */
  type: 'ows',

  /**
   * An action is an object that contains:
   *
   * ```
   * {
   *   "id":       (required) Unique action Id
   *   "download": whether action is download or not
   *   "class":    (required) fontawsome classname to show icon
   *   "state":    need to be reactive. Used for example to toggled state of action icon
   *   "hint":     Tooltip text
   *   "init":     Method called when action is loaded
   *   "clear":    Method called before clear the service. Used for example to clear unwatch
   *   "change":   Method called when feature of layer is changed
   *   "cbk":      (required) Method called when action is cliccked
   * }
   * ```
   * 
   * @since 4.1.0
   */
  layersactions: {},

  /** @since 4.1.0 - action tools (for features) */
  actiontools: {},

  /** @since 4.1.0 - current action tools contain component of a specific action (eg. download) */
  currentactiontools:{},

  /** @since 4.1.0 - store current action that expose vue component (useful for comparing the id other action is triggered and exposing the component) */
  currentactionfeaturelayer:{},

  /** @since 4.1.0 */
  layeractiontool: {},

  /** @since 4.1.0 */
  layersFeaturesBoxes:{},

  /** @since 4.1.0 - store custom layer components */
  layerscustomcomponents: {},

  /**
   * @since 4.1.0 - Store info of the elements of GUI of the application
   */
  layout: {
    /** Current layout owner ("app" = default) */
    __current: 'app',
    /** Store application layout info (rightpanel) */
    app: {}
  },

  /**
   * @since 4.1.0 - Store vendor keys need it by application third part script
   */
  vendorkeys: {
    google: undefined,
    bing:   undefined
  },

  /**
   * Store tokens, used by server, for example, to filter features
   */
  tokens: {
    filtertoken: undefined
  },

  /**
   * @since 3.10.0
   */
  querybuilder: {
    cache:    {},
    searches: JSON.parse(window.localStorage.getItem('QUERYBUILDERSEARCHES') || "{}"),
  },

  /**
   * @since 3.11.0
   */
  navbaritems: [],

  /**
   * @since 4.1.0
   */
  catalog: {
    external: {   // external layers
      wms:    [], // added by wms sidebar component
      tms:    [], // @since 4.1.0 tms layer type 
      vector: []  // added to map controls for the moment
    },
    layerstrees:  [],
  },

  /**
   * @since 3.11.0
   */
  sidebar: {
    title: '',
    components: [],
    /** DOM element where insert the component/panel  */
    parent:     null,
    /** barstack state. It stores the panel array */
    contentsdata: [], // Array<{ content, options }>
    /** @since 3.11.3 - whether to enable close button  */
    btn_close: true,
    /** @since 3.11.3 - custom tooltip for close button */
    tooltip_close: 'close',
    /** @since 4.1.0 - true = sidebar is disabled (not responsive) */
    disabled: false,
    /** @since 4.1.0 - true open, false hide - icons only */
    open: true,
    /** @since 4.1.0 */
    width: 0,
  },

  contentsdata: [],

  /** @since 4.1.0 - splitting orientation (h = horizontal, v = vertical) */
  split: 'h',

  /** @since 4.1.0 */
  map: {
    sizes: {
      width:  0,
      height: 0
    },
  },

  /** @since 4.1.0 */
  content: {
    loading:  false,
    disabled: false,
    sizes: {
      width:  0,
      height: 0
    },
    // store the resize vertical or horizontal
    resize: {
      'h': { perc: 0 },
      'v': { perc: 0 }
    },
    showgoback:   true,
    stack:        [], // array elements of stack contents
    closable:     true, // (x) is closable
    backonclose:  false, // back on prevoius content
    contentsdata: [], // content data array
  },

  /** @since 4.1.0 */
  usermessage: {
    id:          null, // unique identify
    show:        false,
    title:       null,
    message:     null,
    position:    null,
    type:        null,
    draggable:   null,
    cloasable:   null,
    autoclose:   null,
    textMessage: false,
    hooks: {
      header: null,
      body:   null,
      footer: null
    }
  },

  /** @since 3.11.0 */
  project: new Emitter,

  /** @since 4.1.0 store layersstore instances */
  layers: new Proxy({}, {
    set(target, property, value) {
      if (value && !(value instanceof Emitter)) {
        value = new (class extends Emitter {
          constructor(config = {}) {
            super();
            this.config       = {
              id:         config.id ?? property ?? Date.now(),
              projection: config.projection,
              extent:     config.extent,
              initextent: config.initextent,
              wmsUrl:     config.wmsUrl,
              catalog:    config.catalog ?? true
            };
            this.state        = { layerstree: [], relations:  null }
            this._isQueryable = config.queryable ?? true;
            this._layers      = this.config.layers || {};
            this.setters      = ['setLayerSelected', 'addLayers', 'addLayer', 'removeLayer', ];
          }
          setLayerSelected(id, selected)           { this.getLayers().forEach(l => l.state.selected = (id === l.getId()) ? selected : false); }
          addLayers(layers = [])                   { layers.forEach(l => this.addLayer(l)) }
          addLayer(layer)                          { this._layers[layer.getId()] = layer; }
          removeLayer(layer)                       { delete this._layers[layer.getId()]; }
          isQueryable()                            { return this._isQueryable; }
          setQueryable(bool)                       { this._isQueryable = !!bool; }
          showOnCatalog()                          { return this.config.catalog; }
          setOptions(config = {})                  { this.config = config; }
          getId()                                  { return this.config.id; }
          removeLayers()                           { Object.entries(this._layers).forEach(([_, layer]) => this.removeLayer(layer)) }
          getLayers(filter = {}, options = {})     { return Object.values(this.getLayersDict(filter, options)); }
          getBaseLayers()                          { return this.getLayersDict({ BASELAYER: true }); }
          getLayerById(id)                         { return this.getLayersDict()[id]; }
          getLayerByName(name)                     { return this._layers.find(l => name === l.getName()); }
          getLayerAttributes(id)                   { return this.getLayerById(id).getAttributes(); }
          getLayerAttributeLabel(id, name)         { return this.getLayerById(id).getAttributeLabel(name); }
          getGeoLayers()                           { return this.getLayers({ GEOLAYER: true }) }
          selectLayer(id, selected)                { this.setLayerSelected(id, selected); }
          getProjection()                          { return this.config.projection; }
          getExtent()                              { return this.config.extent; }
          getInitExtent()                          { return this.config.initextent; }
          getWmsUrl()                              { return this.config.wmsUrl; }
          removeLayersTree()                       { this.state.layerstree.splice(0, this.state.layerstree.length); }
          getLayersTree()                          { return this.state.layerstree; }
          getLayersDict(filter = {}, options = {}) {
  
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
              return this._layers;
            }
  
            let layers = Object.values(this._layers);
  
            if (filter.IDS) {
              const ids = [].concat(filter.IDS);
              layers    = layers.filter(l => ids.includes(l.getId()));
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
            if (options.TOC_ORDER && this.state.layerstree) {
              // get all siblings children layers id
              let nodes = [];
              let traverse = tree => {
                tree.nodes.forEach(n => {
                  if (n.id) { nodes.push(n.id) }
                  else { traverse(n) }
                });
              };
              traverse(this.state.layerstree[0]);
              return nodes.map(id => layers.find(l => id === l.getId())).filter(id => id);
            }
  
            return layers;
          }
        })(value);
      }
      Vue.set(target, property, value);
      return true;
    },
  }),

  /** @since 3.11.0 */
  highlightlayers: false,

  /** @since 4.1.0 */
  projections: {
    get(crs = {}) {
      let p = ol.proj.get(normalizeEpsg(crs.epsg));
      const proj = !p && {
        code:            crs.epsg,
        extent:          crs.extent,
        axisOrientation: crs.axisinverted ? 'neu' : 'enu',
        units:           crs.geographic ? 'degrees' : 'm'
      };

      // crs not yet registered
      if (!p) {
        p = new ol.proj.Projection(proj);
        ol.proj.addProjection(p);
      }

      // crs is a proj4 object
      if (proj && crs.proj4) {
        proj4.defs(crs.epsg, crs.proj4);
        ol.proj.proj4.register(proj4);
      }

      // crs has no extent
      if (crs.extent && !p.getExtent()) {
        p.setExtent(crs.extent);
      }

      return p;
    },

    /**
     * Check and register epsg
     * 
     * @param epsg : "EPSG:<CODE>" Ex. "EPSG:4326"
     * 
     * @returns { Promise<ol.proj.Projection> }
     * 
     * @since v3.8
     */
    async set(epsg) {
      let p = ol.proj.get(epsg) || undefined;

      // check if already registered
      if (!p) {
        const { result, data } = await (await fetch(`/crs/${epsg.split(':')[1]}/`)).json();
        if (result)  {
          data.epsg  = normalizeEpsg(data.epsg);
          p = this.get(data);
          ol.proj.proj4.register(proj4);
          return p;
        }
      }

      return p;
    }
  },

};

/**
 * Global state of application (reactive)
 * 
 * @type { typeof STATE }
 */
const _STATE = Vue.observable(STATE);

export default _STATE; // NB: do not change this line! (vscode typings)