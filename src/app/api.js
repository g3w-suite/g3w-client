import G3W_CONSTANT from './constant';
// api file interface for external plugin
import ApplicationState from 'core/applicationstate';
import G3WInput from 'gui/inputs/g3w-input.vue';
import G3wFormInputs from 'gui/inputs/g3w-form-inputs.vue';

const g3w = g3w || {};
//set G3W-CLIENT application constant
g3w.constant = G3W_CONSTANT;
//set core api method and objects
g3w.core = {
  G3WObject: require('core/g3wobject'),
  utils: require('core/utils/utils'),
  geoutils: require('core/utils/geo'),
  ApplicationService: require('core/applicationservice'),
  ApplicationState,
  ApiService: require('core/apiservice'),
  Router: require('core/router'),
  i18n: require('core/i18n/i18n.service'),
  task:{
    TaskService: require('core/task/service')
  },
  data: {
    DataRouterService: require('core/data/routerservice')
  },
  iframe: {
    IFrameRouterService: require('core/iframe/routerservice')
  },
  errors: {
    parsers: {
      Server: require('core/errors/parser/servererrorparser')
    }
  },
  editing: {
    Session: require('core/editing/session'),
    SessionsRegistry: require('core/editing/sessionsregistry'),
    Editor: require('core/editing/editor'),
    ChangesManager: require('core/editing/changesmanager')
  },
  geometry: {
    Geom: require('core/geometry/geom'),
    Geometry: require('core/geometry/geometry')
  },
  project: {
    ProjectsRegistry: require('core/project/projectsregistry'),
    Project: require('core/project/project')
  },
  map: {
    MapLayersStoreRegistry: require('core/map/maplayersstoresregistry')
  },
  catalog: {
    CatalogLayersStoresRegistry: require('core/catalog/cataloglayersstoresregistry')
  },
  layer: {
    LayersStoreRegistry: require('core/layers/layersstoresregistry'), //nel caso un plugin volesse instanziare un layersstoreregistry proprio
    LayersStore: require('core/layers/layersstore'),
    Layer: require('core/layers/layer'),
    LayerFactory: require('core/layers/layerfactory'),
    TableLayer: require('core/layers/tablelayer'),
    VectorLayer: require('core/layers/vectorlayer'),
    ImageLayer: require('core/layers/imagelayer'),
    WmsLayer: require('core/layers/map/wmslayer'),
    XYZLayer: require('core/layers/map/xyzlayer'),
    MapLayer: require('core/layers/map/maplayer'),
    geometry: {
      Geometry: require('core/geometry/geometry'),
      geom: require('core/geometry/geom')
    },
    features: {
      Feature: require('core/layers/features/feature'),
      FeaturesStore: require('core/layers/features/featuresstore'),
      OlFeaturesStore: require('core/layers/features/olfeaturesstore')
    },
    filter: {
      Filter: require('core/layers/filter/filter'),
      Expression: require('core/layers/filter/expression')
    }
  },
  relations: {
    RelationsService: require('core/relations/relationsservice')
  },
  interaction: {
    PickCoordinatesInteraction: require('g3w-ol/interactions/pickcoordinatesinteraction'),
    PickFeatureInteraction: require('g3w-ol/interactions/pickfeatureinteraction')
  },
  plugin: {
    Plugin: require('core/plugin/plugin'),
    PluginsRegistry: require('core/plugin/pluginsregistry'),
    PluginService: require('core/plugin/pluginservice')
  },
  workflow: {
    Task: require('core/workflow/task'),
    Step: require('core/workflow/step'),
    Flow: require('core/workflow/flow'),
    Workflow: require('core/workflow/workflow'),
    WorkflowsStack: require('core/workflow/workflowsstack')
  }
};

g3w.gui = {
  GUI: require('gui/gui'),
  Panel: require('gui/panel'),
  ControlFactory: require('gui/map/control/factory'),
  ComponentsFactory: require('gui/component/componentsfactory'),
  FieldsService: require('gui/fields/fieldsservice'),
  vue: {
    Component: require('gui/component/component'),
    Panel: require('gui/panel'),
    MetadataComponent: require('gui/metadata/vue/metadata'),
    SearchComponent: require('gui/search/vue/search'),
    SearchPanel: require('gui/search/vue/panel/searchpanel'),
    PrintComponent: require('gui/print/vue/print'),
    CatalogComponent: require('gui/catalog/vue/catalog'),
    MapComponent: require('gui/map/vue/map'),
    ToolsComponent: require('gui/tools/vue/tools'),
    QueryResultsComponent : require('gui/queryresults/vue/queryresults'),
    // main Form Component
    FormComponent: require('gui/form/vue/form'),
    // Form Components
    FormComponents: {
      Body: require('gui/form/components/body/vue/body'),
      Footer: require('gui/form/components/footer/vue/footer')
    },
    Inputs: {
      G3wFormInputs,
      G3WInput,
      InputsComponents: require('gui/inputs/inputs')
    },
    Charts: {
      ChartsFactory: require('gui/charts/chartsfactory'),
      c3: {
        lineXY: require('gui/charts/vue/c3/line/lineXY')
      }
    },
    Fields : require('gui/fields/fields'),
    Mixins: require('gui/vue/vue.mixins'),
    services: {
      SearchPanel: require('gui/search/vue/panel/searchservice')
    }
  }
};

g3w.ol = {
  interactions : {
    PickFeatureInteraction : require('g3w-ol/interactions/pickfeatureinteraction'),
    PickCoordinatesInteraction: require('g3w-ol/interactions/pickcoordinatesinteraction'),
    DeleteFeatureInteraction: require('g3w-ol/interactions/deletefeatureinteraction'),
    measure: {
      AreaInteraction: require('g3w-ol/interactions/areainteraction'),
      LengthInteraction: require('g3w-ol/interactions/lengthinteraction')
    }
  },
  controls: {},
  utils: require('core/utils/ol')
};

g3w.test = {};

module.exports = {
  core: g3w.core,
  gui: g3w.gui,
  ol: g3w.ol,
  test: g3w.test,
  constant: g3w.constant
};
