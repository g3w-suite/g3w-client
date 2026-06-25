/**
 * @file Expose `window.g3wsdk` variable (API interface for external plugins)
 * @since 3.11.0
 */

import { version as APP_VERSION }                  from '../package.json';

import G3W_CONSTANT                                from 'g3w-constants';
import ApplicationState                            from 'g3w-state';

/**
 * @file ORIGINAL SOURCE: src/app/core/utils/geo.js@3.8
 */
import { addZValue }                               from 'utils/addZValue';
import { is3DGeometry }                            from 'utils/is3DGeometry';
import { removeZValue }                            from 'utils/removeZValue';
import { isMultiGeometry }                         from 'utils/isMultiGeometry';
import { isPointGeometryType }                     from 'utils/isPointGeometryType';
import { isLineGeometryType }                      from 'utils/isLineGeometryType';
import { isPolygonGeometryType }                   from 'utils/isPolygonGeometryType';
import { createVectorLayerFromFile }               from 'utils/createVectorLayerFromFile';
import { getAlphanumericProps }                    from 'utils/getAlphanumericProps';
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
import { getListableProjects }                     from 'utils/getListableProjects';

/**
 * Single File Components
 */
import G3WInput                                    from 'components/InputG3W.vue';
import G3wFormInputs                               from 'components/InputG3WFormInputs.vue';

/**
 * CORE modules
 */
import GUI                                         from 'g3w-app';

//MIXINS
import Mixins                                      from 'mixins';

import { createMeasureTooltip }                    from 'utils/createMeasureTooltip';
import { get_formatted_area }                      from 'utils/createMeasureTooltip';
import { get_formatted_length }                    from 'utils/createMeasureTooltip';
import { get_formatted_radius }                    from 'utils/createMeasureTooltip';
import { get_formatted_angle }                     from 'utils/createMeasureTooltip';
import { getResolutionFromScale }                  from 'utils/getResolutionFromScale';
import { getScaleFromResolution }                  from 'utils/getScaleFromResolution';

import Emitter                                     from 'g3w-emitter';
import Panel                                       from 'g3w-panel';
import Component                                   from 'g3w-component';
import PickFeatureInteraction                      from 'interactions/pick-feature';
import PickCoordinatesInteraction                  from 'interactions/pick-coordinates';
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
import { saveBlob }                                from 'utils/saveBlob';
import { flattenObject }                           from 'utils/flattenObject';
import { normalizeEpsg }                           from 'utils/normalizeEpsg';
import { sameOrigin }                              from 'utils/sameOrigin';

import { gettext as _ }                            from 'g3w-i18n';
import { Plugin, PluginService }                   from 'g3w-plugin';
import MapControl                                  from 'g3w-control';
import { SearchPanel }                             from 'components/g3w-search';
import { FormComponent, FormService }              from 'components/g3w-form';

//Inputs
import InputCheckbox                               from 'components/InputCheckbox.vue';
import InputColor                                  from 'components/InputColor.vue';
import InputDateTimePicker                         from 'components/InputDateTimePicker.vue';
import InputFloat                                  from 'components/InputFloat.vue';
import InputInteger                                from 'components/InputInteger.vue';
import InputLonLat                                 from 'components/InputLonLat.vue';
import InputMedia                                  from 'components/InputMedia.vue';
import InputPickLayer                              from 'components/InputPickLayer.vue';
import InputRadio                                  from 'components/InputRadio.vue';
import InputSelect                                 from 'components/InputSelect.vue';
import InputRange                                  from 'components/InputRange.vue';
import InputSliderRange                            from 'components/InputSliderRange.vue';
import InputText                                   from 'components/InputText.vue';
import InputTextArea                               from 'components/InputTextArea.vue';
import InputTextHtml                               from 'components/InputTextHtml.vue';
import InputUnique                                 from 'components/InputUnique.vue';

//Fields
import Fields, { FieldsService }                   from 'components/g3w-fields';

import 'components/x-select';

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
 * Next gen API (v4.x)
 * 
 * @since 4.1.0 - expose "g3w" variable globally (used by plugins)
 * 
 * @see https://github.com/g3w-suite/g3w-client/issues/71
 * @see https://github.com/g3w-suite/g3w-client/issues/46
 * 
 * @global g3w
 */
globalThis.g3w = {
  version: `${process.env.g3w_client_rev}`,
  Emitter,
  Component,
  Panel,
  Plugin,
  Layer,
  Control: MapControl,
  app: GUI,
  idb,
  state: ApplicationState,
  gettext: _,
  constants: G3W_CONSTANT,
  utils: {
    createMeasureTooltip,
    get_formatted_area,
    get_formatted_length,
    get_formatted_radius,
    get_formatted_angle,
    saveBlob,
    getUniqueDomId,
    flattenObject,
    addZValue,
    convertSingleMultiGeometry,
    getCatalogLayerById,
    debounce,
    throttle,
    XHR,
    normalizeEpsg,
    PickCoordinatesInteraction,
    getResolutionFromScale,
    getScaleFromResolution,
    sameOrigin
  },
};

/**
 * Legacy API (v3.x)
 * 
 * @deprecated since 4.0.0 - whenever applicable, please prefer the `g3w` variable instead (ie. within your plugins).
 * 
 * @global g3wsdk
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
      /** used by the following plugins: "bforest" */
      createVectorLayerFromFile: deprecate(createVectorLayerFromFile, '[G3W-CLIENT] g3wsdk.core.geoutils.createVectorLayerFromFile is deprecated'),
      getAlphanumericPropertiesFromFeature: getAlphanumericProps,
      getMapLayersByFilter: (f = {}, o = {}) => ApplicationState.project.getLayers({ GEOLAYER: true, ...(f || {}) }, o),
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
        /** used by the following plugins: "archiweb" */
        getOLGeometry(geom) {
          if (geom.startsWith('Line'))         { return 'LineString'; }
          if (geom.startsWith('MultiLine'))    { return 'MultiLineString'; }
          if (geom.startsWith('Point'))        { return 'Point'; }
          if (geom.startsWith('MultiPoint'))   { return 'MultiPoint'; }
          if (geom.startsWith('Polygon'))      { return 'Polygon'; }
          if (geom.startsWith('MultiPolygon')) { return 'MultiPolygon'; }
          console.warn('invalid geometry type: ', geom);
          return geom;
        },
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
      DataRouterService: GUI,
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
        getProjectUrl,
        /** used by the following plugins: "iframe", "archiweb" */
        getProjectConfigByGid: (gid) => window.initConfig.projects.find(p => gid === p.gid),
        getListableProjects,
        getCurrentProject: () => ApplicationState.project,
      })
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
    /** used by the following plugins: "simplereporting", "arpalombardia-charts", "ws-trento" */
    ComponentsFactory: {
      build: ({ vueComponentObject, service, propsData }, options={}) => (new Component(options)).init({ vueComponentObject, service, propsData }),
    },
    /** used by the following plugins: "br-service" */
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
          'text_input':                Vue.extend(InputText),
          'texthtml_input':            Vue.extend(InputTextHtml),
          'textarea_input':            Vue.extend(InputTextArea),
          'integer_input':             Vue.extend(InputInteger),
          'string_input':              Vue.extend(InputText), //temporary
          'float_input':               Vue.extend(InputFloat),
          'radio_input':               Vue.extend(InputRadio),
          'check_input':               Vue.extend(InputCheckbox),
          'range_input':               Vue.extend(InputRange),
          'datetimepicker_input':      Vue.extend(InputDateTimePicker),
          'unique_input':              Vue.extend(InputUnique),
          'select_input':              Vue.extend(InputSelect),
          'media_input':               Vue.extend(InputMedia),
          'select_autocomplete_input': Vue.extend(InputSelect),
          'picklayer_input':           Vue.extend(InputPickLayer),
          'color_input':               Vue.extend(InputColor),
          'slider_input':              Vue.extend(InputSliderRange),
          'lonlat_input':              Vue.extend(InputLonLat),
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
${Object.entries(window.initConfig.plugins).map((p) => (`    - ${p[0]}: __${p[1].version}__`)).join('\n')}
- browser: __${platform.name} ${platform.version}__
- operating system: __${platform.os.toString()}__
`.trim());
      });
  },

  // G3W-CLIENT version
  version: APP_VERSION
};

// BACKCOMP v3.x
g3wsdk.core.geometry                             = { Geom: g3wsdk.core.geoutils, Geometry: g3wsdk.core.geoutils.Geometry };

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
g3wsdk.core.ApplicationService.setCurrentLayout     = (who = 'app') => ApplicationState.layout.__current = who;
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

/** used by the following plugins: "iframe", "archiweb" */
g3wsdk.core.geoutils.getQueryLayersPromisesByCoordinates = async function(layers, {
  coordinates,
  feature_count         = 10,
  query_point_tolerance = G3W_CONSTANT.QUERY_POINT_TOLERANCE,
  multilayers           = false,
  reproject             = true,
} = {}) {
  // skip when no features
  if (0 === layers.length) {
    return layers;
  }
  const map            = GUI.getMap();
  const size           = map.getSize();
  const mapProjection  = map.getView().getProjection();
  const resolution     = map.getView().getResolution();
  const responses = await Promise.allSettled(Object.values(
    multilayers
      ? layers.reduce((result, item) => {
        const key = `${item.getInfoFormat()}:${item.getInfoUrl()}:${item.getMultiLayerId()}`;
        if (!result[key]) {
          result[key] = [];
        }
        result[key].push(item);
        return result;
      }, {})
      : layers
  ).map(layers => 
    [].concat(layers)[0].query(
      multilayers
        ? { feature_count, coordinates, query_point_tolerance, mapProjection, size, resolution, reproject, layers }
        : { feature_count, coordinates, query_point_tolerance, mapProjection, size, resolution }
      )
    )
  );
  // at least one response
  if (responses.some(r => 'fulfilled' === r.status)) {
    return responses.filter(r => 'fulfilled' === r.status).map(r => r.value);
  }
  // show all errors
  return Promise.reject(responses.filter(r => 'rejected' === r.status).map(r => r.reason));
};

/**
 * used by the following plugins: "archiweb"
 * 
 * ORIGINAL SOURCE: src/components/g3w-projectsmenu.js@v3.10.2
 * ORIGINAL SOURCE: src/components/ProjectsMenu.vue@v4.0.0
 */
g3wsdk.gui.GUI.getProjectMenuDOM = ({ projects = [], host, cbk } = {}) => {
  const _   = g3w.gettext;
  const GUI = g3w.app;

  GUI.showUserMessage({ type: 'alert', message: 'g3wsdk.gui.GUI.getProjectMenuDOM is deprecated' });

  const opts = {
    projects: projects && Array.isArray(projects) && projects,
    cbk,
    host
  };
  return (new Component({
    ...opts,
    id: 'projectsmenu',
    title: opts.title || 'menu',
    internalComponent: new (Vue.extend({
      template: /*html*/`
        <div id = "menu-projects" class = "container" style="width: 100%; overflow-y: auto;">
          <div class = "row row-equal" style="display: flex; flex-wrap: wrap;">
            <!-- item -->
            <div
              v-for  = "menuitem in state.menuitems"
              :key   = "menuitem.title"
              @click = "trigger(menuitem)"
              class  = "col-sm-4 project-menu"
              style  = "cursor: pointer; margin-bottom: 20px; margin-top: 20px;"
            >
              <div class = "project-menu-item-image" style="position: relative; overflow: hidden; padding-bottom: 50%;">
                <img :src = "logoSrc(menuitem.thumbnail)" class = "img-responsive" style="position: absolute; top: 0; bottom: 0; left: 0; right: 0; margin: auto;" >
              </div>
              <div class = "project-menu-item-content"  style="padding: 15px; background: rgba(255,255,255,0.3);">
                <div class = "project-menu-item-text"   style="position: relative; overflow: hidden; height: 100%; text-align: justify;">
                  <h4 class = "project-menu-item-title" style="text-align: center; font-weight: bold; background: rgba(255,255,255,0.5); padding: 5px;">{{ menuitem.title }}</h4>
                  <div v-html = "menuitem.description"></div>
                </div>
              </div>
            </div>
            <div v-if = "!state.menuitems.length" style = "margin-left:15px;">
              <h2 v-t = "'No more project for this group'"></h2>
            </div>
          </div>
        </div>`,

        data: () => ({ state: null, loading: false }),

        methods: {

          trigger(item) {
            // init callback
            if (item.cbk)        {
              GUI.showFullModal({ show: true });
              GUI.setLoadingContent(true);
              item.cbk
                .call(item, { gid: item.gid })
                .then(promise => { // changeProject is a setter so it returns a promise
                  promise
                    .then(project => {
                      if (project) {
                        document.title = project.state.html_page_title;
                      }
                    })
                    .fail(() => {
                      GUI.showUserMessage({ type: 'alert', message: "<h4>" + _('Error occurs loading map') + "</h4>" + "<h5>"+ _('Check internet connection or contact admin') + "</h5>" });
                    })
                    .always(() => {
                      GUI.showFullModal({ show: false });
                      GUI.setLoadingContent(false);
                    })
                });
            } else if (item.href) {
              window.open(item.href, '_blank');
            } else if (item.route) {
              GUI.getMap().getView().animate({ duration: 300, center: coordinates }, { zoom: 6, duration: 300 });
            } else {
              console.log("No action for "+item.title);
            }
          },

          logoSrc(src) {
            let imageSrc;
            const host = this.$options.host || '';
            if (!src) {
              imageSrc = '/static/client/images/FakeProjectThumb.png';
            } else if (src && (src.includes(window.initConfig.mediaurl))) { // has media
              imageSrc = src;
            } else if (src && (!src.includes('static') && !src.includes('media'))) { // not static
              imageSrc = `${window.initConfig.mediaurl}${src}`;
            } else {
              imageSrc = '/static/client/images/FakeProjectThumb.png';
            }
            return `${host}${imageSrc}`;
          },
        }
    }))({
      host: opts.host,
      state: {
        menuitems: (opts.projects || getListableProjects()).map(p => ({
          title:       p.title,
          description: p.description,
          thumbnail:   p.thumbnail,
          gid:         p.gid,
          cbk:         opts.cbk || ((o = {}) => async () => {
            const url = await GUI.addMapExtentUrlParameterToUrl(getProjectUrl(o.gid));
            try { history.replaceState(null, null, url); }
            catch (e) { console.warn(e); } location.replace(url);
          }),
        }))
      },
    }),
  })).getInternalComponent().$mount().$el;
};