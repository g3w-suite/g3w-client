/**
 * @file Expose `window.g3wsdk` variable (API interface for external plugins)
 * @since 3.11.0
 */

import G3W_CONSTANT                                from 'g3w-constants';
import ApplicationState                            from 'store/application';
import ApplicationService                          from 'services/application';


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
import { getMapLayersByFilter }                    from 'utils/getMapLayersByFilter';
import { areCoordinatesEqual }                     from 'utils/areCoordinatesEqual';
import { splitFeature }                            from 'utils/splitFeature';
import { convertSingleMultiGeometry }              from 'utils/convertSingleMultiGeometry';
import { within }                                  from 'utils/within';
import { intersects }                              from 'utils/intersects';
//used by editing plugin
import { dissolve }                                from 'utils/dissolve';
import { distance }                                from 'utils/distance';
import { getDefaultExpression }                    from 'utils/getDefaultExpression';
import { getFilterExpression }                     from "utils/getFilterExpression";
import { getProjectUrl }                           from 'utils/getProjectUrl';
import { getProjectConfigByGid }                   from 'utils/getProjectConfigByGid';
import { getListableProjects }                     from 'utils/getListableProjects';
import { getProject }                              from 'utils/getProject';

/**
 * Single File Components
 */
import G3WInput                                    from 'components/InputG3W.vue';
import G3wFormInputs                               from 'components/InputG3WFormInputs.vue';

/**
 * CORE modules
 */
import DataRouterService                           from 'services/data';
import PluginsRegistry                             from 'store/plugins';
import TaskService                                 from 'services/tasks';
import GUI                                         from 'services/gui';
import { MeasureInteraction }                      from 'map/controls/measurecontrol';

//MIXINS
import Mixins                                      from 'mixins';

import { createMeasureTooltip }                    from 'utils/createMeasureTooltip';
import { removeMeasureTooltip }                    from 'utils/removeMeasureTooltip';
import { getResolutionFromScale }                  from 'utils/getResolutionFromScale';
import { getScaleFromResolution }                  from 'utils/getScaleFromResolution';
import { ResponseParser }                          from 'utils/parsers';
import { $promisify }                              from 'utils/promisify';

import G3WObject                                   from 'g3w-object';
import Panel                                       from 'g3w-panel';
import Component                                   from 'g3w-component';
import PickFeatureInteraction                      from 'map/interactions/pickfeatureinteraction';
import PickCoordinatesInteraction                  from 'map/interactions/pickcoordinatesinteraction';
import { LayersStore }                             from 'map/layers/layersstore';
import { Layer }                                   from 'map/layers/layer';
import { TableLayer }                              from 'map/layers/tablelayer';
import { VectorLayer }                             from 'map/layers/vectorlayer';
import { Feature }                                 from 'map/layers/feature';
import { FeaturesStore }                           from 'map/layers/featuresstore';

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

import i18n                                        from 'g3w-i18n';
import { Plugin, PluginService }                   from 'g3w-plugin';
import { MapLayersStoresRegistry }                 from 'services/map';
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

const g3wsdk = {

  // APP CONSTANTS
  constant: G3W_CONSTANT, // TODO: rename to "constants" which is more appropriate (in version 4.0)

  // CORE API METHODS AND OBJECTS
  core: {
    G3WObject: babelify(G3WObject),
    utils: {
      base,
      inherit,
      XHR,
      getUniqueDomId,
      uniqueId: getUniqueDomId,
      throttle,
      debounce,
      toRawType,
      /** used by the following plugins: "openrouteservice" */
      colorHEXToRGB: (color='#FFFFFF') => ([
        parseInt(color.substr(1,2), 16),
        parseInt(color.substr(3,2), 16),
        parseInt(color.substr(5,2), 16)
      ]),
      createFilterFormInputs,
      noop,
    },
    geoutils: {
      createVectorLayerFromFile: deprecate(createVectorLayerFromFile, '[G3W-CLIENT] g3wsdk.core.geoutils.createVectorLayerFromFile is deprecated'),
      createSelectedStyle,
      getAlphanumericPropertiesFromFeature,
      getQueryLayersPromisesByCoordinates: DataRouterService.getQueryLayersPromisesByCoordinates,
      getMapLayersByFilter,
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
    ApplicationService,
    ApplicationState,
    i18n,
    task: {
      TaskService
    },
    data: {
      DataRouterService
    },
    errors: {
      parsers: {
        Server: ResponseParser.get('g3w-error')
      }
    },
    project: {
      ProjectsRegistry: Object.assign(new G3WObject, {
        setters: { setCurrentProject(project) {} },
        getProjectUrl,
        getProjectConfigByGid,
        getListableProjects,
        getProject,
        getCurrentProject:     () => ApplicationState.project,
      })
    },
    map: {
      MapLayersStoreRegistry: MapLayersStoresRegistry
    },
    catalog: {
      CatalogLayersStoresRegistry: {
        getLayerById: getCatalogLayerById,
        getLayers:    getCatalogLayers,
      }
    },
    layer: {
      LayersStore:     babelify(LayersStore),
      Layer:           babelify(Layer),
      TableLayer:      babelify(TableLayer),
      VectorLayer:     babelify(VectorLayer),
      features: {
        Feature:       babelify(Feature),
        FeaturesStore: babelify(FeaturesStore),
      },
    },
    interaction: {
      PickCoordinatesInteraction,
      PickFeatureInteraction
    },
    plugin: {
      Plugin:          babelify(Plugin),
      PluginsRegistry: babelify(PluginsRegistry),
      PluginService:   babelify(PluginService)
    },
    input: {
      inputService: {
        handleFilterExpressionFormInput:  getFilterExpression,
        handleDefaultExpressionFormInput: getDefaultExpression,
      }
    }
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
        new Promise((resolve) => ApplicationService.complete ? resolve() : ApplicationService.on('complete', resolve))
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
g3wsdk.core.ApplicationService.changeProject        = ({ gid } = {}) => $promisify(async () => { const url = await GUI.getService('map').addMapExtentUrlParameterToUrl(getProjectUrl(gid), crs); try { history.replaceState(null, null, url); } catch (e) { console.warn(e); } location.replace(url); });
/** used by the following plugins: "openrouteservice" */
g3wsdk.core.ApplicationService.reloadCurrentProject = () => g3wsdk.core.ApplicationService.changeProject({ gid: ApplicationState.project.getGid() });
/** used by the following plugins: "editing" */
g3wsdk.core.ApplicationService.setCurrentLayout     = (who = 'app') => ApplicationState.gui.layout.__current = who;
/** used by the following plugins: "editing", "openrouteservice" */
g3wsdk.core.ApplicationService.getCurrentLayoutName = () => ApplicationState.gui.layout.__current;
/** used by the following plugins: "archiweb" */
g3wsdk.core.ApplicationService.isIframe             = () => ApplicationState.iframe;

/** used by the following plugins: "archiweb" */
g3wsdk.core.project.ProjectsRegistry.setProjectAliasUrl = alias => { const p = window.initConfig.projects.find(p => alias.gid === p.gid); if (p) { p.url = `${alias.host || ''}${alias.url}` } };

/**
 * Expose "g3wsdk" variable globally used by plugins to load sdk class and instances
 * 
 * @type {object}
 */
window.g3wsdk = g3wsdk;

/**
 * @TODO not yet implemented
 *
 * @see https://github.com/g3w-suite/g3w-client/issues/71
 * @see https://github.com/g3w-suite/g3w-client/issues/46
 */
// window.g3w = window.g3wsdk;