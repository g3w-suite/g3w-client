// api file interface for external plugins

/**
 * CORE modules
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
import CatalogLayersStoresRegistry from 'core/catalog/cataloglayersstoresregistry';
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
import ApiService from 'core/apiservice';
import G3WObject from 'core/g3wobject';
import utils from 'core/utils/utils';
import geoutils from 'core/utils/geo';

/**
 * GUI modules
 */
import GUI from 'gui/gui';
import Panel from 'gui/panel';
import ControlFactory from 'gui/map/control/factory';
import ComponentsFactory from 'gui/component/componentsfactory';
import FieldsService from 'gui/fields/fieldsservice';
import Component from 'gui/component/component';
import MetadataComponent from 'gui/metadata/vue/metadata';
import SearchComponent from 'gui/search/vue/search';
import SearchPanel from 'gui/search/vue/panel/searchpanel';
import PrintComponent from 'gui/print/vue/print';
import CatalogComponent from 'gui/catalog/vue/catalog';
import MapComponent from 'gui/map/vue/map';
import ToolsComponent from 'gui/tools/vue/tools';
import QueryResultsComponent from 'gui/queryresults/vue/queryresults';
import FormComponent from 'gui/form/vue/form.vue';
import FormBody from 'gui/form/components/body.vue';
import FormFooter from 'gui/form/components/footer.vue';
import G3WInput from 'gui/inputs/g3w-input.vue';
import G3wFormInputs from 'gui/inputs/g3w-form-inputs.vue';
import InputsComponents from 'gui/inputs/inputs';
import ChartsFactory from 'gui/charts/chartsfactory';
import lineXY from 'gui/charts/vue/c3/line/lineXY.vue';
import Fields from 'gui/fields/fields';
import Mixins from 'gui/vue/vue.mixins';
import SearchPanelService from 'gui/search/vue/panel/searchservice';

/**
 * G3W-OL modules
 */
import PickCoordinatesInteraction from 'g3w-ol/interactions/pickcoordinatesinteraction';
import PickFeatureInteraction from 'g3w-ol/interactions/pickfeatureinteraction';
import DeleteFeatureInteraction from 'g3w-ol/interactions/deletefeatureinteraction';
import AreaInteraction from 'g3w-ol/interactions/areainteraction';
import LengthInteraction from 'g3w-ol/interactions/lengthinteraction';
import g3wolutils from 'g3w-ol/utils/utils';
import G3W_CONSTANT from './constant';

export default {
  // APP CONSTANTS
  constant: G3W_CONSTANT,
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
        Server,
      },
    },
    editing: {
      Session,
      SessionsRegistry,
      Editor,
      ChangesManager,
    },
    geometry: {
      Geom,
      Geometry,
    },
    project: {
      ProjectsRegistry,
      Project,
    },
    map: {
      MapLayersStoreRegistry,
    },
    catalog: {
      CatalogLayersStoresRegistry,
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
        Geom,
      },
      features: {
        Feature,
        FeaturesStore,
        OlFeaturesStore,
      },
      filter: {
        Filter,
        Expression,
      },
    },
    relations: {
      RelationsService,
    },
    interaction: {
      PickCoordinatesInteraction,
      PickFeatureInteraction,
    },
    plugin: {
      Plugin,
      PluginsRegistry,
      PluginService,
    },
    workflow: {
      Task,
      Step,
      Flow,
      Workflow,
      WorkflowsStack,
    },
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
        FormBody,
        FormFooter,
      },
      Inputs: {
        G3wFormInputs,
        G3WInput,
        InputsComponents,
      },
      Charts: {
        ChartsFactory,
        c3: {
          lineXY,
        },
      },
      Fields,
      Mixins,
      services: {
        SearchPanel: SearchPanelService,
      },
    },
  },
  // OPEN LAYERS COMPONENTS (g3w-ol)
  ol: {
    interactions: {
      PickFeatureInteraction,
      PickCoordinatesInteraction,
      DeleteFeatureInteraction,
      measure: {
        AreaInteraction,
        LengthInteraction,
      },
    },
    controls: {},
    utils: g3wolutils,
  },
  // TEST
  // test: {},
};
