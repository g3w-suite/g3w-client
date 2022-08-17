// api file interface for external plugins
import G3W_CONSTANT from './constant';

import ApplicationState from 'core/applicationstate';
import G3WInput from 'gui/inputs/g3w-input.vue';
import G3wFormInputs from 'gui/inputs/g3w-form-inputs.vue';

/**
 * CORE modules
 */
const G3WObject = require('core/g3wobject');
const utils = require('core/utils/utils');
const geoutils = require('core/utils/geo');
const ApplicationService = require('core/applicationservice');
const ApiService = require('core/apiservice');
const Router = require('core/router');
const i18n = require('core/i18n/i18n.service');
const TaskService = require('core/task/service');
const DataRouterService = require('core/data/routerservice');
const IFrameRouterService = require('core/iframe/routerservice');
const Server = require('core/errors/parser/servererrorparser');
const Session = require('core/editing/session');
const SessionsRegistry = require('core/editing/sessionsregistry');
const Editor = require('core/editing/editor');
const ChangesManager = require('core/editing/changesmanager');
const Geom = require('core/utils/geo');
const { Geometry } = require('core/utils/geo');
const ProjectsRegistry = require('core/project/projectsregistry');
const Project = require('core/project/project');
const MapLayersStoreRegistry = require('core/map/maplayersstoresregistry');
const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');
const LayersStoreRegistry = require('core/layers/layersstoresregistry');
const LayersStore = require('core/layers/layersstore');
const Layer = require('core/layers/layer');
const LayerFactory = require('core/layers/layerfactory');
const TableLayer = require('core/layers/tablelayer');
const VectorLayer = require('core/layers/vectorlayer');
const ImageLayer = require('core/layers/imagelayer');
const WmsLayer = require('core/layers/map/wmslayer');
const XYZLayer = require('core/layers/map/xyzlayer');
const MapLayer = require('core/layers/map/maplayer');
const Feature = require('core/layers/features/feature');
const FeaturesStore = require('core/layers/features/featuresstore');
const OlFeaturesStore = require('core/layers/features/olfeaturesstore');
const Filter = require('core/layers/filter/filter');
const Expression = require('core/layers/filter/expression');
const RelationsService = require('core/relations/relationsservice');
const Plugin = require('core/plugin/plugin');
const PluginsRegistry = require('core/plugin/pluginsregistry');
const PluginService = require('core/plugin/pluginservice');
const Task = require('core/workflow/task');
const Step = require('core/workflow/step');
const Flow = require('core/workflow/flow');
const Workflow = require('core/workflow/workflow');
const WorkflowsStack = require('core/workflow/workflowsstack');

/**
 * GUI modules
 */
const GUI = require('gui/gui');
const Panel = require('gui/panel');
const ControlFactory = require('gui/map/control/factory');
const ComponentsFactory = require('gui/component/componentsfactory');
const FieldsService = require('gui/fields/fieldsservice');
const Component = require('gui/component/component');
const MetadataComponent = require('gui/metadata/vue/metadata');
const SearchComponent = require('gui/search/vue/search');
const SearchPanel = require('gui/search/vue/panel/searchpanel');
const PrintComponent = require('gui/print/vue/print');
const CatalogComponent = require('gui/catalog/vue/catalog');
const MapComponent = require('gui/map/vue/map');
const ToolsComponent = require('gui/tools/vue/tools');
const QueryResultsComponent = require('gui/queryresults/vue/queryresults');
const FormComponent = require('gui/form/vue/form');
const Body = require('gui/form/components/body/vue/body');
const Footer = require('gui/form/components/footer/vue/footer');
const InputsComponents = require('gui/inputs/inputs');
const ChartsFactory = require('gui/charts/chartsfactory');
const lineXY = require('gui/charts/vue/c3/line/lineXY');
const Fields = require('gui/fields/fields');
const Mixins = require('gui/vue/vue.mixins');
const SearchPanelService = require('gui/search/vue/panel/searchservice');

/**
 * G3W-OL modules
 */
const PickFeatureInteraction = require('g3w-ol/interactions/pickfeatureinteraction');
const PickCoordinatesInteraction = require('g3w-ol/interactions/pickcoordinatesinteraction');
const DeleteFeatureInteraction = require('g3w-ol/interactions/deletefeatureinteraction');
const AreaInteraction = require('g3w-ol/interactions/areainteraction');
const LengthInteraction = require('g3w-ol/interactions/lengthinteraction');
const g3wolutils = require('core/utils/ol');

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
    Router,
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
    editing: {
      Session,
      SessionsRegistry,
      Editor,
      ChangesManager
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
      MapLayersStoreRegistry
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
        geom: Geom // FIXME: capitalize first letter (ie. "Geom")
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
      // main Form Component
      FormComponent,
      // Form Components
      FormComponents: {
        Body,
        Footer
      },
      Inputs: {
        G3wFormInputs,
        G3WInput,
        InputsComponents
      },
      Charts: {
        ChartsFactory,
        c3: {
          lineXY
        }
      },
      Fields,
      Mixins,
      services: {
        SearchPanel: SearchPanelService
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
    utils: g3wolutils
  },

  // DEPRECATED: will be removed after version 3.4
  test: {},

  // G3W-CLIENT version
  version: G3W_CONSTANT.APP_VERSION
};
