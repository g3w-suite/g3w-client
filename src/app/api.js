import G3W_CONSTANT from './constant';
// api file interface for external plugin
/**
 * Core modules
 */
import ApplicationService from 'core/applicationservice';
import ApplicationState from 'core/applicationstate';
import Router from 'core/router';
import i18n from 'core/i18n/i18n.service';
import TaskService from 'core/task/service';
import DataRouterService from 'core/data/routerservice';
import IFrameRouterService from 'core/iframe/routerservice';
import Server from 'core/errors/parser/servererrorparser';
import Session from 'core/editing/session';
import SessionsRegistry from 'core/editing/sessionsregistry';
import Editor from 'core/editing/editor';
import ChangesManager from 'core/editing/changesmanager';
import Geom from 'core/geometry/geom';
import Geometry from 'core/geometry/geometry';
import ProjectsRegistry from 'core/project/projectsregistry';
import Project from 'core/project/project';
import MapLayersStoreRegistry from 'core/map/maplayersstoresregistry';
import CatalogLayersStoresRegistry from 'core/catalog/cataloglayersstoresregistry'
import LayersStoreRegistry from 'core/layers/layersstoresregistry';
import LayersStore from 'core/layers/layersstore';
import Layer from 'core/layers/layer';
import LayerFactory from 'core/layers/layerfactory';
import TableLayer from 'core/layers/tablelayer';
import VectorLayer from 'core/layers/vectorlayer';
import ImageLayer from 'core/layers/imagelayer';
import WmsLayer from 'core/layers/map/wmslayer';
import XYZLayer from 'core/layers/map/xyzlayer';
import MapLayer from 'core/layers/map/maplayer';
import Feature from 'core/layers/features/feature';
import FeaturesStore from 'core/layers/features/featuresstore';
import OlFeaturesStore from 'core/layers/features/olfeaturesstore';
import Filter from 'core/layers/filter/filter';
import Expression from 'core/layers/filter/expression';
import RelationsService from 'core/relations/relationsservice';

import Plugin from 'core/plugin/plugin';
import PluginsRegistry from 'core/plugin/pluginsregistry';
import PluginService from 'core/plugin/pluginservice';
import Task from 'core/workflow/task';
import Step from 'core/workflow/step';
import Flow from 'core/workflow/flow';
import Workflow from 'core/workflow/workflow';
import WorkflowsStack from 'core/workflow/workflowsstack';
import ApiService from 'core/apiservice'
import G3WObject from "core/g3wobject";
import utils from 'core/utils/utils';
import geoutils from 'core/utils/geo'

/**
 * gui modules
 */
import GUI from 'gui/gui';
import Panel from 'gui/panel';
import ControlFactory from 'gui/map/control/factory';
import ComponentsFactory from 'gui/componentsfactory';
import FieldsService from 'gui/fields/fieldsservice';
import Component from 'gui/vue/component';
import MetadataComponent from 'gui/metadata/vue/metadata';
import SearchComponent from 'gui/search/vue/search';
import SearchPanel from 'gui/search/vue/panel/searchpanel';
import PrintComponent from 'gui/print/vue/print';
import CatalogComponent from 'gui/catalog/vue/catalog';
import MapComponent from 'gui/map/vue/map';
import ToolsComponent from 'gui/tools/vue/tools';
import QueryResultsComponent  from 'gui/queryresults/vue/queryresults';
// main Form Component
import FormComponent from 'gui/form/vue/form';
import FormBody from 'gui/form/components/body/vue/body';
import FormFooter from 'gui/form/components/footer/vue/footer';
import G3WInput from 'gui/inputs/g3w-input.vue';
import G3wFormInputs from 'gui/inputs/g3w-form-inputs.vue';
import InputsComponents from 'gui/inputs/inputs';
import ChartsFactory from 'gui/charts/chartsfactory';
import lineXY from 'gui/charts/vue/c3/line/lineXY';
import Fields  from 'gui/fields/fields';
import Mixins from 'gui/vue/vue.mixins';
import SearchPanelService from 'gui/search/vue/panel/searchservice';


/**
 * g3w openlayers custom modules
 * @type {{}}
 */

import PickCoordinatesInteraction from 'g3w-ol/src/interactions/pickcoordinatesinteraction';
import PickFeatureInteraction from 'g3w-ol/src/interactions/pickfeatureinteraction';
import DeleteFeatureInteraction from 'g3w-ol/src/interactions/deletefeatureinteraction'
import AreaInteraction from 'g3w-ol/src/interactions/areainteraction';
import LengthInteraction from 'g3w-ol/src/interactions/lengthinteraction';
import g3wolutils from 'g3w-ol/src/utils/utils';

const g3w = {};
//set G3W-CLIENT application constant
g3w.constant = G3W_CONSTANT;
//set core api method and objects
g3w.core = {
  G3WObject,
  utils,
  geoutils,
  ApplicationService,
  ApplicationState,
  ApiService,
  Router,
  i18n,
  task:{
    TaskService,
  },
  data: {
    DataRouterService,
  },
  iframe: {
    IFrameRouterService,
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
    Project,
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
      Geom
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
};

g3w.gui = {
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
      FormBody,
      FormFooter
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
};

g3w.ol = {
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
};

g3w.test = {};

export default {
  core: g3w.core,
  gui: g3w.gui,
  ol: g3w.ol,
  test: g3w.test,
  constant: g3w.constant
};
