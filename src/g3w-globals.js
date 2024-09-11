/**
 * @file Expose `window.g3wsdk` variable (API interface for external plugins)
 * @since 3.11.0
 */

import G3W_CONSTANT                                from 'g3w-constants';
import ApplicationState                            from 'store/application-state';
import ApplicationService                          from 'services/application';


/**
 * @file ORIGINAL SOURCE: src/app/core/utils/geo.js@3.8
 */
import { addZValueToOLFeatureGeometry }            from 'utils/addZValueToOLFeatureGeometry';
import { is3DGeometry }                            from 'utils/is3DGeometry';
import { removeZValueToOLFeatureGeometry }         from 'utils/removeZValueToOLFeatureGeometry';
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
import { getFeaturesFromResponseVectorApi }        from 'utils/getFeaturesFromResponseVectorApi';
import { splitFeatures }                           from 'utils/splitFeatures';
import { splitFeature }                            from 'utils/splitFeature';
import { isSameBaseGeometryType }                  from 'utils/isSameBaseGeometryType';
import { singleGeometriesToMultiGeometry }         from 'utils/singleGeometriesToMultiGeometry';
import { multiGeometryToSingleGeometries }         from 'utils/multiGeometryToSingleGeometries';
import { convertSingleMultiGeometry }              from 'utils/convertSingleMultiGeometry';
import { dissolve }                                from 'utils/dissolve';
import { within }                                  from 'utils/within';
import { intersects }                              from 'utils/intersects';
import { distance }                                from 'utils/distance';
import { getDefaultExpression }                    from 'utils/getDefaultExpression';
import { getFilterExpression }                     from "utils/getFilterExpression";

/**
 * Single File Components
 */
import G3WInput                                    from 'components/InputG3W.vue';
import G3wFormInputs                               from 'components/InputG3WFormInputs.vue';

/**
 * CORE modules
 */
import CatalogLayersStoresRegistry                 from 'store/catalog-layers';
import DataRouterService                           from 'services/data';
import PluginsRegistry                             from 'store/plugins';
import ProjectsRegistry                            from 'store/projects';
import TaskService                                 from 'services/tasks';
import ApiService                                  from 'services/api';
import GUI                                         from 'services/gui';
import { MeasureInteraction }                      from 'map/controls/measurecontrol';

//MIXINS
import Mixins                                      from 'mixins';

import { createMeasureTooltip }                    from 'utils/createMeasureTooltip';
import { removeMeasureTooltip }                    from 'utils/removeMeasureTooltip';
import { getResolutionFromScale }                  from 'utils/getResolutionFromScale';
import { getScaleFromResolution }                  from 'utils/getScaleFromResolution';
import { mergeOptions }                            from 'utils/mergeOptions';
import { ResponseParser }                          from 'utils/parsers';
import { $promisify }                              from 'utils/promisify';

import G3WObject                                   from 'g3w-object';
import Panel                                       from 'g3w-panel';
import Component                                   from 'g3w-component';
import PickFeatureInteraction                      from 'map/interactions/pickfeatureinteraction';
import PickCoordinatesInteraction                  from 'map/interactions/pickcoordinatesinteraction';

import { getUniqueDomId }                          from 'utils/getUniqueDomId';
import { mixin }                                   from 'utils/mixin';
import { merge }                                   from 'utils/merge';
import { hasOwn }                                  from 'utils/hasOwn';
import { inherit }                                 from 'utils/inherit';
import { base }                                    from 'utils/base';
import { noop }                                    from 'utils/noop';
import { resolve }                                 from 'utils/resolve';
import { reject }                                  from 'utils/reject';
import { Base64 }                                  from 'utils/Base64';
import { toRawType }                               from 'utils/toRawType';
import { throttle }                                from 'utils/throttle';
import { debounce }                                from 'utils/debounce';
import { XHR }                                     from 'utils/XHR';
import { createFilterFormInputs }                  from 'utils/createFilterFormInputs';
import { colorHEXToRGB }                           from 'utils/colorHEXToRGB';

const i18n                        = require('g3w-i18n');
const LayersStoreRegistry         = require('map/layers/layersstoresregistry');
const LayersStore                 = require('map/layers/layersstore');
const Layer                       = require('map/layers/layer');
const LayerFactory                = require('map/layers/layerfactory');
const TableLayer                  = require('map/layers/tablelayer');
const { VectorLayer }             = require('map/layers/vectorlayer');
const { ImageLayer }              = require('map/layers/imagelayer');
const Feature                     = require('map/layers/features/feature');
const FeaturesStore               = require('map/layers/features/featuresstore');
const OlFeaturesStore             = require('map/layers/features/olfeaturesstore');
const { Plugin }                  = require('./g3w-plugin');
const { PluginService }           = require('./g3w-plugin');

/**
 * GUI modules
 */
const { MapLayersStoresRegistry } = require('services/map').default;
const FieldsService               = require('gui/fields/fieldsservice');
const { SearchPanel }             = require('components/g3w-search');
const { FormComponent }           = require('components/g3w-form');
const { FormService }             = require('components/g3w-form');
const InputsComponents            = require('gui/inputs/inputs');
const Fields                      = require('gui/fields/fields');

const g3wsdk = {

  // APP CONSTANTS
  constant: G3W_CONSTANT, // TODO: rename to "constants" which is more appropriate (in version 4.0)

  // CORE API METHODS AND OBJECTS
  core: {
    G3WObject,
    utils: {
      getUniqueDomId,
      uniqueId: getUniqueDomId,
      mixin,
      merge,
      hasOwn,
      inherit,
      base,
      noop,
      truefnc() { return true },
      resolve,
      reject,
      Base64,
      toRawType,
      throttle,
      debounce,
        XHR,
      createFilterFormInputs,
      colorHEXToRGB,
    },
    geoutils: {
      geometryFields: G3W_CONSTANT.GEOMETRY_FIELDS,
      createVectorLayerFromFile,
      createSelectedStyle,
      getAlphanumericPropertiesFromFeature,
      getQueryLayersPromisesByCoordinates: DataRouterService.getQueryLayersPromisesByCoordinates,
      getMapLayersByFilter,
      areCoordinatesEqual,
      getFeaturesFromResponseVectorApi,
      splitFeatures,
      splitFeature,
      isSameBaseGeometryType,
      singleGeometriesToMultiGeometry,
      multiGeometryToSingleGeometries,
      convertSingleMultiGeometry,
      dissolve,
      within,
      intersects,
      distance,
      Geometry: {
        GeometryTypes: G3W_CONSTANT.GEOMETRY_TYPES,
        removeZValueToOLFeatureGeometry,
        addZValueToOLFeatureGeometry,
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
    ApiService,
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
      ProjectsRegistry,
    },
    map: {
      MapLayersStoreRegistry: MapLayersStoresRegistry
    },
    catalog: {
      CatalogLayersStoresRegistry
    },
    layer: {
      LayersStoreRegistry,
      LayersStore,
      Layer,
      LayerFactory,
      TableLayer,
      VectorLayer,
      ImageLayer,
      features: {
        Feature,
        FeaturesStore,
        OlFeaturesStore
      },
    },
    interaction: {
      PickCoordinatesInteraction,
      PickFeatureInteraction
    },
    plugin: {
      Plugin,
      PluginsRegistry,
      PluginService
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
        InputsComponents
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
      merge: mergeOptions,
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
${Object.entries(PluginsRegistry.pluginsConfigs).map((p) => (`    - ${p[0]}: __${p[1].version}__`)).join('\n')}
- browser: __${platform.name} ${platform.version}__
- operating system: __${platform.os.toString()}__
`.trim());

      });
  },

  // G3W-CLIENT version
  version: G3W_CONSTANT.APP_VERSION
};

// BACKOMP v3.x
g3wsdk.core.geometry                       = { Geom: g3wsdk.core.geoutils, Geometry: g3wsdk.core.geoutils.Geometry };
g3wsdk.core.layer.geometry                 = { geom: g3wsdk.core.geoutils, Geometry: g3wsdk.core.geoutils.Geometry };
g3wsdk.ol.interactions.measure                   = {};
g3wsdk.ol.interactions.measure.AreaInteraction   = class extends MeasureInteraction { constructor(opts = {}) { opts.geometryType = "Polygon"; super(opts); } },
g3wsdk.ol.interactions.measure.LengthInteraction = class extends MeasureInteraction { constructor(opts = {}) { opts.geometryType = "LineString"; super(opts); } },

/** used by the following plugins: "billboards" */
g3wsdk.core.ApplicationService.setLocalItem         = ({ id, data } = {}) => { try { window.localStorage.setItem(id, JSON.stringify(data)); } catch(e) { console.warn(e); return e; } };
/** used by the following plugins: "billboards" */
g3wsdk.core.ApplicationService.removeLocalItem      = id => window.localStorage.removeItem(id);
/** used by the following plugins: "billboards" */
g3wsdk.core.ApplicationService.getLocalItem         = id => window.localStorage.getItem(id) ? JSON.parse(window.localStorage.getItem(id)) : undefined;
/** used by the following plugins: "bforest" */
g3wsdk.core.ApplicationService.getApplicationUser   = () => ApplicationState.user;
/** used by the following plugins: "archiweb", "iframe" */
g3wsdk.core.ApplicationService.changeProject        = ({ gid } = {}) => $promisify(async () => { const url = GUI.getService('map').addMapExtentUrlParameterToUrl(ProjectsRegistry.getProjectUrl(gid), crs); try { history.replaceState(null, null, url); } catch (e) { console.warn(e); } location.replace(url); });
/** used by the following plugins: "openrouteservice" */
g3wsdk.core.ApplicationService.reloadCurrentProject = () => g3wsdk.core.ApplicationService.changeProject({ gid: ProjectsRegistry.getCurrentProject().getGid() });
/** used by the following plugins: "editing" */
g3wsdk.core.ApplicationService.setCurrentLayout     = (who = 'app') => ApplicationState.gui.layout.__current = who;
/** used by the following plugins: "editing", "openrouteservice" */
g3wsdk.core.ApplicationService.getCurrentLayoutName = () => ApplicationState.gui.layout.__current;
/** used by the following plugins: "archiweb" */
g3wsdk.core.ApplicationService.isIframe             = () => ApplicationState.iframe;

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