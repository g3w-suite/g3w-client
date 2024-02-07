/**
 * @file api file interface for external plugins
 */

import G3W_CONSTANT                                from 'app/constant';
import ApplicationState                            from 'store/application-state';
import ApplicationService                          from 'services/application';

/**
 * @file ORIGINAL SOURCE: src/app/core/utils/geo.js@3.8
 */
import { GEOMETRY_TYPES, GEOMETRY_FIELDS }         from 'app/constant';
import { addZValueToOLFeatureGeometry }            from 'utils/addZValueToOLFeatureGeometry';
import { is3DGeometry }                            from 'utils/is3DGeometry';
import { removeZValueToOLFeatureGeometry }         from 'utils/removeZValueToOLFeatureGeometry';
import { sanitizeFidFeature }                      from 'utils/sanitizeFidFeature';
import { getOLGeometry }                           from 'utils/getOLGeometry';
import { isMultiGeometry }                         from 'utils/isMultiGeometry';
import { getAllPointGeometryTypes }                from 'utils/getAllPointGeometryTypes';
import { isPointGeometryType }                     from 'utils/isPointGeometryType';
import { getAllLineGeometryTypes }                 from 'utils/getAllLineGeometryTypes';
import { isLineGeometryType }                      from 'utils/isLineGeometryType';
import { getAllPolygonGeometryTypes }              from 'utils/getAllPolygonGeometryTypes';
import { isPolygonGeometryType }                   from 'utils/isPolygonGeometryType';
import { coordinatesToGeometry }                   from 'utils/coordinatesToGeometry';
import { getDefaultLayerStyle }                    from 'utils/getDefaultLayerStyle';
import { createLayerStyle }                        from 'utils/createLayerStyle';
import { createFeatureFromCoordinates }            from 'utils/createFeatureFromCoordinates';
import { createFeatureFromBBOX }                   from 'utils/createFeatureFromBBOX';
import { createFeatureFromGeometry }               from 'utils/createFeatureFromGeometry';
import { createFeatureFromFeatureObject }          from 'utils/createFeatureFromFeatureObject';
import { createOlLayer }                           from 'utils/createOlLayer';
import { createWMSLayer }                          from 'utils/createWMSLayer';
import { createVectorLayerFromFeatures }           from 'utils/createVectorLayerFromFeatures';
import { createVectorLayerFromGeometry }           from 'utils/createVectorLayerFromGeometry';
import { createVectorLayerFromFile }               from 'utils/createVectorLayerFromFile';
import { createStyleFunctionToVectorLayer }        from 'utils/createStyleFunctionToVectorLayer';
import { createSelectedStyle }                     from 'utils/createSelectedStyle';
import { getAlphanumericPropertiesFromFeature }    from 'utils/getAlphanumericPropertiesFromFeature';
import { getFormDataExpressionRequestFromFeature } from 'utils/getFormDataExpressionRequestFromFeature';
import { convertFeatureToGEOJSON }                 from 'utils/convertFeatureToGEOJSON';
import { getQueryLayersPromisesByBBOX }            from 'utils/getQueryLayersPromisesByBBOX';
import { getQueryLayersPromisesByGeometry }        from 'utils/getQueryLayersPromisesByGeometry';
import { getQueryLayersPromisesByCoordinates }     from 'utils/getQueryLayersPromisesByCoordinates';
import { transformBBOX }                           from 'utils/transformBBOX';
import { parseQueryLayersPromiseResponses }        from 'utils/parseQueryLayersPromiseResponses';
import { getMapLayerById }                         from 'utils/getMapLayerById';
import { getMapLayersByFilter }                    from 'utils/getMapLayersByFilter';
import { areCoordinatesEqual }                     from 'utils/areCoordinatesEqual';
import { getFeaturesFromResponseVectorApi }        from 'utils/getFeaturesFromResponseVectorApi';
import { convertVectorFeaturesToResultFeatures }   from 'utils/convertVectorFeaturesToResultFeatures';
import { splitGeometryLine }                       from 'utils/splitGeometryLine';
import { splitFeatures }                           from 'utils/splitFeatures';
import { splitFeature }                            from 'utils/splitFeature';
import { getPointFeaturesfromGeometryVertex }      from 'utils/getPointFeaturesfromGeometryVertex';
import { getVertexLength }                         from 'utils/getVertexLength';
import { isSameBaseGeometryType }                  from 'utils/isSameBaseGeometryType';
import { isSingleGeometry }                        from 'utils/isSingleGeometry';
import { singleGeometriesToMultiGeometry }         from 'utils/singleGeometriesToMultiGeometry';
import { multiGeometryToSingleGeometries }         from 'utils/multiGeometryToSingleGeometries';
import { convertSingleMultiGeometry }              from 'utils/convertSingleMultiGeometry';
import { dissolve }                                from 'utils/dissolve';
import { within }                                  from 'utils/within';
import { intersects }                              from 'utils/intersects';
import { findSelfIntersects }                      from 'utils/findSelfIntersects';
import { normalizeEpsg }                           from 'utils/normalizeEpsg';
import { crsToCrsObject }                          from 'utils/crsToCrsObject';
import { convertDMToDEG }                          from 'utils/convertDMToDEG';
import { convertDEGToDM }                          from 'utils/convertDEGToDM';
import { convertDMSToDEG }                         from 'utils/convertDMSToDEG';
import { convertDEGToDMS }                         from 'utils/convertDEGToDMS';
import { getGeoTIFFfromServer }                    from 'utils/getGeoTIFFfromServer';
import { createOlFeatureFromApiResponseFeature }   from 'utils/createOlFeatureFromApiResponseFeature';
import { parseAttributes }                         from 'utils/parseAttributes';
import { handleQueryResponse }                     from 'utils/handleQueryResponse';
import { distance }                                from 'utils/distance';
import { squaredDistance }                         from 'utils/squaredDistance';
import { closestOnSegment }                        from 'utils/closestOnSegment';
import { get_legend_params }                       from 'utils/get_legend_params';

/**
 * Single File Components
 */
import G3WInput                                    from 'components/InputG3W.vue';
import G3wFormInputs                               from 'components/InputG3WFormInputs.vue';
import FormBody                                    from 'components/FormBody.vue';
import FormFooter                                  from 'components/FormFooter.vue';
import C3XYLine                                    from 'components/C3XYLine.vue';

/**
 * CORE modules
 */
import CatalogLayersStoresRegistry                 from 'store/catalog-layers';
import DataRouterService                           from 'services/data';
import IFrameRouterService                         from 'services/iframe';
import MapLayersStoresRegistry                     from 'store/map-layers';
import PluginsRegistry                             from 'store/plugins';
import ProjectsRegistry                            from 'store/projects';
import RelationsService                            from 'services/relations';
import TaskService                                 from 'services/tasks';
import ApiService                                  from 'services/api';
import RouterService                               from 'services/router';

import GUI                                         from 'services/gui';
//MIXINS
import Mixins                                      from 'mixins';

import { reverseGeometry }                         from 'utils/reverseGeometry';
import { getExtentForViewAndSize }                 from 'utils/getExtentForViewAndSize';
import { createPolygonLayerFromBBox }              from 'utils/createPolygonLayerFromBBox';
import { getLengthMessageText }                    from 'utils/getLengthMessageText';
import { needUseSphereMethods }                    from 'utils/needUseSphereMethods';
import { transformMeterLength }                    from 'utils/transformMeterLength';
import { createMeasureTooltip }                    from 'utils/createMeasureTooltip';
import { formatMeasure }                           from 'utils/formatMeasure';
import { getCurrentMapUnit }                       from 'utils/getCurrentMapUnit';
import { getAreaMessageText }                      from 'utils/getAreaMessageText';
import { transformMeterArea }                      from 'utils/transformMeterArea';
import { removeMeasureTooltip }                    from 'utils/removeMeasureTooltip';
import { setMeasureTooltipStatic }                 from 'utils/setMeasureTooltipStatic';
import { getMetersFromDegrees }                    from 'utils/getMetersFromDegrees';
import { getDPI }                                  from 'utils/getDPI';
import { getResolutionFromScale }                  from 'utils/getResolutionFromScale';
import { getScaleFromResolution }                  from 'utils/getScaleFromResolution';
import { mergeOptions }                            from 'utils/mergeOptions';

const G3WObject                  = require('core/g3wobject');
const utils                      = require('utils');
const i18n                       = require('core/i18n/i18n.service');
const Server                     = require('core/errors/parser/servererrorparser');
const Project                    = require('core/project/project');
const LayersStoreRegistry        = require('core/layers/layersstoresregistry');
const LayersStore                = require('core/layers/layersstore');
const Layer                      = require('core/layers/layer');
const LayerFactory               = require('core/layers/layerfactory');
const TableLayer                 = require('core/layers/tablelayer');
const VectorLayer                = require('core/layers/vectorlayer');
const ImageLayer                 = require('core/layers/imagelayer');
const WmsLayer                   = require('core/layers/map/wmslayer');
const XYZLayer                   = require('core/layers/map/xyzlayer');
const MapLayer                   = require('core/layers/map/maplayer');
const Feature                    = require('core/layers/features/feature');
const FeaturesStore              = require('core/layers/features/featuresstore');
const OlFeaturesStore            = require('core/layers/features/olfeaturesstore');
const Filter                     = require('core/layers/filter/filter');
const Expression                 = require('core/layers/filter/expression');
const Plugin                     = require('core/plugin/plugin');
const PluginService              = require('core/plugin/pluginservice');

/**
 * GUI modules
 */
const Panel                      = require('gui/panel');
const { ControlFactory }         = require('gui/map/mapservice');
const FieldsService              = require('gui/fields/fieldsservice');
const Component                  = require('gui/component/component');
const MetadataComponent          = require('gui/metadata/vue/metadata');
const SearchComponent            = require('gui/search/vue/search');
const SearchPanel                = require('gui/search/vue/panel/searchpanel');
const PrintComponent             = require('gui/print/vue/print');
const CatalogComponent           = require('gui/catalog/vue/catalog');
const MapComponent               = require('gui/map/vue/map');
const ToolsComponent             = require('gui/tools/vue/tools');
const QueryResultsComponent      = require('gui/queryresults/vue/queryresults');
const FormComponent              = require('gui/form/vue/form');
const FormService                = require('gui/form/formservice');
const InputsComponents           = require('gui/inputs/inputs');
const Fields                     = require('gui/fields/fields');
const SearchPanelService         = require('gui/search/vue/panel/searchservice');

/**
 * G3W-OL modules
 */
const PickFeatureInteraction     = require('g3w-ol/interactions/pickfeatureinteraction');
const PickCoordinatesInteraction = require('g3w-ol/interactions/pickcoordinatesinteraction');
const DeleteFeatureInteraction   = require('g3w-ol/interactions/deletefeatureinteraction');
const AreaInteraction            = require('g3w-ol/interactions/areainteraction');
const LengthInteraction          = require('g3w-ol/interactions/lengthinteraction');

const g3wsdk = {

  // APP CONSTANTS
  constant: G3W_CONSTANT, // TODO: rename to "constants" which is more appropriate (in version 4.0)

  // CORE API METHODS AND OBJECTS
  core: {
    G3WObject,
    utils,
    geoutils: {
      geometryFields: GEOMETRY_FIELDS,
      coordinatesToGeometry,
      getDefaultLayerStyle,
      createLayerStyle,
      createFeatureFromCoordinates,
      createFeatureFromBBOX,
      createFeatureFromGeometry,
      createFeatureFromFeatureObject,
      createOlLayer,
      createWMSLayer,
      createVectorLayerFromGeometry,
      createVectorLayerFromFeatures,
      createVectorLayerFromFile,
      createStyleFunctionToVectorLayer,
      createSelectedStyle,
      getAlphanumericPropertiesFromFeature,
      getFormDataExpressionRequestFromFeature,
      convertFeatureToGEOJSON,
      getQueryLayersPromisesByBBOX,
      getQueryLayersPromisesByGeometry,
      getQueryLayersPromisesByCoordinates,
      transformBBOX,
      parseQueryLayersPromiseResponses,
      getMapLayerById,
      getMapLayersByFilter,
      areCoordinatesEqual,
      getFeaturesFromResponseVectorApi,
      covertVectorFeaturesToResultFeatures: convertVectorFeaturesToResultFeatures,
      splitGeometryLine,
      splitFeatures,
      splitFeature,
      getPointFeaturesfromGeometryVertex,
      getVertexLength,
      isSameBaseGeometryType,
      isSingleGeometry,
      singleGeometriesToMultiGeometry,
      multiGeometryToSingleGeometries,
      convertSingleMultiGeometry,
      dissolve,
      within,
      intersects,
      findSelfIntersects,
      normalizeEpsg,
      crsToCrsObject,
      ConvertDMToDEG: convertDMToDEG,
      ConvertDEGToDM: convertDEGToDM,
      ConvertDMSToDEG: convertDMSToDEG,
      ConvertDEGToDMS: convertDEGToDMS,
      getGeoTIFFfromServer,
      createOlFeatureFromApiResponseFeature,
      sanitizeFidFeature,
      parseAttributes,
      handleQueryResponse,
      distance,
      squaredDistance,
      closestOnSegment,
      get_LEGEND_ON_LEGEND_OFF_Params: get_legend_params,
      Geometry: {
        GeometryTypes: GEOMETRY_TYPES,
        removeZValueToOLFeatureGeometry,
        addZValueToOLFeatureGeometry,
        getOLGeometry,
        isMultiGeometry,
        getAllPointGeometryTypes,
        isPointGeometryType,
        getAllLineGeometryTypes,
        isLineGeometryType,
        getAllPolygonGeometryTypes,
        isPolygonGeometryType,
        is3DGeometry,
      },
    },
    ApplicationService,
    ApplicationState,
    ApiService,
    Router: RouterService,
    i18n,
    task: {
      TaskService
    },
    data: {
      DataRouterService
    },
    iframe: {
      IFrameRouterService
    },
    errors: {
      parsers: {
        Server
      }
    },
    project: {
      ProjectsRegistry,
      Project
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
      WmsLayer,
      XYZLayer,
      MapLayer,
      features: {
        Feature,
        FeaturesStore,
        OlFeaturesStore
      },
      filter: {
        Filter,
        Expression
      }
    },
    relations: {
      RelationsService
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
        handleFilterExpressionFormInput: FormService._getFilterExpression,
        handleDefaultExpressionFormInput: FormService._getDefaultExpression,
      }
    }
  },

  // APPLICATION INTERFACE (vue)
  gui: {
    GUI,
    Panel,
    ControlFactory,
    ComponentsFactory: {
      build: ({ vueComponentObject, service, propsData }, options={}) => (new Component(options)).init({ vueComponentObject, service, propsData }),
    },
    FieldsService,
    vue: {
      Component,
      Panel,
      MetadataComponent,
      SearchComponent,
      SearchPanel,
      PrintComponent,
      CatalogComponent,
      MapComponent,
      ToolsComponent,
      QueryResultsComponent,
      // main Form Component
      FormComponent,
      // Form Components
      FormComponents: {
        Body: FormBody,
        Footer: FormFooter
      },
      Inputs: {
        G3wFormInputs,
        G3WInput,
        InputsComponents
      },
      Charts: {
        ChartsFactory: {
          /** @param  type: <library(es:c3)>:<chartType:(es.lineXY)> */
          build({ type, hooks = {} } = {}) {
            const [library='c3', chartType='lineXY'] = type.split(':');
            return Object.assign(hooks, this.CHARTS[library][chartType]);
          }
        },
        c3: {
          lineXY: C3XYLine
        }
      },
      Fields,
      Mixins,
      services: {
        SearchPanel: SearchPanelService,
        FormService
      }
    }
  },

  // OPEN LAYERS COMPONENTS (g3w-ol)
  ol: {
    interactions : {
      PickFeatureInteraction,
      PickCoordinatesInteraction,
      DeleteFeatureInteraction,
      measure: {
        AreaInteraction,
        LengthInteraction
      }
    },
    controls: {},
    utils: {
      merge: mergeOptions,
      getExtentForViewAndSize,
      createPolygonLayerFromBBox,
      reverseGeometry,
      getScaleFromResolution,
      getResolutionFromScale,
      getDPI,
      getMetersFromDegrees,
      needUseSphereMethods,
      getLengthMessageText,
      getAreaMessageText,
      formatMeasure,
      createMeasureTooltip,
      getCurrentMapUnit,
      transformMeterLength,
      transformMeterArea,
      removeMeasureTooltip,
      setMeasureTooltipStatic,
    },
  },

  // G3W-SUITE debug info
  info: () => {
    $script(
      'https://unpkg.com/platform@1.3.6/platform.js',
      () => {
        window.console.info(`
[g3wsdk.info]\n
- g3w-admin: __${initConfig.version}__
- g3w-client: __${G3W_CONSTANT.APP_VERSION}__
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
g3wsdk.gui.vue.Charts.ChartsFactory.CHARTS = { c3: { lineXY: C3XYLine } };
g3wsdk.gui.ComponentsFactory.buildSidebar  = ({ vueComponentObject }, options={}) => {
  const çç = (a, b) => undefined !== a ? a : b; // like a ?? (coalesce operator)
  const component = g3wsdk.gui.ComponentsFactory.build({ vueComponentObject }, {
    id:          options.id,
    title:       options.title,
    open:        çç(options.open, false),
    collapsible: çç(options.collapsible, true),
    isolate:     çç(options.isolate, false),
    iconColor:   çç(options.iconConfig, {}).color,
    icon:        çç(options.iconConfig, {}).icon && GUI.getFontClass(options.iconConfig.icon),
    mobile:      çç(options.mobile, true),
    events:      çç(options.events, {})
  });
  GUI.addComponent(component, 'sidebar', çç(options.sidebarOptions, { position: 1 }));
  return component;
};

module.exports = g3wsdk;