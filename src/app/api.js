/**
 * @file api file interface for external plugins
 */

import G3W_CONSTANT                   from 'constant';

import GUI                            from 'services/gui';

import ApplicationState               from 'store/application-state';
import ApplicationService             from 'services/application';

/**
 * Single File Components
 */
import G3WInput                       from 'components/InputG3W.vue';
import G3wFormInputs                  from 'components/InputG3WFormInputs.vue';
import FormBody                       from 'components/FormBody.vue';
import FormFooter                     from 'components/FormFooter.vue';
import C3XYLine                       from 'components/C3XYLine.vue';
import G3WField                       from 'components/FieldG3W.vue';

/**
 * CORE modules
 */
import CatalogLayersStoresRegistry    from 'store/catalog-layers';
import DataRouterService              from 'services/data';
import IFrameRouterService            from 'services/iframe';
import MapLayersStoresRegistry        from 'store/map-layers';
import PluginsRegistry                from 'store/plugins';
import ProjectsRegistry               from 'store/projects';
import RelationsService               from 'services/relations';
import TaskService                    from 'services/tasks';
import WorkflowsStack                 from 'services/workflows';
import ApiService                     from 'services/api';
import RouterService                  from 'services/router';

import Mixins                         from 'mixins';

import { reverseGeometry }            from 'utils/reverseGeometry';
import { getExtentForViewAndSize }    from 'utils/getExtentForViewAndSize';
import { createPolygonLayerFromBBox } from 'utils/createPolygonLayerFromBBox';
import { getLengthMessageText }       from 'utils/getLengthMessageText';
import { needUseSphereMethods }       from 'utils/needUseSphereMethods';
import { transformMeterLength }       from 'utils/transformMeterLength';
import { createMeasureTooltip }       from 'utils/createMeasureTooltip';
import { formatMeasure }              from 'utils/formatMeasure';
import { getCurrentMapUnit }          from 'utils/getCurrentMapUnit';
import { getAreaMessageText }         from 'utils/getAreaMessageText';
import { transformMeterArea }         from 'utils/transformMeterArea';
import { removeMeasureTooltip }       from 'utils/removeMeasureTooltip';
import { setMeasureTooltipStatic }    from 'utils/setMeasureTooltipStatic';
import { getMetersFromDegrees }       from 'utils/getMetersFromDegrees';
import { getDPI }                     from 'utils/getDPI';
import { getResolutionFromScale }     from 'utils/getResolutionFromScale';
import { getScaleFromResolution }     from 'utils/getScaleFromResolution';
import { mergeOptions }               from 'utils/mergeOptions';

import G3WObject                      from 'core/g3wobject';
import LayersStoreRegistry            from 'core/layers/layersstoresregistry';

const utils                           = require('core/utils/utils');
const geoutils                        = require('core/utils/geo');
const i18n                            = require('core/i18n/i18n.service');
const Server                          = require('core/errors/parser/servererrorparser');
const Session                         = require('core/editing/session');
const Editor                          = require('core/editing/editor');
const Geom                            = require('core/utils/geo');
const { Geometry }                    = require('core/utils/geo');
const Project                         = require('core/project/project');
const LayersStore                     = require('core/layers/layersstore');
const Layer                           = require('core/layers/layer');
const LayerFactory                    = require('core/layers/layerfactory');
const TableLayer                      = require('core/layers/tablelayer');
const VectorLayer                     = require('core/layers/vectorlayer');
const ImageLayer                      = require('core/layers/imagelayer');
const WmsLayer                        = require('core/layers/map/wmslayer');
const XYZLayer                        = require('core/layers/map/xyzlayer');
const MapLayer                        = require('core/layers/map/maplayer');
const Feature                         = require('core/layers/features/feature');
const FeaturesStore                   = require('core/layers/features/featuresstore');
const OlFeaturesStore                 = require('core/layers/features/olfeaturesstore');
const Filter                          = require('core/layers/filter/filter');
const Expression                      = require('core/layers/filter/expression');
const Plugin                          = require('core/plugin/plugin');
const PluginService                   = require('core/plugin/pluginservice');
const Task                            = require('core/workflow/task');
const Step                            = require('core/workflow/step');
const Flow                            = require('core/workflow/flow');
const Workflow                        = require('core/workflow/workflow');

/**
 * GUI modules
 */
const Panel                           = require('gui/panel');
const { ControlFactory }              = require('gui/map/mapservice');
const ComponentsFactory               = require('gui/component/componentsfactory');
const FieldsService                   = Mixins.fieldsMixin.methods.getFieldService();
const Component                       = require('gui/component/component');
const MetadataComponent               = require('gui/metadata/vue/metadata');
const SearchComponent                 = require('gui/search/vue/search');
const SearchPanel                     = require('gui/search/vue/panel/searchpanel');
const PrintComponent                  = require('gui/print/vue/print');
const CatalogComponent                = require('gui/catalog/vue/catalog');
const MapComponent                    = require('gui/map/vue/map');
const ToolsComponent                  = require('gui/tools/vue/tools');
const QueryResultsComponent           = require('gui/queryresults/vue/queryresults');
const FormComponent                   = require('gui/form/vue/form');
const FormService                     = require('gui/form/formservice');
const ChartsFactory                   = require('gui/charts/chartsfactory');
const Fields                          = G3WField.components;
const InputsComponents                = G3WInput.components;
const SearchPanelService              = require('gui/search/vue/panel/searchservice');

/**
 * G3W-OL modules
 */
const PickFeatureInteraction          = require('g3w-ol/interactions/pickfeatureinteraction');
const PickCoordinatesInteraction      = require('g3w-ol/interactions/pickcoordinatesinteraction');
const DeleteFeatureInteraction        = require('g3w-ol/interactions/deletefeatureinteraction');
const AreaInteraction                 = require('g3w-ol/interactions/areainteraction');
const LengthInteraction               = require('g3w-ol/interactions/lengthinteraction');

/**
 * Test assertions
 */
console.assert(undefined !== InputsComponents, 'InputsComponents is undefined');
console.assert(undefined !== FieldsService,    'FieldsService is undefined');
console.assert(undefined !== Fields,           'Fields is undefined');

module.exports = {

  // APP CONSTANTS
  constant: G3W_CONSTANT, // TODO: rename to "constants" which is more appropriate (in version 4.0)

  // CORE API METHODS AND OBJECTS
  core: {
    G3WObject,
    utils,
    geoutils,
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
    geometry: {
      Geom,
      Geometry
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
      geometry: {
        Geometry,
        geom: Geom /** @FIXME capitalize first letter (ie. "Geom") */
      },
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
    workflow: {
      Task,
      Step,
      Flow,
      Workflow,
      WorkflowsStack
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
    ComponentsFactory,
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
      FormComponent,
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
        ChartsFactory,
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
