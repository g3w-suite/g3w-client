/**
 * @file Expose `window.g3wsdk` variable (API interface for external plugins)
 * @since 3.11.0
 */

import G3W_CONSTANT                                from 'g3w-constants';
import ApplicationState                            from 'g3w-state';

/**
 * @file ORIGINAL SOURCE: src/app/core/utils/geo.js@3.8
 */
import { addZValue }                               from 'utils/addZValue';
import { is3DGeometry }                            from 'utils/is3DGeometry';
import { removeZValue }                            from 'utils/removeZValue';
import { getOLGeometry }                           from 'utils/getOLGeometry';
import { isMultiGeometry }                         from 'utils/isMultiGeometry';
import { isPointGeometryType }                     from 'utils/isPointGeometryType';
import { isLineGeometryType }                      from 'utils/isLineGeometryType';
import { isPolygonGeometryType }                   from 'utils/isPolygonGeometryType';
import { createVectorLayerFromFile }               from 'utils/createVectorLayerFromFile';
import { createSelectedStyle }                     from 'utils/createSelectedStyle';
import { getAlphanumericPropertiesFromFeature }    from 'utils/getAlphanumericPropertiesFromFeature';
import { areCoordinatesEqual }                     from 'utils/areCoordinatesEqual';
import { splitFeature }                            from 'utils/splitFeature';
import { convertSingleMultiGeometry }              from 'utils/convertSingleMultiGeometry';
import { within }                                  from 'utils/within';
import { intersects }                              from 'utils/intersects';
import { idb }                                     from 'utils/idb';
import { waitFor }                                 from 'utils/waitFor';

//used by editing plugin
import { dissolve }                                from 'utils/dissolve';
import { distance }                                from 'utils/distance';
import { getProjectUrl }                           from 'utils/getProjectUrl';
import { getProjectConfigByGid }                   from 'utils/getProjectConfigByGid';
import { getListableProjects }                     from 'utils/getListableProjects';

/**
 * Single File Components
 */
import G3WInput                                    from 'components/InputG3W.vue';
import G3wFormInputs                               from 'components/InputG3WFormInputs.vue';

/**
 * CORE modules
 */
import DataRouterService                           from 'services/data';
import GUI                                         from 'services/gui';
import { MeasureInteraction }                      from 'map/controls/measure';

//MIXINS
import Mixins                                      from 'mixins';

import { createMeasureTooltip, removeMeasureTooltip } from 'utils/createMeasureTooltip';
import { getResolutionFromScale }                     from 'utils/getResolutionFromScale';
import { getScaleFromResolution }                     from 'utils/getScaleFromResolution';

import Emitter                                     from 'g3w-emitter';
import Panel                                       from 'g3w-panel';
import Component                                   from 'g3w-component';
import PickFeatureInteraction                      from 'map/interactions/pickfeatureinteraction';
import PickCoordinatesInteraction                  from 'map/interactions/pickcoordinatesinteraction';
import { Layer }                                   from 'g3w-layer';

import { getUniqueDomId }                          from 'utils/getUniqueDomId';
import { inherit }                                 from 'utils/inherit';
import { base }                                    from 'utils/base';
import { noop }                                    from 'utils/noop';
import { toRawType }                               from 'utils/toRawType';
import { throttle }                                from 'utils/throttle';
import { debounce }                                from 'utils/debounce';
import { XHR }                                     from 'utils/XHR';
import { createFilterFormInputs }                  from 'utils/createFilterFormInputs';
import { getCatalogLayerById }                     from 'utils/getCatalogLayerById';
import { getCatalogLayers }                        from 'utils/getCatalogLayers';
import { cloneDeep }                               from 'utils/cloneDeep';

import { gettext as _ }                            from 'g3w-i18n';
import { Plugin, PluginService }                   from 'g3w-plugin';
import { SearchPanel }                             from 'components/g3w-search';
import { FormComponent, FormService }              from 'components/g3w-form';

const deprecate                   = require('util-deprecate');

/**
 * BACKCOMP: v3.x (proxy "esbuild" classes for legacy plugins, still based on babel)
 */
function babelify(Class) {
  return new Proxy(Class, {
      // construct(target, args) {
      //   if (new.target) {
      //     console.warn('[G3W-CLIENT] class constructors must be invoked with "new"');
      //     console.trace();
      //     return Reflect.construct(target, args);
      //   }
      //   return new target(...args);
      // },
      apply(target, thisArg, argList) {
        if ('Function' === target.constructor.name && target instanceof Function) {
          console.warn('[G3W-CLIENT] class constructors must be invoked with "new"');
          console.trace();
          return Object.assign(thisArg, Reflect.construct(target, argList, /*thisArg.constructor*/));
        }
        return target.apply(thisArg, argList);
      }
  });
}

/**
 * GUI modules
 */
const FieldsService               = require('gui/fields/fieldsservice');
const Fields                      = require('gui/fields/fields');

/**
 * Next gen API (v4.x)
 * 
 * @since 4.1.0 - expose "g3w" variable globally (used by plugins)
 * 
 * @see https://github.com/g3w-suite/g3w-client/issues/71
 * @see https://github.com/g3w-suite/g3w-client/issues/46
 */
globalThis.g3w = {
  Emitter,
  Component,
  Panel,
  Plugin,
  Layer,
  gui: GUI,
  idb,
  state: ApplicationState,
  gettext: _,
};

/**
 * Legacy API (v3.x)
 * 
 * @deprecated since 4.0.0 - whenever applicable, please prefer the `g3w` variable instead (ie. within your plugins).
 */
globalThis.g3wsdk = {

  // APP CONSTANTS
  constant: G3W_CONSTANT, // TODO: rename to "constants" which is more appropriate (in version 4.0)

  // CORE API METHODS AND OBJECTS
  core: {
    G3WObject: babelify(Emitter),
    utils: {
      base,
      inherit,
      XHR,
      getUniqueDomId,
      uniqueId: getUniqueDomId,
      throttle,
      debounce,
      toRawType,
      createFilterFormInputs,
      noop,
      waitFor,
      cloneDeep
    },
    geoutils: {
      createVectorLayerFromFile: deprecate(createVectorLayerFromFile, '[G3W-CLIENT] g3wsdk.core.geoutils.createVectorLayerFromFile is deprecated'),
      createSelectedStyle,
      getAlphanumericPropertiesFromFeature,
      getQueryLayersPromisesByCoordinates: DataRouterService.getQueryLayersPromisesByCoordinates,
      getMapLayersByFilter: (f = {}, o = {}) => Object.values(ApplicationState.layers).flatMap(s => s.isQueryable() ? s.getLayers({ GEOLAYER: true, ...(f || {}) }, o) : []),
      areCoordinatesEqual,
      splitFeature,
      convertSingleMultiGeometry,
      within,
      intersects,
      dissolve,
      distance,
      Geometry: {
        GeometryTypes:                   G3W_CONSTANT.GEOMETRY_TYPES,
        removeZValueToOLFeatureGeometry: removeZValue,
        addZValueToOLFeatureGeometry:    addZValue,
        getOLGeometry,
        isMultiGeometry,
        isPointGeometryType,
        isLineGeometryType,
        isPolygonGeometryType,
        is3DGeometry,
      },
    },
    ApplicationService: new Emitter({ setters: { online(){}, offline(){} }}),
    ApplicationState,
    i18n: { t: _ },
    data: {
      DataRouterService
    },
    errors: {
      parsers: {
        Server: function(opts = {}) {
          const _traverse = (err, message = 'Error in server saving') => {
            try {
              const entries   = Object.entries(err);
              const entry     = entries.find(([key, _]) => 'fields' === key);
              const [, value] = (entry || entries[0]);
              if (!entry && !Array.isArray(value) && 'object' === typeof value) { return _traverse(value, message) }
              if (entry && 'string' === typeof value)                           { message = `[${ entries.find(([key]) => 'fields' !== key)[0] }] ${value}`; }
              if (entry && 'string' !== typeof value)                           { message = Object.entries(value).reduce((text, [field, error]) => `${text}${field} ${ Array.isArray(error) ? error[0] : error }\n`, ''); }
              if (entry)                                                        { return message.replace(/\:|\./g, ''); }
            } catch(e) { console.warn(e); }
          }
          return ({
            parse({ type = 'responseJSON' } = {}) {
              if ('responseJSON' === type && opts?.error?.responseJSON?.error?.message) { return opts.error.responseJSON.error.message; }
              if ('responseJSON' === type && opts?.error?.errors)                       { return _traverse(opts.error.errors); }
              if ('String' === type && 'string' === typeof opts.error)                  { return opts.error; }
              if ('String' === type)                                                    { return _traverse(opts.error); }
              return _('Error in server saving');
          }})
        }
      }
    },
    project: {
      ProjectsRegistry: Object.assign(new Emitter, {
        setters: { setCurrentProject(project) {} },
        getProjectUrl,
        getProjectConfigByGid,
        getListableProjects,
        getCurrentProject:     () => ApplicationState.project,
      })
    },
    map: {
      MapLayersStoreRegistry: Object.assign(new Emitter({ setters: {
        addLayersStore:          store  => { ApplicationState.layers[store.getId()] = store; },
        removeLayersStore:       store  => { if (store) { delete ApplicationState.layers[store.getId()]; } },
      }})),
    },
    catalog: {
      CatalogLayersStoresRegistry: {
        getLayerById: getCatalogLayerById,
        getLayers:    getCatalogLayers,
      }
    },
    layer: {
      LayersStore:     babelify(function(opts) { GUI.showUserMessage({ type: 'alert', message: 'g3wsdk.core.layer.LayersStore is deprecated.' }); return (ApplicationState.layers[opts.id] = opts); }),
      Layer:           Object.assign(Layer, { LayerTypes: { TABLE: 'table', IMAGE: 'image', VECTOR: 'vector' } }),
      VectorLayer:     babelify(class extends Layer { constructor(config = {}, opts = {}) { super(config, Object.assign(opts, { TYPE: 'vector' })) } }),
      features: {
        /** ORIGINAL SOURCE: src/map/layers/feature.js@v4.0.0 */
        Feature:       babelify(class Feature extends ol.Feature {
          constructor(opts = {}) {
            GUI.showUserMessage({ type: 'alert', message: 'g3wsdk.core.layer.features.Feature is deprecated' });
            super();
            this.state      = { new: false, state: null, visible: true };                
            this._uid       = getUniqueDomId();
            this._geometry  = false;
            if (opts.feature && Array.isArray(opts.properties)) { opts.properties.forEach(p => this.set(p, opts.feature.get(p))); }
            else if (opts.feature)                              { this.setProperties(opts.feature.getProperties()); }
            if (opts.feature)                                   { this.setId(opts.feature.getId()); this.setGeometryName(opts.feature.getGeometryName()); }
            if (opts?.feature?.getGeometry?.())                 { this._geometry = true; this.setGeometry(opts.feature.getGeometry()); }
            if (this.getStyle())                                { this.setStyle(this.getStyle()); }
          }
          getUid()                    { return this._uid }
          isGeometry()                { return this._geometry; }
          cloneNew(pk)                { const c = this.clone(); c._uid = getUniqueDomId(); c.setTemporaryId(); if (pk && false === pk.editable) { c.set(pk.name, null); } return c; }
          clone()                     { const f = super.clone(); f.setId(this.getId()); if (this.isGeometry()) { f.setGeometry(f.getGeometry().clone()); } const c = new g3wsdk.core.layer.features.Feature({ feature: f }); c._uid = this.getUid(); c.setState(this.getState()); if (this.isNew()) { c.setNew(); } return c; }
          setTemporaryId()            { this.setId(`_new_${getUniqueDomId()}`); this.setNew(); }
          setNew()                    { this.state.new = true; }
          delete()                    { this.state.state = 'delete'; return this; }
          update()                    { this.state.state = 'update'; return this; }
          add()                       { this.state.state = 'add'; return this; }
          isNew()                     { return this.state.new; }
          isAdded()                   { return 'add' === this.state.state; }
          isUpdated()                 { return 'update' === this.state.state; }
          isDeleted()                 { return 'delete' === this.state.state; }
          setState(state)             { this.state.state = state; }
          getState()                  { return this.state.state; }
          getAlphanumericProperties() { return Object.entries(this.getProperties()).filter(([name, _]) => !G3W_CONSTANT.GEOMETRY_FIELDS.includes(name)).reduce((attrs, [n, v]) => { attrs[n] = v; return attrs }, {}) }
          clearState()                { this.state.state = null; this.state.new = false; }
          isVisible()                 { return this.state.visible; }
          setVisible(bool = true)     { this.state.visible = bool; }
        }),
      },
    },
    interaction: {
      PickCoordinatesInteraction,
      PickFeatureInteraction
    },
    plugin: {
      Plugin:          babelify(Plugin),
      PluginService:   babelify(PluginService)
    },
  },

  // APPLICATION INTERFACE (vue)
  gui: {
    GUI,
    Panel,
    ComponentsFactory: {
      build: ({ vueComponentObject, service, propsData }, options={}) => (new Component(options)).init({ vueComponentObject, service, propsData }),
    },
    FieldsService,
    vue: {
      Component,
      Panel,
      SearchPanel,
      FormComponent,
      Inputs: {
        G3wFormInputs,
        G3WInput,
        InputsComponents: {
          'text_input':                require('gui/inputs/text/vue/text'),
          'texthtml_input':            require('gui/inputs/texthtml/vue/texthtml'),
          'textarea_input':            require('gui/inputs/textarea/vue/textarea'),
          'integer_input':             require('gui/inputs/integer/vue/integer'),
          'string_input':              require('gui/inputs/text/vue/text'), //temporary
          'float_input':               require('gui/inputs/float/vue/float'),
          'radio_input':               require('gui/inputs/radio/vue/radio'),
          'check_input':               require('gui/inputs/checkbox/vue/checkbox'),
          'range_input':               require('gui/inputs/range/vue/range'),
          'datetimepicker_input':      require('gui/inputs/datetimepicker/vue/datetimepicker'),
          'unique_input':              require('gui/inputs/unique/vue/unique'),
          'select_input':              require('gui/inputs/select/vue/select'),
          'media_input':               require('gui/inputs/media/vue/media'),
          'select_autocomplete_input': require('gui/inputs/select/vue/select'),
          'picklayer_input':           require('gui/inputs/picklayer/vue/picklayer'),
          'color_input':               require('gui/inputs/color/vue/color'),
          'slider_input':              require('gui/inputs/sliderrange/vue/sliderrange'),
          'lonlat_input':              require('gui/inputs/lonlat/vue/lonlat'),
        }
      },
      Fields,
      Mixins,
      services: {
        FormService
      }
    }
  },

  // OPEN LAYERS COMPONENTS (g3w-ol)
  ol: {
    interactions : {
      PickFeatureInteraction,
      PickCoordinatesInteraction,
    },
    controls: {},
    utils: {
      merge: (a, b) => ({ ...a, ...b }),
      getScaleFromResolution,
      getResolutionFromScale,
      createMeasureTooltip,
      removeMeasureTooltip,
    },
  },

  // G3W-SUITE debug info
  info: () => {
    Promise
      .allSettled([
        new Promise((resolve) => $script('https://unpkg.com/platform@1.3.6/platform.js', resolve)),
        new Promise((resolve) => g3wsdk.core.ApplicationService.complete ? resolve() : g3wsdk.core.ApplicationService.on('complete', resolve))
      ])
      .finally(async () => {
        /** @since 3.8.0 */
        const platform = window.platform || {};

        window.console.info(`
[g3wsdk.info]\n
- g3w-admin: __${initConfig.version}__
- g3w-client: __${process.env.g3w_client_rev}__
${Object.entries(ApplicationState.pluginsConfigs).map((p) => (`    - ${p[0]}: __${p[1].version}__`)).join('\n')}
- browser: __${platform.name} ${platform.version}__
- operating system: __${platform.os.toString()}__
`.trim());
      });
  },

  // G3W-CLIENT version
  version: G3W_CONSTANT.APP_VERSION
};

// BACKCOMP v3.x
g3wsdk.core.geometry                             = { Geom: g3wsdk.core.geoutils, Geometry: g3wsdk.core.geoutils.Geometry };
g3wsdk.ol.interactions.measure                   = {};
g3wsdk.ol.interactions.measure.AreaInteraction   = class extends MeasureInteraction { constructor(opts = {}) { opts.geometryType = "Polygon"; super(opts); } },
g3wsdk.ol.interactions.measure.LengthInteraction = class extends MeasureInteraction { constructor(opts = {}) { opts.geometryType = "LineString"; super(opts); } },

/** used by the following plugins: "qprocessing" */
g3wsdk.core.geoutils.isSameBaseGeometryType         = (a, b) => a.replace('Multi','') === b.replace('Multi','');

/** used by the following plugins: "billboards" */
g3wsdk.core.ApplicationService.setLocalItem         = ({ id, data } = {}) => { try { window.localStorage.setItem(id, JSON.stringify(data)); } catch(e) { console.warn(e); return e; } };
/** used by the following plugins: "billboards" */
g3wsdk.core.ApplicationService.removeLocalItem      = id => window.localStorage.removeItem(id);
/** used by the following plugins: "billboards" */
g3wsdk.core.ApplicationService.getLocalItem         = id => window.localStorage.getItem(id) ? JSON.parse(window.localStorage.getItem(id)) : undefined;
/** used by the following plugins: "bforest" */
g3wsdk.core.ApplicationService.getApplicationUser   = () => ApplicationState.user;
/** used by the following plugins: "archiweb", "iframe" */
g3wsdk.core.ApplicationService.changeProject        = async ({ gid } = {}) => { const url = await GUI.addMapExtentUrlParameterToUrl(getProjectUrl(gid), crs); try { history.replaceState(null, null, url); } catch (e) { console.warn(e); } location.replace(url); };
/** used by the following plugins: "editing" */
g3wsdk.core.ApplicationService.setCurrentLayout     = (who = 'app') => ApplicationState.gui.layout.__current = who;
/** used by the following plugins: "editing" */
g3wsdk.core.ApplicationService.getCurrentLayoutName = () => ApplicationState.gui.layout.__current;
/** used by the following plugins: "archiweb" */
g3wsdk.core.ApplicationService.isIframe             = () => ApplicationState.iframe;

GUI.on('initconfig',   () => g3wsdk.core.ApplicationService.emit('initconfig', window.initConfig));
GUI.on('online',       () => g3wsdk.core.ApplicationService.online());
GUI.on('offline',      () => g3wsdk.core.ApplicationService.offline());
GUI.on('app-ready',    () => g3wsdk.core.ApplicationService.emit('ready'));
GUI.on('app-complete', () => { g3wsdk.core.ApplicationService.complete = true; g3wsdk.core.ApplicationService.emit('complete'); });

/** used by the following plugins: "archiweb" */
g3wsdk.core.project.ProjectsRegistry.setProjectAliasUrl = alias => { const p = window.initConfig.projects.find(p => alias.gid === p.gid); if (p) { p.url = `${alias.host || ''}${alias.url}` } };

/** used by the following plugins: "datasinc" */
g3wsdk.core.i18n.getAppLanguage = () => window.initConfig.user.i18n || "en";
/* function to translate plugins */
g3wsdk.core.i18n.tPlugin        = text => _(`plugins.${text}`);
/** used by the following plugins: "iframe", "law", "bforest", "sispi-worksite", "gsk", "arpalombardia-charts", "simplereporting", "politowps", "billboards", "ws-trento", "br-service", "datasinc", "archiweb", "fsimulator", "skeleton", "elevation-profile" */
g3wsdk.core.i18n.addI18nPlugin  = ({ name, config }) =>  {
  console.warn('[G3W-I18N] g3wsdk.core.i18n.addI18nPlugin is deprecated, please use `g3wsdk.core.plugin.Plugin.setLocale` instead')
  for (const lang in config) {
    _.register(lang, { plugins: { [name]: config[lang] } });
  }
};

g3wsdk.core.plugin.PluginsRegistry = babelify(Object.assign(new Emitter, { setters: {
  registerPlugin(plugin) {
    console.warn('[G3W-CLIENT] PluginsRegistry.registerPlugin is deprecated, use GUI.registerPlugin instead');
    GUI.registerPlugin(plugin);
  } },
  getPlugin(name) {
    console.warn('[G3W-CLIENT] PluginsRegistry.getPlugin is deprecated, use GUI.getPlugin instead');
    return GUI.getPlugin(name);
  }
}));

/** used by the following plugins: "openrouteservice", "processing" */
g3wsdk.core.task = {};
g3wsdk.core.task.TaskService = {
  tasks: [],
  async runTask(opts = {}) {
    console.warn('[G3W-CLIENT] g3wsdk.core.task.TaskService is deprecated since 4.1.0');
    let {
      method = 'GET',
      params = {},
      url,
      taskUrl,
      interval = 1000,
      timeout = Infinity,
      listener = () => {}
    } = opts;
    try {
      const r = 'GET' === method  ? await XHR.get({ url, params }): await XHR.post({ url, data: params.data || {}, contentType: params.contentType || "application/json" });
      if (r.result) {
        const id = setInterval(async () => {
          // check if timeout is defined
          timeout = timeout - interval;
          if (timeout > 0) {
            let r;
            try {
              r = await XHR.get({url: `${taskUrl}${r.task_id}`});
            } catch(e) {
              r = e;
              console.warn(e);
            }
            listener({ task_id: r.task_id, timeout: false, response: r });
          } else {
            listener({ timeout: true });
            g3wsdk.core.task.TaskService.stopTask({ task_id: r.task_id });
          }
        }, interval);

        // add current task to list of task
        g3wsdk.core.task.TaskService.tasks.push({ task_id: r.task_id, intervalId: id });

        // run first time listener function
        listener({ task_id: r.task_id, response: r });
      } else {
        return Promise.reject(r);
      }

    } catch(e) {
      console.warn(e);
      return Promise.reject(e);
    }
  },
  stopTask(opts = {}) {
    const task = g3wsdk.core.task.TaskService.tasks.find(t => opts.task_id === t.task_id);
    if (task) { clearInterval(task.intervalId); }
  },
  clear() {
    g3wsdk.core.task.TaskService.tasks.forEach(({ taskId }) => g3wsdk.core.task.TaskService.stopTask({ taskId }));
    g3wsdk.core.task.TaskService.tasks.splice(0);
  },
};